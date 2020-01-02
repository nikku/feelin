import { expect } from 'chai';

import { interpreter } from '../src/interpreter';


describe('interpreter', function() {

  describe('evaluate', function() {

    describe('Expressions', function() {

      evaluate('1', 1);

      evaluate('1 2 3', [ 1, 2, 3 ]);

    });


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

      evaluate('-10--5', -5);

      evaluate('10**5', 100000);

      evaluate('10^5', 100000);

      evaluate('null - 3', null);

      evaluate('0.0 / 0.0', null);

    });


    describe('FunctionInvocation', function() {

      evaluate('with spaces()', 1, {
        'with spaces': function() {
          return 1;
        }
      });

      evaluate('foo.bar(b, c)', 5, {
        'foo.bar': function(b, c) {
          return b + c;
        },
        b: 2,
        c: 3
      });

      evaluate('foo()', 5, {
        foo: function() {
          return 5;
        }
      });

    });


    describe('ForExpression', function() {

      evaluate('for i in [] return i', []);

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

      evaluate('for i in 0..4 return if i = 0 then 1 else i * partial[-1]', [1, 1, 2, 6, 24 ]);

    });


    describe('QuantifiedExpression', function() {

      evaluate('every e in [0, 1] satisfies e != 2', true);

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

      evaluate('every e in [0] satisfies e = 0', true);

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

      evaluate('5 > 10', false);

      evaluate('5 >= 5', true);

      evaluate('1 between -1 and 5', true);

      evaluate('5 in > 3', true);

      evaluate('5 in < 0', false);

      evaluate('5 in (> 0, <10)', true);

      evaluate('5 in ([0..10], [5..15])', true);

      evaluate('0 in (1, 0)', true);

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

      evaluate('if 1 = 2 then 4 * 4 else 5 * 5', 25);

      evaluate('if 2 = 2 then 4 * 4 else 5 * 5', 16);

      evaluate('if 5 > 10 then 15', null);

      evaluate('if 15 > 10 then 15', 15);

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

      evaluate('a[ b > 10 ]', [ 11, 15 ], {
        a: [
          { b: 5 },
          { b: 11 },
          { b: 15 }
        ]
      });

      evaluate('[1, 2, 3][-1]', 3);

      evaluate('[1, 2, 3][-3]', 1);

      evaluate('[1, 2, 3][-4]', null);

      evaluate('[1, 2, 3][1]', 1);

      evaluate('[1, 2, 3][3]', 3);

      evaluate('[1, 2, 3][0]', null);

      evaluate('[1, 2, 3][4]', null);

      evaluate('[1,2,3][true]', [1, 2, 3]);

      evaluate('[1,2,3][false]', []);

      evaluate('null[false]', null);

      evaluate('null[true]', null);

      evaluate('null[1]', null);

      evaluate('true[1]', true);

      evaluate('"Foo"[1]', 'Foo');

      evaluate('false[1]', false);

      evaluate('100[1]', 100);

      evaluate('a[1]', { b: 'foo' }, {
        a: { b: 'foo' }
      });

      evaluate('[1,2,3][item >= 2]', [2, 3]);

      evaluate('[{a: 1}, {a: 2}, {a: 3}][item.a >= 2]', [2, 3]);

      evaluate('[{a: 1}, {a: 2}, {a: 3}][a >= 2]', [2, 3]);

      evaluate('[{item: 1}, {item: 2}, {item: 3}][item >= 2]', [2, 3]);

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

      evaluate('[]', []);

      evaluate('[1, a, 5 * 3]', [ 1, 2, 15 ], { a: 2 });

    });


    describe('Context', function() {

      evaluate('{ a: [ { b: 1 }, { b: 2 } ].b }', { a: [ 1, 2 ] });

      evaluate('{🐎: "😀"}', { '🐎': '😀' });

      evaluate('{ "foo+bar((!!],foo": 10 }', { 'foo+bar((!!],foo': 10 });

      evaluate('{ "": 20 }', { '': 20 });

    });


    describe('Name', function() {

      evaluate('a + b', 1, { 'a + b': 1 });

      evaluate('a +', 1, { 'a +': 1 });

      evaluate('a+b', 1, { 'a + b': 1 });

      evaluate('a  b c*d', 1, { 'a b  c * d': 1 });

      evaluate('Mike\'s age + walt\'s age - average age' , 40, { 'Mike\'s age + walt\'s age': 90, 'average age': 50 });

      evaluate('"šomeÚnicodeŠtriňg"', 'šomeÚnicodeŠtriňg');

      evaluate('"横綱"', '横綱');

    });

  });


  describe('unaryTest', function() {

    unaryTest(4, '[4..6]', true);
    unaryTest(6, '[4..6]', true);

    unaryTest(4, ']4..6[', false);
    unaryTest(6, ']4..6[', false);

    unaryTest(4, '(4..6)', false);
    unaryTest(6, '(4..6)', false);

    unaryTest(5, '>= 10', false);

    unaryTest(5, '5', true);

    unaryTest({
      '?': 5,
      a: 5
    }, 'a', true);

    unaryTest(-5.312, '-5.312', true);

    unaryTest(-5.312, '>-5.312', false);

    unaryTest(-5.312, '<-5.312', false);

    unaryTest(5, '>= 3, < 10', true);

    unaryTest(5, '3, < -1', false);

    unaryTest(5, '-', true);

    unaryTest(5, '1, 5', true);

    unaryTest(5, '1, 4', false);

    unaryTest(5, '1, [2..5]', true);

    unaryTest(5, '[1, 5], false', true);

    unaryTest(5, '? * 2 = 10', true);


    describe.skip('negation', function() {

      unaryTest(5, 'not(true)', false);

      unaryTest(5, 'not(false)', true);

      unaryTest(5, 'not(null)', null);

      unaryTest(5, 'not(0)', null);

      unaryTest(5, 'not(1)', null);

      unaryTest(5, 'not("true")', null);
    });

  });


  describe('comments', function() {

    evaluate('1 + /* 1 + */ 1', 2);

    evaluate(`1 + // eol comment
                1`, 2);

    evaluate(`1 + // eol comment
                1`, 2);

    evaluate(`/*
               some intro waffle
               */
              1 + 1 // and stuff`, 2);

  });


  describe.skip('properties', function() {

    function Duration() {}

    evaluate('time("10:30:00+05:00").time offset', new Duration('PT5H'));

  });


  describe.skip('functions', function() {

    evaluate('ends with("ASD", "D")', 'ASD');

  });


  describe.skip('equality', function() {

    evaluate('false = 0', null);

    evaluate('false = null', false);

    evaluate('true = 1', null);

    evaluate('0 = 0.00', true);

    evaluate('100 = null', null);

    evaluate('-0 = 0', true);

    evaluate('[1,2,3] = [1,2,3]', true);

    evaluate('[1] = [2]', false);

    evaluate('[] = null', false);

    evaluate('[] = 0', null);

    evaluate('{} = {}', true);

    evaluate('{foo: "bar", bar: "baz"} = {foo: "bar", bar: "baz"}', true);

    evaluate('{foo: "bar"} = {"foo": "bar"}', true);

    evaluate('{} = null', false);

    evaluate('{} = []', null);

    evaluate('date("2018-12-08") = date("2018-12-08")', true);

    evaluate('[1,2,[3, 4]] = [1,2,[3, 4]]', true);

    evaluate('{a: {c: "bar", b: "foo"}} = {a: {b: "foo", c: "bar"}}', true);

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

  const input = context ? context['?'] : inputOrContext;

  const name = `${test} => ${input} ${context ? ' { ' + Object.keys(context).join(', ') + ' }' : ''}`;

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

// eslint-disable-next-line no-unused-vars
function evaluateOnly(...args) {
  return createEvalVerifier({
    args,
    it: it.only
  });
}

// eslint-disable-next-line no-unused-vars
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