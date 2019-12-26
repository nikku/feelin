import { expect } from 'chai';

import stripIndent from 'strip-indent';

import { sync as glob } from 'fast-glob';

import {
  readFileSync as readFile,
  writeFileSync as writeFile
} from 'fs';

import { parser as Parser } from '../src/parser';


const snippetsCwd = __dirname + '/snippets';


describe.only('parse', function() {

  testAll({
    write: true
  });

});


// helpers //////////////


function test(test, options={}) {

  const {
    it,
    cwd
  } = options;


  it(test, function() {

    const specPath = (cwd || snippetsCwd) + '/' + test;

    const spec = readFile(specPath, 'utf8');

    const [ input, expectedTree ] = spec.split('----------').map(str => str.trim());

    const tree = Parser.parse(input);

    const serializedTree = treeToString(tree, input);

    if (options.write || !expectedTree) {
      writeFile(specPath, `${input}\n\n----------\n${serializedTree}`, 'utf8');
    } else {
      expectTree(serializedTree, expectedTree);
    }

    if (!test.includes('_error')) {
      expect(serializedTree).not.to.include('⚠');
    }
  });

}

function testOnly(file, options={}) {

  test(file, {
    ...options,
    it: it.only
  });

}

function testAll(options={}) {

  const {
    cwd
  } = options;

  const tests = glob('*', { cwd: cwd || snippetsCwd });

  tests.forEach(file => {

    test(file, {
      ...options,
      cwd,
      it
    });

  });

}

function treeToString(tree, input) {

  let str = '';

  let indent = 0;

  tree.iterate({
    enter(type, start, end) {
      str += `\n${"  ".repeat(indent)}${type.name} "${input.slice(start, end)}"`;
      indent++;
    },
    leave() {
      indent--;
    }
  });

  return str;
}

function expectTree(currentTree, expectedTree) {
  expect(currentTree.trim()).to.eql(stripIndent(expectedTree).trim())
}