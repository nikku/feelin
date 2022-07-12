/* eslint @typescript-eslint/no-var-requires: OFF */

const path = require('path');
const fs = require('fs');

const mkdirp = require('mkdirp').sync;

const glob = require('fast-glob').sync;

const {
  Parser: SAXParser
} = require('saxen');

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.error('Usage: extract-tck-tests <TCK_DIR>');

  process.exit(!arg ? 1 : 0);
}

const tckLocation = path.resolve(arg);


const tests = glob('TestCases/*/*-feel-*/*.xml', { cwd: tckLocation });


for (const testGlob of tests) {

  const testPath = path.join(tckLocation, testGlob);

  const test = parseTestFile(testPath);

  const testDir = path.dirname(testPath);

  const modelPath = path.join(testDir, test.modelName);

  const expressions = parseModelFile(modelPath);

  const result = merge(test, expressions);

  const resultDir = path.join('tmp/dmn-tck', testDir.substring(testDir.lastIndexOf('/')));

  mkdirp(resultDir);

  fs.writeFileSync(path.join(resultDir, test.testName + '.json'), JSON.stringify(result, 0, 2), 'utf8');

}

function createParser(handlers) {

  var parser = new SAXParser({ proxy: true });

  // enable namespace parsing: element prefixes will
  // automatically adjusted to the ones configured here
  // elements in other namespaces will still be processed
  parser.ns({
    'http://www.omg.org/spec/DMN/20160719/testcase': 'test',
    'http://www.omg.org/spec/DMN/20180521/MODEL/': 'dmn',
    'http://www.omg.org/spec/DMN/20180521/DI/': 'di',
    'http://www.omg.org/spec/DMN/20180521/DMNDI/': 'dmndi',
    'http://www.omg.org/spec/DMN/20180521/DC/': 'dc',
    'http://www.w3.org/2001/XMLSchema': 'xs',
    'http://www.w3.org/2001/XMLSchema-instance': 'xsi'
  });

  for (const handler in handlers) {
    parser.on(handler, handlers[handler]);
  }

  return parser;
}

function parseModelFile(file) {

  const contents = fs.readFileSync(file, 'utf8');

  const expressions = { };

  let expression;

  let text = false;

  const parser = createParser({

    openTag(el) {
      if (el.name === 'dmn:decision') {
        expression = expressions[el.attrs.name] = {
          name: el.attrs.name,
          text: ''
        };
      }

      if (el.name === 'dmn:text') {
        text = true;
      }
    },

    text(value, decodeEntities) {
      if (text) {
        expression.text += decodeEntities(value);
      }
    },

    closeTag(el) {
      if (el.name === 'dmn:text') {
        text = false;
      }
    }
  });

  parser.parse(contents);

  return expressions;
}

function merge(test, expressions) {

  for (const [_, expr ] of Object.entries(expressions)) {
    const tc = test.cases[expr.name];

    if (!tc) {
      console.warn(`No test for ${expr.name}`);
    } else {
      tc.expression = expr.text;
    }
  }

  return test;
}

