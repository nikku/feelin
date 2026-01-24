import { inspect } from 'node:util';

import { expect } from './helpers.js';

import {
  unaryTest,
  evaluate,
  date,
  duration
} from 'feelin';


describe('interpreter', function() {

  describe('evaluate', function() {

    describe('built-ins', function() {

      expr('starts    with("a", "a")', true);

      expr('starts with   ("a", "a")', true);

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

      expr('[2] ** 4', null);

      expr('0.0 / 0.0', null);

      expr('null - 3', null);

      expr('null / 10', null);

      expr('10 ** null', null);

      expr('null ** null', null);

      expr('"FOO" / 10', null);

      expr('10 * {}', null);

      expr('[ 5 ] * 2', null);

      expr('2 - [ 0 ]', null);


      describe('string addition', function() {

        expr('"a" + "b"', 'ab');

        expr('"a" + null', null);

        expr('null + "a"', null);

        expr('"a" + string(1)', 'a1');

        expr('1 + "a"', null);

      });


      describe('temporal arithmetic', function() {

        expr('time("23:59:00") + duration("PT2M") = time("00:01")', true);
        expr('time("00:01") - duration("PT2M") = time("23:59:00")', true);

        expr('time("23:59:00") + duration("PT2M") + duration("P1D") = time("00:01")', true);
        expr('time("23:59:00") + duration("PT2M") + duration("P1M") = time("00:01")', true);

        // TODO(nikku): figure out semantics in accordance with DMN spec
        exprSkip('time("00:01:00@Etc/UTC") - time("23:59:00z") = duration("PT2M")', true);

        expr(`
          time("23:59:00z") + duration("PT2M") =
          time("00:01:00z")
        `, true);

        expr('date("2012-12-24") + date("2012-12-24")', null);
        expr('date("2012-12-25") - date("2012-12-24") = duration("P1D")', true);

        expr(`
          date and time("2012-12-24T23:59:00") +
          date and time("2012-12-25T00:00:00")
        `, null);

        expr(`
          date and time("2012-12-24T23:59:00") + duration("PT1M") =
          date and time("2012-12-25T00:00:00")
        `, true);

        expr(`
          date and time("2012-12-25T00:00:00") - duration("PT1M") =
          date and time("2012-12-24T23:59:00")
        `, true);

        expr(`
          date and time("2012-12-25T00:00:00z") - duration("PT1M") =
          date and time("2012-12-24T23:59:00z")
        `, true);

        expr('duration("P1D") + duration("P1D")', duration('P2D'));
        expr('duration("PT1M") + duration("PT1M")', duration('PT2M'));

        expr('date("2023-10-06") + duration("PT1H")', date('2023-10-06T01:00Z'));
        expr('date("2023-10-06") + duration("P1D")', date('2023-10-07'));
        expr('date("2023-10-06") + duration("P1W")', date('2023-10-13'));
        expr('date("2023-10-06") + duration("P1M")', date('2023-11-06'));
        expr('date("2023-10-06") + duration("P1Y")', date('2024-10-06'));
        expr('date("2023-10-06") - duration("PT1H")', date('2023-10-05T23:00Z'));
        expr('date("2023-10-06") - duration("P1D")', date('2023-10-05'));
        expr('date("2023-10-06") - duration("P1W")', date('2023-09-29'));
        expr('date("2023-10-06") - duration("P1M")', date('2023-09-06'));
        expr('date("2023-10-06") - duration("P1Y")', date('2022-10-06'));
        expr('date("2023-10-06") + duration("P1M") = date("2023-11-06")', true);
        expr('date("2023-10-06") - duration("P1M") = date("2023-09-06")', true);

      });

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

      expr('foo(a: true)', null, {
        foo: function() {
          return true;
        }
      });

      expr('foo(a: true, c: "NOT_NEEDED")', null, {
        foo: function(a, b) {
          return [ a, b ];
        }
      });

      expr('foo(b: true)', [ undefined, true ], {
        foo: function(a, b) {
          return [ a, b ];
        }
      });

      expr('foo(b: 1, a: "FOO" )', [ 'FOO', 1 ], {
        foo: function(a, b) {
          return [ a, b ];
        }
      });

      expr('foo(b: 1, a: "FOO" )', [ 'FOO', 1 ], {
        foo(a, b) {
          return [ a, b ];
        }
      });

      expr('foo(b: 1, a: "FOO" )', [ 'FOO', 1 ], {
        foo: (a, b) => {
          return [ a, b ];
        }
      });

      expr('foo(a + b)', 10, {
        foo: (n) => n,
        a: 3,
        b: 7
      });

      // call with wrong args
      expr('foo(5)', null, {
        foo: function() {
          return 5;
        }
      });

      // var args function
      expr('foo(1, 2, 3)', [ [ 1, 2, 3 ] ], {
        foo: function(...varArgs) {
          return [ varArgs ];
        }
      });

      expr('foo(1)', [ 1, [] ], {
        foo: function(firstArg, ...varArgs) {
          return [ firstArg, varArgs ];
        }
      });

      expr('foo(firstArg: 1)', [ 1, [] ], {
        foo: function(firstArg, ...varArgs) {
          return [ firstArg, varArgs ];
        }
      });

      expr('foo(firstArg: 1, varArgs: null)', [ 1, [] ], {
        foo: function(firstArg, ...varArgs) {
          return [ firstArg, varArgs ];
        }
      });


      expr('foo(varArgs: [ 1, 2, 3 ])', [ [ 1, 2, 3 ] ], {
        foo: function(...varArgs) {
          return [ varArgs ];
        }
      });

      expr('foo(varArgs: 1)', [ [ 1 ] ], {
        foo: function(...varArgs) {
          return [ varArgs ];
        }
      });

    });


    describe('FunctionDefinition', function() {

      expr(`
        ({
          foo: function(a + b) a +b + 5,
          bar: foo(5)
        }).bar
      `, 10);

      expr(`
        ({
          woop: 5,
          foo: function(a + b) a +b + woop,
          bar: foo(5)
        }).bar
      `, 10);

      expr(`
        (function(x,y) x < y)(1, 3)
      `, true);

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

      expr('for i in numbers return i * 10', [ 10, 20 ], {
        'numbers': [ 1, 2 ]
      });

      expr('for condition in [ > 5, [1..3], 5 ] return 6 in condition', [ true, false, false ]);

      expr('for i in days in weekend return if i = "sunday" then true else false', [ false, true ], { 'days in weekend': [ 'saturday', 'sunday' ] });

      expr('for i in null return i', null);

      expr('for i in null, y in [ 1 ] return [ i, y ]', null);

      expr('for y in [ 1 ], i in null return [ i, y ]', null);

      expr('for a in 1 return a', null);

      expr('for x in [ [1,2], [3,4] ], y in x return y', [ 1, 2, 3, 4 ]);
      expr('for x in [ [ a, b ], c ], y in x, z in y return z', [ 1, 2, 3, 4, 5, 6, 7, 8 ], {
        a: [ 1, 2 ],
        b: [ 3, 4 ],
        c: [ [ 5, 6 ], [ 7,8 ] ]
      });
      expr('for x in [ [ i + 1, i + 2 ], [ i + 3, i + 4] ], y in x return y', [ 1, 2, 3, 4 ], {
        i: 0
      });

      expr('for x in [ 1 ], y in [x + 1] return y', [ 2 ]);

      expr('for x in [ 1, null ], y in [ x + 1 ] return y', [ 2, null ]);

      exprSkip('for i in [2..1] return i', null);

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

      expr('every x in [ [1, 2], [3, 4] ], y in x satisfies y < 5', true);
      expr('every x in [ [1, 2], [3, 4] ], y in x satisfies y > 3', false);

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

      expr('some x in [ [1, 2], [3, 4] ], y in x satisfies y > 5', false);
      expr('some x in [ [1, 2], [3, 4] ], y in x satisfies y > 3', true);

      expr('every e in null satisfies e != 2', null);

      expr('some e in 1 satisfies e != 2', null);

      expr('some x in [true] satisfies true', true);
      expr('some x in true satisfies true', null);

      expr('some x in [false] satisfies true', true);
      expr('some x in false satisfies true', null);

      expr('some x in [false] satisfies false', false);
      expr('some x in false satisfies false', null);

    });


    describe('Comparison', function() {

      expr('5 > 10', false);

      expr('5 >= 5', true);

      expr('1 between -1 and 5', true);

      expr('1 between 5 and -1', true);

      expr('"b" between "b" and "d"', true);
      expr('"a" between "b" and "d"', false);

      expr('"d" between "b" and "d"', true);
      expr('"e" between "b" and "d"', false);

      expr('1 between null and 3', null);
      expr('1 between 1 and null', null);

      exprSkip('1 between "b" and "d"', null);

      expr('"d" in ["b".."d"]', true);
      expr('"d" in ["b".."d")', false);
      expr('"b" in ["b".."d"]', true);
      expr('"b" in ("b".."d"]', false);

      expr('"d" in null', null);

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

      expr('{a: "foo"} in [{b: "bar"}, {a: "foo"}]', true);

      expr('{a: "foo"} in {a: "foo"}', true);

      expr('date("2023-08-10") in > date("2023-08-09")', true);
      expr('date("2023-08-10") in >= date("2023-08-10")', true);
      expr('date("2023-08-10") in < date("2023-08-11")', true);
      expr('date("2023-08-10") in <= date("2023-08-10")', true);

      expr('duration("P10D") in < duration("P10D")', false);
      expr('duration("P10D") in <= duration("P10D")', true);
      expr('duration("P10D") in > duration("P10D")', false);
      expr('duration("P10D") in >= duration("P10D")', true);

      expr('duration("P3Y") in [duration("P2Y")..duration("P4Y")]', true);
      expr('duration("P2Y") in [duration("P2Y")..duration("P4Y")]', true);
      expr('duration("P4Y") in [duration("P2Y")..duration("P4Y")]', true);

      expr('duration("P4Y1D") in [duration("P2Y")..duration("P4Y")]', false);
    });


    describe('ForExpression > SimplePositiveUnaryTest', function() {

      expr(`
        for
          test in [ < 10, > 100 ]
        return
          test(40)
      `, [ false, false ]);

    });


    describe('Conjunction', function() {

      expr('true and true', true);

      expr('false and true', false);

      expr('null and true', null);

      expr('false and 1', false);

      expr('[] and 1', null);

      expr('null and 1', null);

      expr('true and 1', null);

    });


    describe('Disjunction', function() {

      expr('false or true', true);

      expr('null or true', true);

      expr('false or 1', null);

      expr('null or 1', null);

      expr('false or false', false);

    });


    describe('IfExpression', function() {

      expr('if 1 = 2 then 4 * 4 else 5 * 5', 25);

      expr('if 2 = 2 then 4 * 4 else 5 * 5', 16);

      expr('if 5 > 10 then 15 else false', false);

      expr('if 15 > 10 then 15 else false', 15);

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


      function B() { }

      expr('a instance of B', true, {
        a: new B(),
        B
      });

      exprSkip('@"P10Y" instance of years and months duration', true);

      exprSkip('@"P10D" instance of days and time duration', true);

      exprSkip('@"10:30:11@Australia/Melbourne" instance of time', true);

      exprSkip('@"2018-12-08T10:30:11+11:00" instance of date and time', true);

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

      expr('[ { x: 1, y: 2}, { x: 2, y: 3} ].y', [ 2, 3 ]);
      expr('[ { x: 1, y: null }, { x: 2 }, { y: 1 } ].y', [ null, null, 1 ]);
      expr('[ {x: 1, y: 2} ].y', [ 2 ]);
      expr('[ { x: 1 } ].y', [ null ]);

      expr('null.y', null);

      expr('{ a: 1 }.b', null);

      expr('{ a: 1 }.a.b', null);

    });


    describe('FilterExpression', function() {

      expr('[1, 2, 3][-1]', 3);

      expr('[1, 2, 3][-3]', 1);

      expr('[1, 2, 3][-4]', null);

      expr('[1, 2, 3][1]', 1);

      expr('[1, 2, 3][3]', 3);

      expr('[1, 2, 3][0]', null);

      expr('[1, 2, 3][4]', null);

      expr('[1, 2, 3][1 + 2]', 3);

      expr('[1, 2, 3][1 + a]', 2, { a: 1 });

      expr('[1, 2, 3][a.b]', 2, { a: { b: 2 } });

      expr('[1, 2, 3][a[1]]', 2, { a: [ 2 ] });

      expr('[1, 2, 3][a()]', 2, {
        a() { return 2; }
      });

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

      expr('[{a: 1}, {a: 2}, {a: 3}][item.a >= 2]', [ { a: 2 }, { a: 3 } ]);
      expr('[{a: 1}, {a: 2}, {a: 3}][a >= 2]', [ { a: 2 }, { a: 3 } ]);

      expr('[{item: 1}, {item: 2}, {item: 3}][item >= 2]', [ { item: 2 }, { item: 3 } ]);

      expr('[ { x: 1, y: 2 }, { x: null, y: 3 } ][ x < 2 ]', [ { x: 1, y: 2 } ]);
      expr('[ { x: 1, y: 2 }, { y: 3 } ][ x < 2 ]', [ { x: 1, y: 2 } ]);

      expr('a[1]', null, { a: null });

      expr('a[1]', null);

      expr('a[date("2002-04-02")]', null);
      expr('a[@"2002-04-02"]', null);

      expr('[][a]', null, { a: 1 });

      expr('[][a]', [], { a: '1' });

      expr('["A", "B", "C"][i]', 'A', { i: 1 });
      expr('["A", "B", "C"][i]', 'C', { i: -1 });

      expr('["A", "B", "C"][a + b]', 'B', { a: 1, b: 1 });
      expr('["A", "B", "C"][a - b]', 'B', { a: 3, b: 1 });

      expr('["A", "B", "C"][a()]', 'B', {
        a() { return 2; }
      });

    });


    describe('Literals', function() {

      expr('"foo"', 'foo');

      expr('"\\""', '"');
      expr('"\\n"', '\n');
      expr('"\\"', '\\');
      expr('"\\t"', '\t');
      expr('"\\r"', '\r');

      expr('"\\\\n"', '\\n');
      expr('"\\\\"', '\\');

      expr('"\\s"', '\\s');

      expr('"\\ud83d\\udc0e\\uD83D\\UDE00"', '🐎😀');
      expr('"\\U01F40E"', '🐎');
      expr('"\\\\uD83D\\u2661"', '\\uD83D♡');
      expr('"\\\\\\u27B3\\\\uDCA9"', '\\➳\\uDCA9');
      expr('"\\u1F4A9"', '💩');

      expr('-1', -1);

      expr('1.23e4', 1.23e4);
      expr('1.23E4', 1.23e4);
      expr('1.23e+4', 1.23e+4);
      expr('1.23e-4', 1.23e-4);

      expr('false', false);

      expr('true', true);

      expr('.5', .5);

      expr('null', null);

    });


    describe('List', function() {

      expr('[]', []);

      expr('[1, a, 5 * 3]', [ 1, 2, 15 ], { a: 2 });

      expr('true[false]', []);

      expr('"foo"[false]', []);

      expr('100[false]', []);

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

      expr(`
        {
          a: 1,
          b: a + 1
        }
      `, { a: 1, b: 2 });

    });


    describe('DateTime', function() {

      expr('date and time()', null);

    });


    describe('Name', function() {

      expr('a + b', 1, { 'a + b': 1 });

      expr('a +', 1, { 'a +': 1 });

      expr('a+b', 1, { 'a + b': 1 });

      expr('a  b c*d', 1, { 'a  b c*d': 1 });

      expr('Mike\'s age + walt\'s age - average age' , 40, { 'Mike\'s age + walt\'s age': 90, 'average age': 50 });

      expr('"šomeÚnicodeŠtriňg"', 'šomeÚnicodeŠtriňg');

      expr('"横綱"', '横綱');

    });


    describe('VariableName', function() {

      describe('special name overrides', function() {

        expr(`
          {
            foo: date and time,
            bar: date,
            date and time: 10,
            date: 100,
            sum: date and time + date
          }
        `, {
          'foo': 'DATE AND TIME',
          'bar': 'DATE',
          'date and time': 10,
          'date': 100,
          'sum': 110
        }, {
          'date and time': 'DATE AND TIME',
          'date': 'DATE'
        });

      });


      describe('built-in function overrides', function() {

        expr('date', '13-11-1996', { date: '13-11-1996' });

        // if you override a variable, bad things can happen
        expr('date("2020-07-31")', null, { date: '13-11-1996' });

        expr('abs(-1)', 'absolute of -1', {
          abs(num) {
            return `absolute of ${num}`;
          }
        });

      });


      describe('<camunda> dialect', function() {

        expr('`foo`', 'result', { 'foo': 'result' }, 'camunda');

        expr(
          '`expr statement = 1 () - 2`',
          'result',
          { 'expr statement = 1 () - 2' : 'result' },
          'camunda'
        );

        expr(
          'foo.`bar`',
          'result',
          { 'foo' : { 'bar' : 'result' } },
          'camunda'
        );
      });

    });

  });


  describe('unaryTest', function() {

    unary(0, '< 5', true);
    unary(5, '< 5', false);

    unary(0, '<= 5', true);
    unary(5, '<= 5', true);

    unary(0, '> 5', false);
    unary(5, '> 5', false);

    unary(0, '>= 5', false);
    unary(5, '>= 5', true);

    unary(0, '= 5', false);
    unary(5, '= 5', true);

    unary(0, '!= 5', true);
    unary(5, '!= 5', false);

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

    unary({}, 'false', false);

    unary(null, 'null', true);
    unary(null, '= null', true);
    unary(null, '[null]', true);
    unary(null, '> 20', false);
    unary(null, '? > 20', true);

    unary(null, '> 20', false);
    unary(null, '? > 20', true);

    unary(null, '= "A"', false);
    unary(null, '> 5', false);
    unary(null, 'not (> 5)', true);
    unary(null, '[1..10], null', true);
    unary(null, '> 5, = null', true);
    unary(null, '> 5 and = null', false);
    unary(null, 'not(= null)', false);

    unary(null, 'null > 20', true);
    unary(null, 'not(null > 20)', false);

    unary(null, '3 > 1', true);

    unary(null, 'true', false);
    unary(null, 'false', false);

    unary(false, 'false', true);
    unary(true, 'true', true);
    unary(null, '1 + null', true);

    // cf. https://github.com/nikku/feelin/issues/121
    // the result of the expression <some ...> is matched to the input value
    // <null> testing for equality
    unary(null, 'some x in null satisfies true', true);
    unary(null, 'some x in [] satisfies true', false);
    unary([ true ], 'some x in ? satisfies true', true);
    unary(true, 'some x in ? satisfies true', false);
    unary([ false ], 'some x in ? satisfies true', true);
    unary(false, 'some x in ? satisfies true', false);


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

      unary({ a: { b: 6 }, '?': 6 }, '(6..4)', false);

    });


    describe('negation', function() {

      unary({ '?': {} }, 'not(true)', true);

      unary({ '?': {} }, 'not(false)', true);

      unary(5, 'not(1, 2, 3)', true);

      unary(5, 'not([5..6], 1)', false);

      unary(5, 'not(null)', true);

      unary({ '?': {} }, 'not(null)', true);

      unary({ '?': {} }, 'not(0)', true);

      unary({ '?': {} }, 'not(1)', true);

      unary({ '?': {} }, 'not("true")', true);

      unary(null, 'not(null)', false);
      unary(null, 'not("someValue", null)', false);

      unary('someValue', 'not("someValue", null)', false);
      unary('otherValue', 'not("someValue", null)', true);

      unary('value1', 'not("value1", "value2")', false);
      unary('value1', 'not("value2", "value3")', true);

    });


    describe('<camunda> dialect', function() {

      unary({ '?': 3, 'foo': 3 }, '`foo`', true, 'camunda');

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


  describe('properties', function() {

    expr('[1..10].start included or false', true);


    describe('Range', function() {

      expr('[1..10].start included', true);
      expr('[1..10].end included', true);
      expr('(1..10].start included', false);
      expr('[1..10).end included', false);
      expr(']1..10].start included', false);
      expr('[1..10[.end included', false);

      expr('[1..10].start', 1);
      expr('[1..10].end', 10);

      expr('[a..10].start', null, { a: null });
      expr('[a..10].start included', false, { a: null });

      expr('[1..a].end', null, { a: null });
      expr('[1..a].end included', false, { a: null });

      expr('(> 10).start included', false);
      expr('(> 10).end included', false);
      expr('(> 10).start', 10);
      expr('(> 10).end', null);

      expr('(>= 10).start included', true);
      expr('(>= 10).start', 10);

      expr('(< 10).start included', false);
      expr('(< 10).end included', false);
      expr('(< 10).start', null);
      expr('(< 10).end', 10);

      expr('(<= 10).end included', true);
      expr('(<= 10).end', 10);
    });


    describe.skip('DateAndTime', function() {

      expr('time("10:30:00+05:00").time offset = @"PT5H"', true);

    });

  });


  describe('equality', function() {

    expr('false = 0', null);

    expr('false = null', false);

    expr('true = 1', null);

    expr('0 = 0.00', true);

    expr('100 = null', false);

    expr('-0 = 0', true);

    expr('12300 = 1.23e4', true);
    expr('12300 = 1.23e+4', true);

    expr('[1,2,3] = [1,2,3]', true);

    expr('[1] = [2]', false);

    expr('[] = null', false);

    expr('[] = 0', null);

    expr('{} = {}', true);

    expr('{foo: "bar", bar: "baz"} = {foo: "bar", bar: "baz"}', true);

    expr('{foo: "bar"} = {"foo": "bar"}', true);

    expr('{} = null', false);

    expr('{} = []', null);

    expr('[1,2,[3, 4]] = [1,2,[3, 4]]', true);

    expr('{a: {c: "bar", b: "foo"}} = {a: {b: "foo", c: "bar"}}', true);

    expr('[{b: [1]}, {b: [2.1,2.2]}, {b: [3]}, {b: [4, 5]}].b = [[1], [2.1, 2.2], [3], [4, 5]]', true);

    expr('date and time("2012-12-24") = date and time("2012-12-24T00:00:00")', true);

    expr(`
      date and time("2018-12-08T00:00:00+00:00") = date and time("2018-12-08T00:00:00@Etc/UTC")
    `, true);

    expr(`
      @"2002-04-02T12:00:00@Australia/Melbourne" = @"2002-04-02T12:00:00@Australia/Melbourne"
    `, true);

    expr(`
      @"2002-04-02T12:00:00@Australia/Melbourne" = @"2002-04-02T12:00:00@Australia/Sydney"
    `, true);

    expr(`
      @"23:00:50@Australia/Melbourne" = @"23:00:50@Australia/Melbourne"
    `, true);

    expr(`
      @"23:00:50@Australia/Melbourne" = @"23:00:50@Australia/Sydney"
    `, true);

    expr('@"2002-04-02T23:00:00-04:00" = @"2002-04-03T02:00:00-01:00"', true);
    expr('@"2002-04-02T12:00:00-01:00" = @"2002-04-02T17:00:00+04:00"', true);

    expr('date(year:2017,month:08,day:30) = date("2017-08-30")', true);

    expr('date("2018-12-08") = date("2018-12-08")', true);

    expr('time("00:01") = time("00:01:00")', true);

    // TODO(nikku): investigate me
    exprSkip('time("10:30:00+01:00") = time("10:30:00@Europe/Paris")', true);

    expr('@"2002-04-02T12:00:00-01:00" = @"2002-04-02T17:00:00+04:00"', true);

    expr('@"23:00:50" = @"23:00:50Z"', false);
    expr('@"23:00:50" = @"23:00:50"', true);
    expr('@"23:00:50z" = @"23:00:50Z"', true);

    expr('(> 5) = (5 .. null_value]', true, { null_value: null });

    expr('(>= 5) = [5 .. null_value]', true, { null_value: null });

    expr('(5..10) = ]5 .. 10[', true);

    exprSkip('(< 10) = (null..10)', false);
    exprSkip('(<= 10) = (null..10]', false);
    exprSkip('(> 10) = (10..null)', false);
    exprSkip('(>= 10) = [10..null)', false);

    exprSkip('(=10) = [10..10]', false);
    exprSkip('(=10) = (=10)', true);
    exprSkip('(!=10) = (!=10)', true);

  });


  describe('implicit conversion', function() {

    expr('3[item > 2]', [ 3 ]);

    expr('contains(["foobar"], "of")', false);

    expr('append("foo", "bar")', [ 'foo', 'bar' ]);

  });


  describe('comparison', function() {

    expr('1 = [1]', true);

    expr('[ 1 ] = 1', true);

    expr('[ "A" ] = "A"', true);

    expr('[ 1, 2, { foo: "FOO" } ] = [ 1, 2, { foo: "FOO" } ]', true);

    expr('null < 2', null);
    expr('2 < null', null);

    expr('null > 2', null);
    expr('2 > null', null);

  });


  describe('function invocation', function() {

    expr('non_existing_function()', null);

    expr('123()', null);

    expr('@"2012-12-24"()', null);

    expr('false()', null);
    expr('true()', null);

    expr('"abs"(-1)', null);

  });


  describe('error handling', function() {

    describe('should throw Error on syntax errors', function() {

      const _it = it;

      function verifyError({ it = _it, error, fn, expectedMessage }) {

        it(error, () => {
          let error;

          try {
            fn();
          } catch (err) {
            error = err;
          }

          expect(error).to.exist;
          expect(error).to.have.keys([ 'position', 'input' ]);

          const actualMessage =
            `${error.message} parsing <${error.input}> at [${error.position.from}, ${error.position.to}]`;

          expect(actualMessage, 'error message').to.eql(expectedMessage);
        });
      }

      verifyError({
        error: 'bogus statement',
        fn: () => evaluate('1 * #3'),
        expectedMessage: 'Unrecognized token in <ArithmeticExpression> parsing <#> at [4, 5]'
      });


      verifyError({
        error: 'multiple expressions',
        fn: () => evaluate('1 2 3'),
        expectedMessage: 'Unrecognized token in <Expression> parsing <2> at [2, 3]'
      });


      verifyError({
        error: 'empty expression',
        fn: () => evaluate(''),
        expectedMessage: 'Incomplete <Expression> parsing <> at [0, 0]'
      });


      verifyError({
        error: 'incomplete if expression',
        fn: () => evaluate('if true'),
        expectedMessage: 'Incomplete <IfExpression> parsing <> at [7, 7]'
      });


      verifyError({
        error: 'broken if expression',
        fn: () => evaluate('if true { a: 10 }'),
        expectedMessage: 'Unrecognized token <Context> in <IfExpression> parsing <{ a: 10 }> at [8, 17]'
      });


      verifyError({
        error: 'empty unary tests',
        fn: () => unaryTest(''),
        expectedMessage: 'Incomplete <UnaryTests> parsing <> at [0, 0]'
      });

    });


    it('should NOT throw Error on null extraction', function() {

      expect(() => {
        evaluate('for i in null return i');
      }).not.to.throw();
    });

  });


  describe('warnings', function() {

    describe('should indicate warning', function() {

      it('NO_VARIABLE_FOUND', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('x');

        // then
        expect(value).to.be.null;

        expect(warnings).to.eql([
          {
            message: "Variable 'x' not found",
            type: 'NO_VARIABLE_FOUND',
            position: { from: 0, to: 1 },
            details: {
              template: "Variable 'x' not found",
              values: {}
            }
          }
        ]);
      });


      it('NO_CONTEXT_ENTRY_FOUND in context', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('{ a: 10 }.x');

        // then
        expect(value).to.be.null;

        expect(warnings).to.eql([
          {
            message: "Key 'x' not found in '{...}'",
            type: 'NO_CONTEXT_ENTRY_FOUND',
            position: { from: 10, to: 11 },
            details: {
              template: "Key 'x' not found in {target}",
              values: {
                target: { a: 10 }
              }
            }
          }
        ]);
      });


      it('NO_PROPERTY_FOUND in number', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('1.x');

        // then
        expect(value).to.be.null;

        expect(warnings).to.eql([
          {
            message: "Property 'x' not found in '1'",
            type: 'NO_PROPERTY_FOUND',
            position: { from: 2, to: 3 },
            details: {
              template: "Property 'x' not found in {target}",
              values: {
                target: 1
              }
            }
          }
        ]);
      });


      it('INVALID_TYPE for basic arithmetic', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('"foo" + 10');

        // then
        expect(value).to.be.null;

        expect(warnings).to.eql([
          {
            type: 'INVALID_TYPE',
            message: "Can't add '10' to '\"foo\"'",
            position: { from: 6, to: 7 },
            details: {
              template: "Can't add {right} to {left}",
              values: {
                left: 'foo',
                right: 10
              }
            }
          }
        ]);
      });


      it('INVALID_TYPE for array arithmetic', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('[1, 2] * 3');

        // then
        expect(value).to.be.null;

        expect(warnings).to.eql([
          {
            type: 'INVALID_TYPE',
            message: "Can't multiply '3' to '[2 items]'",
            position: { from: 7, to: 8 },
            details: {
              template: "Can't multiply {right} to {left}",
              values: {
                left: [ 1, 2 ],
                right: 3
              }
            }
          }
        ]);
      });


      it('INVALID_TYPE for date arithmetic', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('@"2025-12-12" ** 10');

        // then
        expect(value).to.be.null;

        expect(warnings).to.eql([
          {
            type: 'INVALID_TYPE',
            message: "Can't exponentiate '10' to '2025-12-12T00:00:00.000Z'",
            position: { from: 14, to: 16 },
            details: {
              template: "Can't exponentiate {right} to {left}",
              values: {
                right: 10,
                left: date('2025-12-12')
              }
            }
          }
        ]);
      });


      it.skip('NOT_COMPARABLE for basic comparison');


      it.skip('NOT_COMPARABLE for <between> comparison');


      it.skip('NOT_COMPARABLE for <in> comparison');


      it('NOT_CALLABLE for non-function', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('x()', { x: 5 });

        // then
        expect(value).to.be.null;

        expect(warnings).to.eql([
          {
            type: 'NO_FUNCTION_FOUND',
            message: "Cannot invoke '5'",
            position: { from: 0, to: 3 },
            details: {
              template: 'Cannot invoke {target}',
              values: {
                target: 5
              }
            }
          }
        ]);
      });


      it('FUNCTION_INVOCATION_FAILURE on array args mis-match', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('not(1, 2)');

        // then
        expect(value).to.be.null;

        expect(warnings).to.have.length(1);

        expect(warnings[0]).to.deep.include({
          type: 'FUNCTION_INVOCATION_FAILURE',
          message: "Cannot invoke 'function(negand)' with parameters '[2 items]'",
          position: { from: 0, to: 9 }
        });

        expect(warnings[0].details.values).to.have.keys('target', 'params');
      });


      it('FUNCTION_INVOCATION_FAILURE on named parameter mis-match', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('not(foo: 1)');

        // then
        expect(value).to.be.null;

        expect(warnings).to.have.length(1);

        expect(warnings[0]).to.deep.include({
          type: 'FUNCTION_INVOCATION_FAILURE',
          message: "Cannot invoke 'function(negand)' with parameters '{...}'",
          position: { from: 0, to: 11 }
        });

        expect(warnings[0].details.values).to.have.keys('target', 'params');
      });


      it('FUNCTION_INVOCATION_FAILURE on date fn args mis-match', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('date(1, 2, 3, 4, 5, 6)');

        // then
        expect(value).to.be.null;

        expect(warnings).to.have.length(1);

        expect(warnings[0]).to.deep.include({
          type: 'FUNCTION_INVOCATION_FAILURE',
          message: "Cannot invoke 'function(year, month, day, from)' with parameters '[6 items]'",
          position: { from: 0, to: 22 }
        });

        expect(warnings[0].details.values).to.have.keys('target', 'params');
      });


      it('FUNCTION_INVOCATION_FAILURE on date fn named parameter mis-match', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('date(foo: 1)');

        // then
        expect(value).to.be.null;

        expect(warnings).to.have.length(1);

        expect(warnings[0]).to.deep.include({
          type: 'FUNCTION_INVOCATION_FAILURE',
          message: "Cannot invoke 'function(year, month, day, from)' with parameters '{...}'",
          position: { from: 0, to: 12 }
        });

        expect(warnings[0].details.values).to.have.keys('target', 'params');
      });

    });


    describe('should not indicate warning', function() {

      it('for out of bounds access', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('[1, 2, 3][10]');

        // then
        expect(value).to.be.null;

        expect(warnings).to.be.empty;
      });


      it('for filter expression', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('list[a=b]', {
          list: [ { a: 1, b: 1 } ]
        });

        // then
        expect(value).to.eql([ { a: 1, b: 1 } ]);

        expect(warnings).to.eql([]);
      });


      it('valid expressions', function() {

        // when
        const {
          value,
          warnings
        } = evaluate('1 + 2');

        // then
        expect(value).to.equal(3);
        expect(warnings).to.be.empty;
      });

    });


    it('should expose warnings in unaryTest', function() {

      // when
      const {
        value,
        warnings
      } = unaryTest('x', { '?': 5 });

      // then
      expect(value).to.eql(false);

      expect(warnings).to.eql([
        {
          message: "Variable 'x' not found",
          type: 'NO_VARIABLE_FOUND',
          position: { from: 0, to: 1 },
          details: {
            template: "Variable 'x' not found",
            values: {}
          }
        }
      ]);
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
    context,
    dialect
  ] = args;

  const name = `${expression}${context ? ` ${ inspect(context) }` : ''}`;

  it(name, function() {
    const output = evaluate(expression, context || {}, dialect).value;

    expect(output).to.eql(expectedOutput);
  });

}

function createUnaryVerifier(options) {

  const {
    args,
    it
  } = options;

  const [
    inputOrContext,
    test,
    expectedOutput,
    dialect
  ] = args;

  const context = typeof inputOrContext === 'object' && inputOrContext !== null ? inputOrContext : {
    '?': inputOrContext
  };

  const name = `${test} ${ inspect(context) }`;

  it(name, function() {

    const output = unaryTest(test, context, dialect).value;

    expect(output).to.eql(expectedOutput);
  });

}

function expr(...args) {

  return createExprVerifier({
    it,
    args
  });
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function exprOnly(...args) {
  return createExprVerifier({
    args,
    it: it.only
  });
}


function exprSkip(...args) {
  return createExprVerifier({
    args,
    it: it.skip
  });
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function unaryOnly(...args) {
  return createUnaryVerifier({
    args,
    it: it.only
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function unarySkip(...args) {
  return createUnaryVerifier({
    args,
    it: it.skip
  });
}

function unary(...args) {

  return createUnaryVerifier({
    args,
    it
  });
}