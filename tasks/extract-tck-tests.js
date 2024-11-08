/* eslint @typescript-eslint/no-var-requires: off */

import path from 'path';
import fs from 'fs';

import glob from 'fast-glob';

import {
  Parser as SAXParser
} from 'saxen';

const arg = process.argv[2];

if (arg === '--help' || arg === '-h' || arg) {
  console.error('Usage: extract-tck-tests');

  process.exit(arg ? 1 : 0);
}

const tckLocation = process.env.TCK_DIR || '../dmn-tck';

if (!fs.existsSync(tckLocation)) {
  throw new Error(`expected DMN TCK in <${ tckLocation }>. Customize the search path via env.TCK_DIR`);
}

const tests = glob.sync('TestCases/*/*-feel-*/*.xml', { cwd: tckLocation });

const FILTER = process.env.FILTER || null;

for (const testGlob of tests) {

  const testPath = path.join(tckLocation, testGlob);

  if (FILTER && !testPath.includes(FILTER)) {
    continue;
  }

  const test = parseTestFile(testPath);

  const testDir = path.dirname(testPath);

  const modelPath = path.join(testDir, test.modelName);

  const expressions = parseModelFile(modelPath);

  const result = merge(test, expressions);

  const resultDir = path.join('tmp/dmn-tck', testDir.substring(testDir.lastIndexOf('/')));

  fs.mkdirSync(resultDir, { recursive: true });

  fs.writeFileSync(path.join(resultDir, test.testName + '.json'), JSON.stringify(result, 0, 2), 'utf8');

}

function createParser(handlers) {

  var parser = new SAXParser({ proxy: true });

  // enable namespace parsing: element prefixes will
  // automatically adjusted to the ones configured here
  // elements in other namespaces will still be processed
  parser.ns({
    'http://www.omg.org/spec/DMN/20160719/testcase': 'test',
    'https://www.omg.org/spec/DMN/20230324/MODEL/': 'dmn',
    'http://www.omg.org/spec/DMN/20180521/DI/': 'di',
    'https://www.omg.org/spec/DMN/20230324/DMNDI/': 'dmndi',
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

  const expressions = [];

  const stack = [];

  Object.defineProperty(stack, 'current', {
    get: () => {
      return stack[stack.length - 1];
    }
  });

  let text = false;
  let description = false;

  let err = false;

  const parser = createParser({

    openTag(el) {
      if (el.name === 'dmn:decision') {
        stack.push({
          expression: true,
          name: el.attrs.name,
          text: '',
          description: ''
        });
      }

      if (el.name === 'dmn:contextEntry') {
        stack.push({
          contextEntry: true,
          name: '',
          text: ''
        });
      }

      if (el.name === 'dmn:variable' && stack.current?.contextEntry) {
        stack.current.name = el.attrs.name;
      }

      if (el.name === 'dmn:context') {
        stack.current.text += '{ ';
      }

      if (el.name === 'dmn:text') {
        text = stack.current?.expression || stack.current?.contextEntry;
      }

      if (el.name === 'dmn:description') {
        description = stack.current?.expression;
      }
    },

    text(value, decodeEntities) {
      if (text) {
        stack.current.text += decodeEntities(value);
      }

      if (description) {
        stack.current.description += decodeEntities(value);
      }
    },

    error(error, getContext) {
      console.log('ERROR!', error, getContext());

      err = true;
    },

    closeTag(el) {
      if (el.name === 'dmn:text') {
        text = false;
      }

      if (el.name === 'dmn:description') {
        description = false;
      }

      if (el.name === 'dmn:context') {
        stack.current.text += ' }';
      }

      if (el.name === 'dmn:contextEntry') {
        const contextEntry = stack.pop();

        if (!stack.current.text.endsWith('{ ')) {
          stack.current.text += ', ';
        }

        stack.current.text += `${ contextEntry.name || '""'}: ${ contextEntry.text }`;
      }

      if (el.name === 'dmn:decision') {
        expressions.push(stack.pop());
      }
    }
  });

  parser.parse(contents);

  if (err) {
    throw new Error('failed to parse %s', file);
  }

  return expressions;
}

function merge(test, expressions) {

  for (const testCase of test.cases) {

    const contextParts = testCase.inputNodes.reduce((context, { name, value }, idx) => {

      if (idx > 0) {
        context.push(', ');
      }

      context.push(name, ': ', value);

      return context;
    }, []).join('');

    const context = contextParts && `{ ${contextParts} }` || null;

    testCase.runs = testCase.resultNodes.map(resultNode => ({
      context,
      expression: expressions.find(expr => expr.name === resultNode.name),
      expectedValue: resultNode.value,
      decision: resultNode.name
    }));

  }

  return test;
}

function parseTestFile(file) {

  const contents = fs.readFileSync(file, 'utf8');

  const testName = path.basename(file);

  const test = {
    testName,
    modelName: null,
    cases: []
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

  function addTypeDelimiters(type, openDelimiter, closeDelimiter, printType = true) {

    openElement(type, closeDelimiter);

    if (printType) {
      addToken(type);
    }

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
          id: el.attrs.id,
          inputNodes: [],
          resultNodes: []
        };

        test.cases.push(testCase);

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

        node = {
          name: el.attrs.name,
          type: el.attrs.type
        };

        testCase.resultNodes.push(node);

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