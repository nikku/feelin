import { expect } from 'chai';

import { sync as glob } from 'fast-glob';

import {
  readFileSync as readFile,
  writeFileSync as writeFile
} from 'fs';

import { evaluator as Evaluator } from '../src/evaluator';

const snippetsCwd = __dirname + '/snippets';


describe('eval', function() {

  describe('ArithmeticExpression', function() {

    evaluate('1 + 1', 2);

    evaluate('2 * (3 + 5)', 16);

    evaluate('a * (b)', 15, {
      a: 3,
      b: 5
    });

  });


  describe('SimplePositiveUnaryTest', function() {

    test(5, '[4..6]', true);

    test(5, '>= 10', false);

    test(5, '5', true);

    test(-5.312, '-5.312', true);

    test(-5.312, '>-5.312', false);

    test(-5.312, '>-5.312', false);

    test(5, '(>= 3, < 10)', true);

    test(5, '(>= 3, < -1)', false);

  });

});


// helpers ///////////////

function createEvalVerifier(options) {

  const {
    args,
    it
  } = options;

  const [
    expression,
    expectedOutput,
    context
  ] = args;

  const name = `${expression}${context ? ' { ' + Object.keys(context).join(', ') + ' }' : ''}`;

  it(name, function() {
    const output = Evaluator.eval(expression, context || {});

    expect(output).to.eql(expectedOutput);
  });

}


function createTestVerifier(options) {

  const {
    args,
    it
  } = options;

  const [ input, test, expectedOutput ] = args;

  const context = typeof input === 'object' ? input : null;

  const actualInput = context ? context.input : input;

  const name = `${actualInput} in ${test}${context ? ' { ' + Object.keys(context).join(', ') + ' }' : ''}`;

  it(name, function() {
    const output = Evaluator.test(actualInput, test, context || {});

    expect(output).to.eql(expectedOutput);
  });

}


function evaluate(...args) {

  return createEvalVerifier({
    it,
    args
  });
}

function evaluateOnly(...args) {
  return createEvalVerifier({
    args,
    it: it.only
  });
}

function testOnly(...args) {
  return createTestVerifier({
    args,
    it: it.only
  });
}

function test(...args) {

  return createTestVerifier({
    args,
    it
  });
}