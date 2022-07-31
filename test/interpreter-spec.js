import { expect } from './helpers.js';

import {
  unaryTest,
  evaluate
} from '../dist/index.esm.js';


describe('interpreter', function() {

  describe('evaluate', function() {

    describe('Expressions', function() {

      expr('1', 1);

      expr('1 2 3', [ 1, 2, 3 ]);

    });


    describe('ArithmeticExpression', function() {

      expr('1 + 1', 2);

      expr('2 * (3 + 5)', 16);

      expr('a * (b)', 15, {
        a: 3,
        b: 5
      });

      expr('-(a)', -3, {
        a: 3
      });

      expr('-10--5', -5);

      expr('10**5', 100000);

      expr('10^5', 100000);

      expr('null - 3', null);

      expr('0.0 / 0.0', null);

    });


    describe('FunctionInvocation', function() {

      expr('with spaces()', 1, {
        'with spaces': function() {
          return 1;
        }
      });

      expr('with  spaces()', 1, {
        'with spaces': function() {
          return 1;
        }
      });

      expr('foo.bar(b, c)', 5, {
        foo: {
          bar: function(b, c) {
            return b + c;
          }
        },
        b: 2,
        c: 3
      });

      expr('foo()', 5, {
        foo: function() {
          return 5;
        }
      });

    });


    describe('ForExpression', function() {

      expr('for i in [] return i', []);

      expr('for a in b return (a).c', [ 1, 2 ], {
        b: [
          { c: 1 },
          { c: 2 }
        ]
      });

      expr('for w in widths, h in heights return w * h', [ 20, 40, 40, 80 ], {
        widths: [
          2,
          4
        ],
        heights: [
          10,
          20
        ]
      });

      expr('for a in 1 .. -1 return a', [ 1, 0, -1 ]);

      expr('for a in 1 .. 3 return a', [ 1, 2, 3 ]);

      expr('for a in 1 .. 2, b in 1 .. 2 return a * 10 + b', [ 11, 12, 21, 22 ]);

      expr('for i in 0..4 return if i = 0 then 1 else i * partial[-1]', [ 1, 1, 2, 6, 24 ]);

      expr('for i in [1, 2] return i * b', [ 10, 20 ], {
        'b': 10
      });

      expr('for condition in [ > 5, [1..3], 5 ] return 6 in condition', [ true, false, false ]);

    });


    describe('QuantifiedExpression', function() {

      expr('every e in [0, 1] satisfies e != 2', true);

      expr('every b in a satisfies b < 10', true, {
        a: [
          9,
          5
        ]
      });

      expr('every b in a satisfies b < 10', false, {
        a: [
          12,
          5
        ]
      });

      expr('every b in a satisfies b < 10', true, {
        a: [ ]
      });

      expr('every w in widths, h in heights satisfies w * h < 100', true, {
        widths: [
          2,
          4
        ],
        heights: [
          10,
          20
        ]
      });

      expr('every e in [0] satisfies e = 0', true);

      expr('every e in [2] satisfies e = b * 2', true, {
        b: 1
      });

      expr('some b in a satisfies b < 10', true, {
        a: [
          12,
          5
        ]
      });

      expr('some w in widths, h in heights satisfies w * h < 30', true, {
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

      expr('5 > 10', false);

      expr('5 >= 5', true);

      expr('1 between -1 and 5', true);

      expr('1 between 5 and -1', true);

      expr('5 in > 3', true);

      expr('5 in < 0', false);

      expr('"FOO" in "FOO1"', false);

      expr('"FOO" in "FOO"', true);

      expr('true in (false, false)', false);

      expr('true in (true, false)', true);

      expr('5 in 6', false);

      expr('5 in 5', true);

      expr('5 in (> 0, <10)', true);

      expr('5 in ([0..10], [5..15])', true);

      expr('0 in (1, 0)', true);

      expr('0 in (1, 2)', false);

      expr('0 in (>1, <2)', true);

    });


    describe('Conjunction', function() {

      expr('null and true', false);

      expr('[] and 1', true);

      expr('false and 1', false);

      expr('a and b', false, {
        a: null,
        b: 1
      });

      expr('a and b', true, {
        a: true,
        b: 1
      });

    });


    describe('Disjunction', function() {

      expr('null or true', true);

      expr('false or 1', true);

      expr('a or b', true, {
        a: null,
        b: 1
      });

      expr('a or b', false, {
        a: false,
        b: false
      });

    });


    describe('IfExpression', function() {

      expr('if 1 = 2 then 4 * 4 else 5 * 5', 25);

      expr('if 2 = 2 then 4 * 4 else 5 * 5', 16);

      expr('if 5 > 10 then 15', null);

      expr('if 15 > 10 then 15', 15);

      expr('if a > 10 then 15 else 5', 15, {
        a: 12
      });

      expr('if a > 10 then 15 else 5', 5, {
        a: 8
      });

      expr('if a then 15 else 5', 5, {
        a: null
      });

    });


    describe('InstanceOfExpression', function() {

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      function B() { }

      expr('a instance of B', true, {
        a: new B(),
        B
      });

    });


    describe('PathExpression', function() {

      expr('a.b', 1, {
        a: {
          b: 1
        }
      });

      expr('(a).b', 1, {
        a: {
          b: 1
        }
      });

      expr('(a).b', [ 1, 2 ], {
        a: [
          {
            b: 1
          },
          {
            b: 2
          }
        ]
      });

      expr('(a).b.c', 1, {
        a: {
          b: {
            c: 1
          }
        }
      });

      expr('[ {x:1, y:2}, {x:2, y:3} ].y', [ 2, 3 ]);

    });


    describe('FilterExpression', function() {

      expr('[1, 2, 3][-1]', 3);

      expr('[1, 2, 3][-3]', 1);

      expr('[1, 2, 3][-4]', null);

      expr('[1, 2, 3][1]', 1);

      expr('[1, 2, 3][3]', 3);

      expr('[1, 2, 3][0]', null);

      expr('[1, 2, 3][4]', null);

      expr('[1,2,3][true]', [ 1, 2, 3 ]);

      expr('[1,2,3][false]', []);

      expr('[1, 2, 3][ > 1 ]', [ 2, 3 ]);

      expr('[1, 2, 3][ ]1..4] ]', [ 2, 3 ]);

      expr('["a", "b"][ "b" ]', [ 'b' ]);

      expr('null[false]', null);

      expr('null[true]', null);

      expr('null[1]', null);

      expr('true[1]', true);

      expr('"Foo"[1]', 'Foo');

      expr('false[1]', false);

      expr('100[1]', 100);

      expr('a[1]', { b: 'foo' }, {
        a: { b: 'foo' }
      });

      expr('a[ b > 10 ]', [ { b: 11 }, { b: 15 } ], {
        a: [
          { b: 5 },
          { b: 11 },
          { b: 15 }
        ]
      });

      expr('[1, 2, 3, 4][item > 2]', [ 3, 4 ]);

      expr('[ {x:1, y:2}, {x:2, y:3} ][x=1]', [ { x:1, y:2 } ]);

      // TODO(nikku): part of DMN spec
      exprSkip('[{a: 1}, {a: 2}, {a: 3}][item.a >= 2]', [ 2, 3 ]);

      expr('[{a: 1}, {a: 2}, {a: 3}][a >= 2]', [ { a: 2 }, { a: 3 } ]);

      expr('[{item: 1}, {item: 2}, {item: 3}][item >= 2]', [ { item: 2 }, { item: 3 } ]);

    });


    describe('Literals', function() {

      expr('"foo"', 'foo');

      expr('-1', -1);

      expr('false', false);

      expr('true', true);

      expr('.5', .5);

      expr('null', null);

    });


    describe('List', function() {

      expr('[]', []);

      expr('[1, a, 5 * 3]', [ 1, 2, 15 ], { a: 2 });

    });


    describe('Context', function() {

      expr('{ a: [ { b: 1 }, { b: 2 } ].b }', { a: [ 1, 2 ] });

      expr('{🐎: "😀"}', { '🐎': '😀' });

      expr('{ "foo+bar((!!],foo": 10 }', { 'foo+bar((!!],foo': 10 });

      expr('{ "": 20 }', { '': 20 });

      expr('{ hello world: 10 }', { 'hello world': 10 });

      expr('{ hello  world: 10 }', { 'hello world': 10 });

      expr(`
        [
          {a: {b: [1]}},
          {a: {b: [2.1, 2.2]}},
          {a: {b: [3]}},
          {a: {b: [4, 5]}}
        ].a.b
      `, [ [ 1 ], [ 2.1, 2.2 ], [ 3 ], [ 4, 5 ] ]);

      expr(`
        [{b: [1]}, {b: [2.1,2.2]}, {b: [3]}, {b: [4, 5]}].b
      `, [ [ 1 ], [ 2.1, 2.2 ], [ 3 ], [ 4, 5 ] ]);

    });


    describe('DateTime', function() {

      expr('date and time()', null);

    });


    describe('Name', function() {

      expr('a + b', 1, { 'a + b': 1 });

      expr('a +', 1, { 'a +': 1 });

      expr('a+b', 1, { 'a + b': 1 });

      expr('a  b c*d', 1, { 'a b  c * d': 1 });

      expr('Mike\'s age + walt\'s age - average age' , 40, { 'Mike\'s age + walt\'s age': 90, 'average age': 50 });

      expr('"šomeÚnicodeŠtriňg"', 'šomeÚnicodeŠtriňg');

      expr('"横綱"', '横綱');

    });

  });


  describe('unaryTest', function() {

    unary(5, '>= 10', false);

    unary(5, '5', true);

    unary({
      '?': 5,
      a: 5
    }, 'a', true);

    unary(-5.312, '-5.312', true);

    unary(-5.312, '>-5.312', false);

    unary(-5.312, '<-5.312', false);

    unary(5, '>= 3, < 10', true);

    unary(5, '3, < -1', false);

    unary(5, '-', true);

    unary(5, '1, 5', true);

    unary(5, '1, 4', false);

    unary(5, '1, [2..5]', true);

    unary(5, '[1, 5], false', true);

    unary(5, '? * 2 = 10', true);


    describe('Interval', function() {

      unary(4, '[4..6]', true);
      unary(6, '[4..6]', true);

      unary(4, '[6..4]', true);
      unary(6, '[6..4]', true);

      unary(4, ']4..6[', false);
      unary(6, ']4..6[', false);

      unary(4, ']6..4[', false);
      unary(6, ']6..4[', false);

      unary(4, '(4..6)', false);
      unary(6, '(4..6)', false);

      unary(4, '(6..4)', false);
      unary(6, '(6..4)', false);

    });


    describe('negation', function() {

      unary({}, 'not(true)', false);

      unary({}, 'not(false)', true);

      unary(5, 'not(1, 2, 3)', true);

      unary(5, 'not([5..6], 1)', false);

      unary(5, 'not(null)', null);

      unary({}, 'not(null)', null);

      unary({}, 'not(0)', null);

      unary({}, 'not(1)', null);

      unary({}, 'not("true")', null);

      unary({}, 'false', false);

      unary(null, 'null', null);

      unary(null, '3 > 1', true);

    });

  });


  describe('comments', function() {

    expr('1 + /* 1 + */ 1', 2);

    expr(`1 + // eol comment
                1`, 2);

    expr(`1 + // eol comment
                1`, 2);

    expr(`/*
               some intro waffle
               */
              1 + 1 // and stuff`, 2);

  });


  describe.skip('properties', function() {

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    function Duration() {}

    expr('time("10:30:00+05:00").time offset', new Duration('PT5H'));

  });


  describe.skip('functions', function() {

    expr('ends with("ASD", "D")', 'ASD');

  });


  describe.skip('equality', function() {

    expr('false = 0', null);

    expr('false = null', false);

    expr('true = 1', null);

    expr('0 = 0.00', true);

    expr('100 = null', null);

    expr('-0 = 0', true);

    expr('[1,2,3] = [1,2,3]', true);

    expr('[1] = [2]', false);

    expr('[] = null', false);

    expr('[] = 0', null);

    expr('{} = {}', true);

    expr('{foo: "bar", bar: "baz"} = {foo: "bar", bar: "baz"}', true);

    expr('{foo: "bar"} = {"foo": "bar"}', true);

    expr('{} = null', false);

    expr('{} = []', null);

    expr('date("2018-12-08") = date("2018-12-08")', true);

    expr('[1,2,[3, 4]] = [1,2,[3, 4]]', true);

    expr('{a: {c: "bar", b: "foo"}} = {a: {b: "foo", c: "bar"}}', true);

  });


  describe('built-ins', function() {

    expr('abs(-1)', 1);

    expr('index of([1, 2, 3, 2], 2)', [ 2, 4 ]);

  });


  describe('implicit conversion', function() {

    expr('3[item > 2]', [ 3 ]);

    expr('contains(["foobar"], "of")', false);

    expr('append("foo", "bar")', [ 'foo', 'bar' ]);

  });


  describe('error handling', function() {

    it('should throw Error on syntax errors', function() {

      let error;

      try {
        evaluate('1 * #3');
      } catch (err) {
        error = err;
      }

      expect(error).to.exist;
      expect(error.message).to.eql('Statement unparseable at [4, 5]');
    });


    it('should throw Error on null extraction', function() {

      let error;

      try {
        evaluate('for i in null return i');
      } catch (err) {
        error = err;
      }

      expect(error).to.exist;
      expect(error.message).to.eql('Cannot extract i from null');
    });


    it('should throw Error on missing function', function() {

      let error;

      try {
        evaluate('foo(1)');
      } catch (err) {
        error = err;
      }

      expect(error).to.exist;
      expect(error.message).to.eql('Failed to evaluate foo(1): Target is not a function');
    });

  });

});


// helpers ///////////////

function createExprVerifier(options) {

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
    const output = evaluate(expression, context || {});

    expect(output).to.eql(expectedOutput);
  });

}

function createUnaryVerifier(options) {

  const {
    args,
    it
  } = options;

  const [ inputOrContext, test, expectedOutput ] = args;

  const context = typeof inputOrContext === 'object' ? inputOrContext : null;

  const input = context ? context['?'] : inputOrContext;

  const name = `${test} => ${input} ${context ? ' { ' + Object.keys(context).join(', ') + ' }' : ''}`;

  it(name, function() {

    const output = unaryTest(test, {
      ...(context || {}),
      '?': input
    });

    expect(output).to.eql(expectedOutput);
  });

}

function expr(...args) {

  return createExprVerifier({
    it,
    args
  });
}

// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function exprOnly(...args) {
  return createExprVerifier({
    args,
    it: it.only
  });
}

// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function exprSkip(...args) {
  return createExprVerifier({
    args,
    it: it.skip
  });
}

// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function unaryOnly(...args) {
  return createUnaryVerifier({
    args,
    it: it.only
  });
}

function unary(...args) {

  return createUnaryVerifier({
    args,
    it
  });
}