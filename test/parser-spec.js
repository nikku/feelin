import { expect } from 'chai';

import stripIndent from 'strip-indent';

import { sync as glob } from 'fast-glob';

import {
  readFileSync as readFile,
  writeFileSync as writeFile
} from 'fs';

import { parser as expressionsParser } from '../src/parser';

import { parser as unaryParser } from '../src/unary-parser';


describe('parse', function() {

  testAll({
    cwd: __dirname + '/snippets/expressions',
    parser: expressionsParser,
    write: !!process.env.REBUILD
  });

  testAll({
    cwd: __dirname + '/snippets/unary-tests',
    parser: unaryParser,
    write: !!process.env.REBUILD
  });

});


// helpers //////////////


function test(test, options={}) {

  const {
    it,
    cwd,
    parser
  } = options;


  it(test, function() {

    const specPath = cwd + '/' + test;

    const spec = readFile(specPath, 'utf8');

    const [ input, expectedTree ] = spec.split('----------').map(str => str.trim());

    const tree = parser.parse(input);

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

// eslint-disable-next-line no-unused-vars
function testOnly(file, options={}) {

  test(file, {
    ...options,
    it: it.only
  });

}

function testAll(options={}) {

  const {
    cwd,
    parser
  } = options;

  const tests = glob('*', { cwd });

  tests.forEach(file => {

    test(file, {
      ...options,
      cwd,
      parser,
      it
    });

  });

}

function treeToString(tree, input) {

  let str = '';

  let indent = 0;

  tree.iterate({
    enter(type, start, end) {
      str += `\n${'  '.repeat(indent)}${type.name} "${input.slice(start, end)}"`;
      indent++;
    },
    leave() {
      indent--;
    }
  });

  return str;
}

function expectTree(currentTree, expectedTree) {
  expect(currentTree.trim()).to.eql(stripIndent(expectedTree).trim());
}