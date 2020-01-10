import { expect } from 'chai';

import { interpreter } from '../src/interpreter';


describe('builtin functions', function() {

  describe('Conversion', function() {

    evaluateSkip('date("2012-12-25") – date("2012-12-24") = duration("P1D")', true);

    evaluateSkip(`
      date(
        date and time("2012-12-25T11:00:00Z")
      ) = date("2012-12-25")
    `, true);

    evaluateSkip('date(2012, 12, 25) = date("2012-12-25")', true);

    evaluateSkip(`
      date and time ("2012-12-24T23:59:00") =
        date and time (
          date("2012-12-24”), time(“23:59:00")
        )
    `, true);

    evaluateSkip(`
      date and time("2012-12-24T23:59:00") + duration("PT1M") =
      date and time("2012-12-25T00:00:00")
    `, true);

    evaluateSkip(`
      time("23:59:00z") + duration("PT2M") =
      time("00:01:00@Etc/UTC")
    `, true);

    evaluateSkip(`
      time(
        date and time("2012-12-25T11:00:00Z")
      ) = time("11:00:00Z")
    `, true);

    evaluateSkip(`
      time(“23:59:00z") =
      time(23, 59, 0, duration(“PT0H”))
    `, true);

    evaluateSkip(`
      number("1 000,0", " ", ",") =
      number("1,000.0", ",", ".")
    `, true);

    evaluate('string(1.1)', '1.1');
    evaluate('string(null)', null);
    evaluate('string("foo")', 'foo');
    evaluate('string(123.45)', '123.45');
    evaluate('string(true)', 'true');
    evaluate('string(false)', 'false');
    evaluateSkip('string(date("2012-12-25"))', '2012-12-25');

    evaluateSkip('string(date("2018-12-10"))', '2018-12-10');
    evaluateSkip('string(date and time("2018-12-10"))', '2018-12-10T00:00:00');
    evaluateSkip('string(date and time("2018-12-10T10:30:00.0001"))', '2018-12-10T10:30:00.0001');
    evaluateSkip('string(date and time("2018-12-10T10:30:00.0001+05:00:01"))', '2018-12-10T10:30:00.0001+05:00:01');
    evaluateSkip('string(date and time("2018-12-10T10:30:00@Etc/UTC"))', '2018-12-10T10:30:00@Etc/UTC');
    evaluateSkip('string(time("10:30:00.0001"))', '10:30:00.0001');
    evaluateSkip('string(time("10:30:00.0001+05:00:01"))', '10:30:00.0001+05:00:01');
    evaluateSkip('string(time("10:30:00@Etc/UTC"))', '10:30:00@Etc/UTC');
    evaluateSkip('string(duration("P1D"))', 'P1D');
    evaluateSkip('string(duration("-P1D"))', '-P1D');
    evaluateSkip('string(duration("P0D"))', 'PT0S');
    evaluateSkip('string(duration("P1DT2H3M4.1234S"))', 'P1DT2H3M4.1234S');
    evaluateSkip('string(duration("PT49H"))', 'P2DT1H');
    evaluateSkip('string(duration("P1Y"))', 'P1Y');
    evaluateSkip('string(duration("-P1Y"))', '-P1Y');
    evaluateSkip('string(duration("P0Y"))', 'P0M');
    evaluateSkip('string(duration("P1Y2M"))', 'P1Y2M');
    evaluateSkip('string(duration("P25M"))', 'P2Y1M');
    evaluate('string([1,2,3,"foo"])', '[1, 2, 3, "foo"]');
    evaluate('string([1,2,3,[4,5,"foo"]])', '[1, 2, 3, [4, 5, "foo"]]');
    evaluateSkip('string(["\\"foo\\""])', '["\\"foo\\"]');
    evaluate('string({a: "foo"})', '{a: "foo"}');
    evaluate('string({a: "foo", b: {bar: "baz"}})', '{a: "foo", b: {bar: "baz"}}');
    evaluate('string({"{": "foo"})', '{"{": "foo"}');
    evaluate('string({":": "foo"})', '{":": "foo"}');
    evaluate('string({",": "foo"})', '{",": "foo"}');
    evaluate('string({"}": "foo"})', '{"}": "foo"}');
    evaluateSkip('string({"\\"": "foo"})', '{"\\": "foo"}');

    evaluateSkip(`
      date and time("2012-12-24T23:59:00") -
        date and time("2012-12-22T03:45:00") =
        duration("P2DT20H14M")
    `, true);

    evaluateSkip('duration("P2Y2M") = duration("P26M")', true);

    evaluateSkip(`
      years and months duration(
       date("2011-12-22"),
       date("2013-08-24")
      ) = duration("P1Y8M")
    `, true);

  });


  describe('Boolean', function() {

    evaluate('not(null)', null);
    evaluate('not(true)', false);
    evaluate('not(false)', true);

  });


  describe('String', function() {

    evaluate('substring("foobar",3)', 'obar');
    evaluate('substring("foobar",3,3)', 'oba');
    evaluate('substring("foobar", -2, 1)', 'a');
    evaluate('substring("🐎ab", 2)', 'ab');
    evaluate('substring(null, -2, 1)', null);

    evaluate('string length("")', 0);
    evaluate('string length("123")', 3);
    evaluate('string length("🐎ab")', 3);

    evaluate('upper case("aBc4")', 'ABC4');

    evaluate('lower case("aBc4")', 'abc4');

    evaluate('substring before("foobar", "bar")', 'foo');
    evaluate('substring before("foo🐎bar", "🐎")', 'foo');
    evaluate('substring before("foobar", "xyz")', '');

    evaluate('substring after("foobar", "ob")', 'ar');
    evaluate('substring after("foo🐎bar", "🐎")', 'bar');
    evaluate('substring after("", "a")', '');

    evaluate('replace("abcd", "(ab)|(a)", "[1=$1][2=$2]")', '[1=ab][2=]cd');
    evaluate('replace("ab🐎cd", "(b.c)", "___")', 'a___d');

    evaluate('replace("abracadabra","bra","*")', 'a*cada*');
    evaluate('replace("facetiously","[iouy]","[$0]")', 'facet[i][o][u]sl[y]');
    evaluate('replace("abc","[A-Z]","#", "i")', '###');

    evaluate('contains("foobar", "of")', false);
    evaluate('contains("foobar", "ob")', true);

    evaluate('starts with("foobar", "fo")', true);

    evaluate('ends with("foobar", "r")', true);

    evaluate('split("John Doe", "\\s")', ['John', 'Doe']);
    evaluate('split("a;b;c;;", ";")', ['a','b','c','','']);
    evaluate('split("foo🐎bar", "o.b")', ['fo', 'ar']);

  });


  describe('List', function() {

    evaluate('list contains([1,2,3], 2)', true);
    evaluate('list contains([ null ], null)', true);
    evaluate('list contains([ 1 ], null)', false);

    evaluate('count([1,2,3])', 3);
    evaluate('count([])', 0);
    evaluate('count([1,[2,3]])', 2);

    evaluate('min(1)', 1);
    evaluate('min([1])', 1);
    evaluate('min([1,2,3])', 1);
    evaluate('min([])', null);
    evaluate('max(1)', 1);
    evaluate('max([1])', 1);
    evaluate('max(1,2,3)', 3);
    evaluate('max([])', null);

    evaluate('sum([1,2,3])', 6);
    evaluate('sum(1,2,3)', 6);
    evaluate('sum(1)', 1);
    evaluate('sum([])', null);

    evaluate('mean([1,2,3])', 2);
    evaluate('mean(1,2,3)', 2);
    evaluate('mean(1)', 1);
    evaluate('mean([])', null);

    evaluate('all([false,null,true])', false);
    evaluate('all([true, true])', true);
    evaluate('all(true)', true);
    evaluate('all([true])', true);
    evaluate('all([])', true);
    evaluate('all(0)', null);

    evaluate('any([false,null,true])', true);
    evaluate('any([false,false])', false);
    evaluate('any(false)', false);
    evaluate('any([])', false);
    evaluate('any(0)', null);

    evaluate('sublist([4,5,6], 1, 2)', [4,5]);
    evaluate('sublist([4,5,6], -1)', [6]);
    evaluate('sublist([4,5,6], -2, 1)', [5]);

    evaluate('append([1], 2, 3)', [1,2,3]);

    evaluate('concatenate([1,2],[3])', [1,2,3]);

    evaluate('insert before([1,3],1,2)', [2,1,3]);

    evaluate('remove([1,2,3], 2)', [1,3]);

    evaluate('reverse([1,2,3])', [3,2,1]);

    evaluate('index of([1,2,3,2],2)', [2,4]);

    evaluateSkip('union([1,2],[2,3])', [1,2,3]);

    evaluateSkip('distinct values([1,2,3,2,1])', [1,2,3]);

    evaluate('flatten([[1,2],[[3]], 4])', [1,2,3,4]);

    evaluate('product( 2, 3, 4)', 24);
    evaluate('product([ 2, 3, 4 ])', 24);

    evaluateSkip('median( 8, 2, 5, 3, 4 )', 4);
    evaluateSkip('median( [6, 1, 2, 3] )', 2.5);
    evaluateSkip('median( [ ] )', null);

    evaluateSkip('stddev( 2, 4, 7, 5 )', 2.0816659994661);
    evaluateSkip('stddev( [ 47 ] )', null);
    evaluateSkip('stddev( 47 )', null);
    evaluateSkip('stddev( [ ] )', null);

    evaluateSkip('mode( 6, 3, 9, 6, 6 )', [ 6 ]);
    evaluateSkip('mode( [6, 1, 9, 6, 1] )', [ 1, 6 ]);
    evaluateSkip('mode( [ ] )', [ ]);

  });


  describe('Numeric', function() {

    evaluate('decimal(1/3, 2)', .33);
    evaluate('decimal(1.5, 0)', 1);

    // TODO(nikku): according to the DMN spec half-even
    // rounding should be used
    // evaluate('decimal(1.5, 0)', 2);
    evaluateSkip('decimal(2.5, 0)', 2);
    evaluate('decimal(0.505, 2)', 0.50);
    evaluateSkip('decimal(0.515, 2)', 0.52);

    evaluate('floor(1.5)', 1);
    evaluate('floor(-1.5)', -2);

    evaluate('ceiling(1.5)', 2);
    evaluate('ceiling(-1.5)', -1);

    evaluate('abs( 10 )', 10);
    evaluate('abs( -10 )', 10);

    // TODO(nikku): support this
    evaluateSkip('abs(@"PT5H") = @"PT5H"', true);
    evaluateSkip('abs(@"-PT5H") = @"PT5H"', true);

    evaluate('modulo( 12, 5 )', 2);
    evaluate('modulo(-12,5)', 3);
    evaluate('modulo(12,-5)', -3);
    evaluate('modulo(-12,-5)', -2);
    evaluate('modulo(10.1, 4.5)', 1.1);
    evaluate('modulo(-10.1, 4.5)', 3.4);
    evaluate('modulo(10.1, -4.5)', -3.4);
    evaluate('modulo(-10.1, -4.5)', -1.1);

    evaluate('sqrt( 16 )', 4);
    evaluate('sqrt( -3 )', null);

    evaluate('log( 10 )', 2.302585092994046);

    evaluate('exp( 5 )', 148.4131591025766);

    evaluate('odd( 5 )', true);
    evaluate('odd( 2 )', false);

    evaluate('even( 5 )', false);
    evaluate('even ( 2 )', true);

  });


  // TODO(nikku): support this
  describe.skip('Date and time', function() {

    evaluate('is(date("2012-12-25"), time("23:00:50"))', false);
    evaluate('is(date("2012-12-25"), date("2012-12-25"))', true);
    evaluate('is(time("23:00:50z"), time("23:00:50"))', false);
    evaluate('is(time("23:00:50z"), time("23:00:50+00:00"))', false);

  });


  // TODO(nikku): support this
  describe.skip('Range', function() {

  });


  // TODO(nikku): support this
  describe.skip('Temporal', function() {

  });


  // TODO(nikku): support this
  describe.skip('Sort', function() {

    evaluate('sort()', null);

  });


  describe('Context', function() {

    evaluate('get value({key1 : "value1"}, "key1")', 'value1');
    evaluate('get value({key1 : "value1"}, "unexistent-key")', null);

    // TODO(nikku): this should work, according to spec
    // evaluate('get entries({key1: "value1"})[key="key1"].value', 'value1');

    evaluate('get entries({key1: "value1"})', [ { key: 'key1', value: 'value1' } ]);
    evaluate('get entries({key1 : "value1", key2 : "value2"})', [
      { key : 'key1', value : 'value1' },
      { key : 'key2', value : 'value2' }
    ]);

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
function evaluateSkip(...args) {
  return createEvalVerifier({
    args,
    it: it.skip
  });
}