function parseTestFile(file) {

  const contents = fs.readFileSync(file, 'utf8');

  const testName = path.basename(file);

  const test = {
    testName,
    modelName: null,
    cases: {}
  };

  let testCase;

  let modelName;

  let record;

  let node;

  let context;

  let stackDepth;

  function isType(type) {

    if (!context) {
      return false;
    }

    const ctx = context[context.length - 1];

    return ctx && ctx.type === type;
  }

  function addChild(child) {
    const ctx = context[context.length - 1];

    if (!ctx) {
      throw new Error('no context');
    }

    ctx.children = [].concat(ctx.children || [], child);
  }

  function getChildren() {
    const ctx = context[context.length - 1];

    if (!ctx) {
      throw new Error('no context');
    }

    return (ctx.children || []);
  }

  function addToken(token) {
    record.push(token);
  }

  function addDelimiters(type, openDelimiter, closeDelimiter) {
    return addTypeDelimiters(type, openDelimiter, closeDelimiter, false);
  }

  function openElement(type, closeDelimiter) {
    context.push({ type, closeDelimiter, stackDepth });
  }

  function addTypeDelimiters(type, openDelimiter, closeDelimiter, printType=true) {

    openElement(type, closeDelimiter);

    printType && addToken(type);

    addToken(openDelimiter);
  }

  function closeElement(stackDepth) {
    for (;;) {

      const ctx = context[context.length - 1];

      if (!ctx || ctx.stackDepth <= stackDepth) {
        break;
      }

      context.pop();

      if (ctx.closeDelimiter) {
        addToken(ctx.closeDelimiter);
      }
    }
  }

  const parser = createParser({
    openTag(el, _decodeEntities, _selfClosing, _getContext) {

      if (el.name === 'test:modelName') {
        modelName = true;

        return;
      }

      if (el.name === 'test:testCase') {
        testCase = {
          name: el.attrs.id,
          inputNodes: []
        };

        return;
      }

      if (el.name === 'test:inputNode') {
        node = {
          name: el.attrs.name
        };

        testCase.inputNodes.push(node);
      }

      if (el.name === 'test:expected' || el.name == 'test:inputNode') {
        record = [];
        context = [];
        stackDepth = 0;

        return;
      }

      if (el.name === 'test:resultNode') {

        test.cases[el.attrs.name] = testCase;

        node = testCase.resultNode = {
          name: el.attrs.name,
          type: el.attrs.type
        };

        return;
      }

      if (record) {

        if (el.name === 'test:component') {
          if (!isType('context')) {
            addDelimiters('context', '{', '}');
          } else {
            addToken(', ');
          }
        }

        stackDepth++;

        if (el.name === 'test:item') {

          if (getChildren().length > 0) {
            addToken(',');
          }

          return addChild({});
        }

        if (el.attrs['xsi:nil'] === 'true') {
          return addToken('null');
        }

        if (el.name === 'test:list') {
          return addDelimiters('list', '[', ']');
        }

        if (el.name === 'test:value') {

          if (el.attrs['xsi:type'].endsWith(':string')) {
            return addDelimiters('string', '"', '"');
          }

          if (el.attrs['xsi:type'].endsWith(':decimal')) {
            return openElement('decimal');
          }

          if (el.attrs['xsi:type'].endsWith(':dateTime')) {
            return addTypeDelimiters('date and time', '("', '")');
          }

          if (el.attrs['xsi:type'].endsWith(':date')) {
            return addTypeDelimiters('date', '("', '")');
          }

          if (el.attrs['xsi:type'].endsWith(':boolean')) {
            return openElement('boolean');
          }

          if (el.attrs['xsi:type'].endsWith(':duration')) {
            return addTypeDelimiters('duration', '("', '")');
          }

          if (el.attrs['xsi:type'].endsWith(':time')) {
            return addTypeDelimiters('time', '("', '")');
          }

        }

        if (el.name === 'test:component') {

          openElement('entry');

          return addToken(`"${el.attrs.name}":`);
        }

      }

    },

    text(value, decodeEntities) {

      if (!isType('string') && !value.trim()) {
        return;
      }

      if (modelName) {
        test.modelName = decodeEntities(value);
      }

      if (record) {
        const token = decodeEntities(value);

        addToken(isType('string') ? token.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : token);
      }
    },

    closeTag(el, _, _selfClosing) {

      if (el.name === 'test:modelName') {
        modelName = false;

        return;
      }

      if (record) {
        stackDepth--;

        closeElement(stackDepth);
      }

      if (el.name === 'test:expected' || el.name == 'test:inputNode') {
        closeElement(stackDepth);

        node.value = record.join('').trim();
        record = null;
        context = null;
        stackDepth = -1;

        return;
      }

    }
  });

  parser.parse(contents);

  return test;
}