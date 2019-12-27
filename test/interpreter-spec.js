import { expect } from 'chai';

import { interpreter } from '../src/interpreter';


describe('interpreter', function() {

  describe('ArithmeticExpression', function() {

    evaluate('1 + 1', 2);

    evaluate('2 * (3 + 5)', 16);

    evaluate('a * (b)', 15, {
      a: 3,
      b: 5
    });

    evaluate('-(a)', -3, {
      a: 3
    });
  });


  describe('FunctionInvocation', function() {

    evaluate('foo.bar(b, c)', 5, {
      'foo.bar': function(b, c) {
        return b + c;
      },
      b: 2,
      c: 3
    });

  });


  describe('ForExpression', function() {

    evaluate('for a in b return (a).c', [1, 2], {
      b: [
        { c: 1 },
        { c: 2 }
      ]
    });

    evaluate('for w in widths, h in heights return w * h', [20, 40, 40, 80], {
      widths: [
        2,
        4
      ],
      heights: [
        10,
        20
      ]
    });

    evaluate('for a in 1 .. 3 return a', [1, 2, 3]);

    evaluate('for a in 1 .. 2, b in 1 .. 2 return a * 10 + b', [11, 12, 21, 22]);

  });


  describe('QuantifiedExpression', function() {

    evaluate('every b in a satisfies b < 10', true, {
      a: [
        9,
        5
      ]
    });

    evaluate('every b in a satisfies b < 10', false, {
      a: [
        12,
        5
      ]
    });

    evaluate('every b in a satisfies b < 10', true, {
      a: [ ]
    });

    evaluate('every w in widths, h in heights satisfies w * h < 100', true, {
      widths: [
        2,
        4
      ],
      heights: [
        10,
        20
      ]
    });

    evaluate('some b in a satisfies b < 10', true, {
      a: [
        12,
        5
      ]
    });

    evaluate('some w in widths, h in heights satisfies w * h < 30', true, {
      widths: [
        2,
        4
      ],
      heights: [
        10,
        20
      ]
    });

  });


  describe('Comparison', function() {

    evaluate('1 between -1 and 5', true);

    evaluate('5 in > 3', true);

    evaluate('5 in < 0', false);

  });


  describe('Conjunction', function() {

    evaluate('null and true', false);

    evaluate('[] and 1', true);

    evaluate('false and 1', false);

    evaluate('a and b', false, {
      a: null,
      b: 1
    });

    evaluate('a and b', true, {
      a: true,
      b: 1
    });

  });


  describe('Disjunction', function() {

    evaluate('null or true', true);

    evaluate('false or 1', true);

    evaluate('a or b', true, {
      a: null,
      b: 1
    });

    evaluate('a or b', false, {
      a: false,
      b: false
    });

  });


  describe('IfExpression', function() {

    evaluate('if a > 10 then 15 else 5', 15, {
      a: 12
    });

    evaluate('if a > 10 then 15 else 5', 5, {
      a: 8
    });

    evaluate('if a then 15 else 5', 5, {
      a: null
    });


  });


  describe('InstanceOf', function() {

    function B() { }

    evaluate('a instance of B', true, {
      a: new B(),
      B
    });

  });


  describe('PathExpression', function() {

    evaluate('(a).b', 1, {
      a: {
        b: 1
      }
    });

    evaluate('(a).b', [ 1, 2 ], {
      a: [
        {
          b: 1
        },
        {
          b: 2
        }
      ]
    });

  });


  describe('FilterExpression', function() {

    evaluate('a[ b > 10 ].b', [ 11, 15 ], {
      a: [
        { b: 5 },
        { b: 11 },
        { b: 15 }
      ]
    });

  });


  describe('Literals', function() {

    evaluate('"foo"', 'foo');

    evaluate('-1', -1);

    evaluate('false', false);

    evaluate('true', true);

    evaluate('.5', .5);

    evaluate('null', null);

  });


  describe('List', function() {

    evaluate('[1, a, 5 * 3]', [ 1, 2, 15 ], { a: 2 });

  });


  describe('Context', function() {

    evaluate('{ a: [ { b: 1 }, { b: 2 } ].b }', { a: [ 1, 2 ] });

  });


  describe('SimplePositiveUnaryTests', function() {

    // unaryTest(5, '[4..6]', true);

    unaryTest(5, '>= 10', false);

    unaryTest(5, '5', true);

    unaryTest(5, 'a', true, { a: 5 });

    unaryTest(-5.312, '-5.312', true);

    unaryTest(-5.312, '>-5.312', false);

    unaryTest(-5.312, '<-5.312', false);

    unaryTest(5, '(>= 3, < 10)', true);

    unaryTest(5, '(>= 3, < -1)', false);

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
    const output = interpreter.evaluate(expression, context || {});

    expect(output).to.eql(expectedOutput);
  });

}

function createUnaryTestVerifier(options) {

  const {
    args,
    it
  } = options;

  const [ inputOrContext, test, expectedOutput ] = args;

  const context = typeof inputOrContext === 'object' ? inputOrContext : null;

  const input = context ? context.input : inputOrContext;

  const name = `${input} in ${test}${context ? ' { ' + Object.keys(context).join(', ') + ' }' : ''}`;

  it(name, function() {
    const output = interpreter.unaryTest(input, test, context || {});

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

function unaryTestOnly(...args) {
  return createUnaryTestVerifier({
    args,
    it: it.only
  });
}

function unaryTest(...args) {

  return createUnaryTestVerifier({
    args,
    it
  });
}