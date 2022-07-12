import { expect } from './helpers.js';

import {
  evaluate
} from '../dist/index.esm.js';


describe('builtin functions', function() {

  describe('Conversion', function() {

    exprSkip('date("2012-12-25") – date("2012-12-24") = duration("P1D")', true);

    exprSkip(`
      date(
        date and time("2012-12-25T11:00:00Z")
      ) = date("2012-12-25")
    `, true);

    exprSkip('date(2012, 12, 25) = date("2012-12-25")', true);

    exprSkip(`
      date and time ("2012-12-24T23:59:00") =
        date and time (
          date("2012-12-24”), time(“23:59:00")
        )
    `, true);

    exprSkip(`
      date and time("2012-12-24T23:59:00") + duration("PT1M") =
      date and time("2012-12-25T00:00:00")
    `, true);

    exprSkip(`
      time("23:59:00z") + duration("PT2M") =
      time("00:01:00@Etc/UTC")
    `, true);

    exprSkip(`
      time(
        date and time("2012-12-25T11:00:00Z")
      ) = time("11:00:00Z")
    `, true);

    exprSkip(`
      time(“23:59:00z") =
      time(23, 59, 0, duration(“PT0H”))
    `, true);

    exprSkip(`
      number("1 000,0", " ", ",") =
      number("1,000.0", ",", ".")
    `, true);

    expr('string(1.1)', '1.1');
    expr('string(null)', null);
    expr('string("foo")', 'foo');
    expr('string(123.45)', '123.45');
    expr('string(true)', 'true');
    expr('string(false)', 'false');
    exprSkip('string(date("2012-12-25"))', '2012-12-25');

    exprSkip('string(date("2018-12-10"))', '2018-12-10');
    exprSkip('string(date and time("2018-12-10"))', '2018-12-10T00:00:00');
    exprSkip('string(date and time("2018-12-10T10:30:00.0001"))', '2018-12-10T10:30:00.0001');
    exprSkip('string(date and time("2018-12-10T10:30:00.0001+05:00:01"))', '2018-12-10T10:30:00.0001+05:00:01');
    exprSkip('string(date and time("2018-12-10T10:30:00@Etc/UTC"))', '2018-12-10T10:30:00@Etc/UTC');
    exprSkip('string(time("10:30:00.0001"))', '10:30:00.0001');
    exprSkip('string(time("10:30:00.0001+05:00:01"))', '10:30:00.0001+05:00:01');
    exprSkip('string(time("10:30:00@Etc/UTC"))', '10:30:00@Etc/UTC');
    exprSkip('string(duration("P1D"))', 'P1D');
    exprSkip('string(duration("-P1D"))', '-P1D');
    exprSkip('string(duration("P0D"))', 'PT0S');
    exprSkip('string(duration("P1DT2H3M4.1234S"))', 'P1DT2H3M4.1234S');
    exprSkip('string(duration("PT49H"))', 'P2DT1H');
    exprSkip('string(duration("P1Y"))', 'P1Y');
    exprSkip('string(duration("-P1Y"))', '-P1Y');
    exprSkip('string(duration("P0Y"))', 'P0M');
    exprSkip('string(duration("P1Y2M"))', 'P1Y2M');
    exprSkip('string(duration("P25M"))', 'P2Y1M');
    expr('string([1,2,3,"foo"])', '[1, 2, 3, "foo"]');
    expr('string([1,2,3,[4,5,"foo"]])', '[1, 2, 3, [4, 5, "foo"]]');
    exprSkip('string(["\\"foo\\""])', '["\\"foo\\"]');
    expr('string({a: "foo"})', '{a: "foo"}');
    expr('string({a: "foo", b: {bar: "baz"}})', '{a: "foo", b: {bar: "baz"}}');
    expr('string({"{": "foo"})', '{"{": "foo"}');
    expr('string({":": "foo"})', '{":": "foo"}');
    expr('string({",": "foo"})', '{",": "foo"}');
    expr('string({"}": "foo"})', '{"}": "foo"}');
    exprSkip('string({"\\"": "foo"})', '{"\\": "foo"}');

    exprSkip(`
      date and time("2012-12-24T23:59:00") -
        date and time("2012-12-22T03:45:00") =
        duration("P2DT20H14M")
    `, true);

    exprSkip('duration("P2Y2M") = duration("P26M")', true);

    exprSkip(`
      years and months duration(
       date("2011-12-22"),
       date("2013-08-24")
      ) = duration("P1Y8M")
    `, true);

  });


  describe('Boolean', function() {

    expr('not(null)', null);
    expr('not(true)', false);
    expr('not(false)', true);

  });


  describe('String', function() {

    expr('substring("foobar",3)', 'obar');
    expr('substring("foobar",3,3)', 'oba');
    expr('substring("foobar", -2, 1)', 'a');
    expr('substring("🐎ab", 2)', 'ab');
    expr('substring(null, -2, 1)', null);

    expr('string length("")', 0);
    expr('string length("123")', 3);
    expr('string length("🐎ab")', 3);

    expr('upper case("aBc4")', 'ABC4');

    expr('lower case("aBc4")', 'abc4');

    expr('substring before("foobar", "bar")', 'foo');
    expr('substring before("foo🐎bar", "🐎")', 'foo');
    expr('substring before("foobar", "xyz")', '');

    expr('substring after("foobar", "ob")', 'ar');
    expr('substring after("foo🐎bar", "🐎")', 'bar');
    expr('substring after("", "a")', '');

    expr('replace("abcd", "(ab)|(a)", "[1=$1][2=$2]")', '[1=ab][2=]cd');
    expr('replace("ab🐎cd", "(b.c)", "___")', 'a___d');

    expr('replace("abracadabra","bra","*")', 'a*cada*');
    expr('replace("facetiously","[iouy]","[$0]")', 'facet[i][o][u]sl[y]');
    expr('replace("abc","[A-Z]","#", "i")', '###');

    expr('contains("foobar", "of")', false);
    expr('contains("foobar", "ob")', true);

    expr('starts with("foobar", "fo")', true);

    expr('ends with("foobar", "r")', true);

    expr('split("John Doe", "\\s")', [ 'John', 'Doe' ]);
    expr('split("a;b;c;;", ";")', [ 'a','b','c','','' ]);
    expr('split("foo🐎bar", "o.b")', [ 'fo', 'ar' ]);

  });


  describe('List', function() {

    expr('list contains([1,2,3], 2)', true);
    expr('list contains([ null ], null)', true);
    expr('list contains([ 1 ], null)', false);

    expr('count([1,2,3])', 3);
    expr('count([])', 0);
    expr('count([1,[2,3]])', 2);

    expr('min(1)', 1);
    expr('min([1])', 1);
    expr('min([1,2,3])', 1);
    expr('min([])', null);
    expr('max(1)', 1);
    expr('max([1])', 1);
    expr('max(1,2,3)', 3);
    expr('max([])', null);

    expr('sum([1,2,3])', 6);
    expr('sum(1,2,3)', 6);
    expr('sum(1)', 1);
    expr('sum([])', null);

    expr('mean([1,2,3])', 2);
    expr('mean(1,2,3)', 2);
    expr('mean(1)', 1);
    expr('mean([])', null);

    expr('all([false,null,true])', false);
    expr('all([true, true])', true);
    expr('all(true)', true);
    expr('all([true])', true);
    expr('all([])', true);
    expr('all(0)', null);

    expr('any([false,null,true])', true);
    expr('any([false,false])', false);
    expr('any(false)', false);
    expr('any([])', false);
    expr('any(0)', null);

    expr('sublist([4,5,6], 1, 2)', [ 4,5 ]);
    expr('sublist([4,5,6], -1)', [ 6 ]);
    expr('sublist([4,5,6], -2, 1)', [ 5 ]);

    expr('append([1], 2, 3)', [ 1,2,3 ]);

    expr('concatenate([1,2],[3])', [ 1,2,3 ]);

    expr('insert before([1,3],1,2)', [ 2,1,3 ]);

    expr('remove([1,2,3], 2)', [ 1,3 ]);

    expr('reverse([1,2,3])', [ 3,2,1 ]);

    expr('index of([1,2,3,2],2)', [ 2,4 ]);

    exprSkip('union([1,2],[2,3])', [ 1,2,3 ]);

    exprSkip('distinct values([1,2,3,2,1])', [ 1,2,3 ]);

    expr('flatten([[1,2],[[3]], 4])', [ 1,2,3,4 ]);

    expr('product( 2, 3, 4)', 24);
    expr('product([ 2, 3, 4 ])', 24);

    exprSkip('median( 8, 2, 5, 3, 4 )', 4);
    exprSkip('median( [6, 1, 2, 3] )', 2.5);
    exprSkip('median( [ ] )', null);

    exprSkip('stddev( 2, 4, 7, 5 )', 2.0816659994661);
    exprSkip('stddev( [ 47 ] )', null);
    exprSkip('stddev( 47 )', null);
    exprSkip('stddev( [ ] )', null);

    exprSkip('mode( 6, 3, 9, 6, 6 )', [ 6 ]);
    exprSkip('mode( [6, 1, 9, 6, 1] )', [ 1, 6 ]);
    exprSkip('mode( [ ] )', [ ]);

  });


  describe('Numeric', function() {

    expr('decimal(1/3, 2)', .33);
    expr('decimal(1.5, 0)', 1);

    // TODO(nikku): according to the DMN spec half-even
    // rounding should be used
    // evaluate('decimal(1.5, 0)', 2);
    exprSkip('decimal(2.5, 0)', 2);
    expr('decimal(0.505, 2)', 0.50);
    exprSkip('decimal(0.515, 2)', 0.52);

    expr('floor(1.5)', 1);
    expr('floor(-1.5)', -2);

    expr('ceiling(1.5)', 2);
    expr('ceiling(-1.5)', -1);

    expr('abs( 10 )', 10);
    expr('abs( -10 )', 10);

    // TODO(nikku): support this
    exprSkip('abs(@"PT5H") = @"PT5H"', true);
    exprSkip('abs(@"-PT5H") = @"PT5H"', true);

    expr('modulo( 12, 5 )', 2);
    expr('modulo(-12,5)', 3);
    expr('modulo(12,-5)', -3);
    expr('modulo(-12,-5)', -2);
    expr('modulo(10.1, 4.5)', 1.1);
    expr('modulo(-10.1, 4.5)', 3.4);
    expr('modulo(10.1, -4.5)', -3.4);
    expr('modulo(-10.1, -4.5)', -1.1);

    expr('sqrt( 16 )', 4);
    expr('sqrt( -3 )', null);

    expr('log( 10 )', 2.302585092994046);

    expr('exp( 5 )', 148.4131591025766);

    expr('odd( 5 )', true);
    expr('odd( 2 )', false);

    expr('even( 5 )', false);
    expr('even ( 2 )', true);

  });


  // TODO(nikku): support this
  describe.skip('Date and time', function() {

    expr('is(date("2012-12-25"), time("23:00:50"))', false);
    expr('is(date("2012-12-25"), date("2012-12-25"))', true);
    expr('is(time("23:00:50z"), time("23:00:50"))', false);
    expr('is(time("23:00:50z"), time("23:00:50+00:00"))', false);

  });


  // TODO(nikku): support this
  describe.skip('Range');


  // TODO(nikku): support this
  describe.skip('Temporal');


  // TODO(nikku): support this
  describe.skip('Sort', function() {

    expr('sort()', null);

  });


  describe('Context', function() {

    expr('get value({key1 : "value1"}, "key1")', 'value1');
    expr('get value({key1 : "value1"}, "unexistent-key")', null);

    // TODO(nikku): this should work, according to spec
    // evaluate('get entries({key1: "value1"})[key="key1"].value', 'value1');

    expr('get entries({key1: "value1"})', [ { key: 'key1', value: 'value1' } ]);
    expr('get entries({key1 : "value1", key2 : "value2"})', [
      { key : 'key1', value : 'value1' },
      { key : 'key2', value : 'value2' }
    ]);

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
