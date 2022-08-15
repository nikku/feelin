import { expect } from './helpers.js';

import {
  evaluate
} from '../dist/index.esm.js';


describe('builtin functions', function() {

  describe('Conversion', function() {

    exprSkip('date("2012-12-25") - date("2012-12-24") = duration("P1D")', true);

    expr(`
      date(
        date and time("2012-12-25T11:00:00Z")
      ) = date("2012-12-25")
    `, true);

    expr('date(2012, 12, 25) = date("2012-12-25")', true);

    expr(`
      date(
        from: "2012-12-25"
      ) = date("2012-12-25")
    `, true);

    expr(`
      date and time ("2012-12-24T23:59:00") =
        date and time (
          date("2012-12-24"), time("23:59:00")
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

    expr(`
      time(
        date and time("2012-12-25T11:00:00Z")
      ) = time("11:00:00Z")
    `, true);

    expr(`
      time(
        date and time(
          date and time("2017-08-10T10:20:00"),
          time("23:59:01.987654321")
        )
      ) = time("23:59:01.987654321")
    `, true);

    expr(`
      time(11, 0, 0) = time("11:00:00")
    `, true);

    expr(`
      time(from: "12:45:00") = time("12:45:00")
    `, true);

    exprSkip(`
      time("23:59:00z") =
      time(23, 59, 0, duration("PT0H"))
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

    expr('string(date("2012-12-25"))', '2012-12-25');
    expr('string(date("2018-12-10"))', '2018-12-10');
    exprSkip('string(date and time("2018-12-10"))', '2018-12-10T00:00:00');
    exprSkip('string(date and time("2018-12-10T10:30:00.0001"))', '2018-12-10T10:30:00.0001');
    exprSkip('string(date and time("2018-12-10T10:30:00.0001+05:00:01"))', '2018-12-10T10:30:00.0001+05:00:01');
    expr('string(date and time("2018-12-10T10:30:00@Etc/UTC"))', '2018-12-10T10:30:00@Etc/UTC');
    expr('string(date and time(date and time("2017-09-05T10:20:00@Europe/Paris"),time("09:15:30.987@Europe/Paris")))', '2017-09-05T09:15:30.987@Europe/Paris');
    exprSkip('string(time("10:30:00.0001"))', '10:30:00.0001');
    exprSkip('string(time("10:30:00.0001+05:00:01"))', '10:30:00.0001+05:00:01');
    expr('string(time("10:30:00@Etc/UTC"))', '10:30:00@Etc/UTC');
    expr('string(duration("P1D"))', 'P1D');
    exprSkip('string(duration("-P1D"))', '-P1D');
    expr('string(duration("P0D"))', 'PT0S');
    expr('string(duration("P1DT2H3M4.123S"))', 'P1DT2H3M4.123S');
    expr('string(duration("PT49H"))', 'P2DT1H');
    expr('string(duration("P1Y"))', 'P1Y');
    exprSkip('string(duration("-P1Y"))', '-P1Y');
    exprSkip('string(duration("P0Y"))', 'P0M');
    expr('string(duration("P1Y2M"))', 'P1Y2M');
    expr('string(duration("P25M"))', 'P2Y1M');

    expr('string([1,2,3,"foo"])', '[1, 2, 3, \\"foo\\"]');
    expr('string([1,2,3,[4,5,"foo"]])', '[1, 2, 3, [4, 5, \\"foo\\"]]');
    expr('string(["\\"foo\\""])', '[\\"\\\\\\"foo\\\\\\"\\"]');
    expr('string({a: "foo"})', '{a: \\"foo\\"}');
    expr('string({a: "foo", b: {bar: "baz"}})', '{a: \\"foo\\", b: {bar: \\"baz\\"}}');
    expr('string({"{": "foo"})', '{\\"{\\": \\"foo\\"}');
    expr('string({":": "foo"})', '{\\":\\": \\"foo\\"}');
    expr('string({",": "foo"})', '{\\",\\": \\"foo\\"}');
    expr('string({"}": "foo"})', '{\\"}\\": \\"foo\\"}');
    expr('string({"\\"": "foo"})', '{\\"\\\\\\"\\": \\"foo\\"}');

    exprSkip(`
      date and time("2012-12-24T23:59:00") -
        date and time("2012-12-22T03:45:00") =
        duration("P2DT20H14M")
    `, true);

    expr('duration("P2Y2M") = duration("P26M")', true);

    expr(`
      years and months duration(
        date("2011-12-22"),
        date("2013-08-24")
      ) = duration("P1Y8M")
    `, true);

    expr(`
      date(
        date and time("2017-08-10T10:20:00@Europe/Paris")
      ) = @"2017-08-10"
    `, true);

    expr(`
      years and months duration(
        from:date("2016-01-21"),
        to:date("2015-01-21")
      ) = duration("-P1Y")
    `, true);

    expr(`
      years and months duration(
        from:date and time("2016-01-21T10:20:00"),
        to:date and time("2015-01-21T10:20:00")
      ) = duration("-P1Y")
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
    expr('ends with("ASD", "D")', true);
    expr('ends with(a, "D")', false, { a: '' });

    expr('split("John Doe", "\\s")', [ 'John', 'Doe' ]);
    expr('split("a;b;c;;", ";")', [ 'a','b','c','','' ]);
    expr('split("foo🐎bar", "o.b")', [ 'fo', 'ar' ]);

    expr('split(string: "foo🐎bar", delimiter: "o.b")', [ 'fo', 'ar' ]);

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
    expr('index of([1, 2, 3, 2], 5)', [ ]);

    exprSkip('union([1,2],[2,3])', [ 1,2,3 ]);

    exprSkip('distinct values([1,2,3,2,1])', [ 1,2,3 ]);

    expr('flatten([[1,2],[[3]], 4])', [ 1,2,3,4 ]);

    expr('product( 2, 3, 4)', 24);
    expr('product([ 2, 3, 4 ])', 24);
    expr('product([])', null);

    expr('median( 8, 2, 5, 3, 4 )', 4);
    expr('median( [6, 1, 2, 3] )', 2.5);
    expr('median( [ ] )', null);

    expr('median( list: [6, 1, 2, 3] )', 2.5);

    expr('stddev( 2, 4, 7, 5 )', 2.0816659994661326);
    expr('stddev( [ 47 ] )', null);
    expr('stddev( 47 )', null);
    expr('stddev( [ ] )', null);

    expr('stddev(list:[2, 4, 7, 5])', 2.0816659994661326);
    expr('stddev([2, 4, 7, 5])', 2.0816659994661326);

    expr('mode( 6, 3, 9, 6, 6 )', [ 6 ]);
    expr('mode( [6, 1, 9, 6, 1] )', [ 1, 6 ]);
    expr('mode( [ ] )', [ ]);

    expr('mode( list: [6, 1, 9, 6, 1] )', [ 1, 6 ]);

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
    expr('abs(-1)', 1);
    expr('abs(n: -1)', 1);

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

    expr('modulo(10, 0)', null);
    expr('modulo(10)', null);

    expr('sqrt( 16 )', 4);
    expr('sqrt( -3 )', null);

    expr('log( 10 )', 2.302585092994046);

    expr('log( 0 )', null);
    expr('log( -1 )', null);

    expr('exp( 5 )', 148.4131591025766);

    expr('odd( 5 )', true);
    expr('odd( 2 )', false);
    expr('odd( -1 )', true);

    expr('even( 5 )', false);
    expr('even ( 2 )', true);
    expr('even ( -1 )', false);

  });


  describe('Utility', function() {

    expr('is(1, 1)', true);

    expr('is({ a: 1 }, { a: 1 })', true);

  });


  // 10.3.4 Built-in functions

  describe('Temporals', function() {

    // time
    // date
    // date-time
    // days and time duration
    // years and month duration

    expr('@"2019-03-31" = date("2019-03-31")', true);
    expr('@"2019-03-30" = @"2019-03-31"', false);
    expr('@"2019-03-30" = @"PT01H"', null);

    expr('@"15:00:00" = time("15:00:00")', true);

    expr('@"PT01H" = duration("PT01H")', true);
    expr('@"-PT01H" = duration("-PT01H")', true);

    expr('@"PT01H" = duration("-PT01H")', false);
    expr('@"PT01H" = @"2014-04-02"', null);

    expr('@"2014-12-31T23:59:59" = date and time("2014-12-31T23:59:59")', true);

    expr('is(date("2012-12-25"), time("23:00:50"))', null);
    expr('is(date("2012-12-25"), @"2012-12-25")', true);
    expr('is(date("2011-12-25"), @"2012-12-25")', false);

    expr('is(time("23:00:50z"), time("23:00:50+00:00"))', true);
    expr('is(time("23:00:50z"), time("23:00:50+01:30"))', false);
    expr('is(time("23:00:50z"), time("23:00:50+01:00"))', false);

    expr(`
      years and months duration(
        from:date("2016-01-21"),
        to:date("2015-01-21")
      ) = duration("-P1Y")
    `, true);

    expr(`
      years and months duration(
        @"2016-01-21",
        @"2015-01-21"
      ) = duration("-P1Y")
    `, true);

    expr('duration("-P1Y") = duration("-P365D")', true);

    expr(`
      date and time(
        "2016-01-21"
      ) = date and time("2016-01-21T00:00:00z")
    `, true);

    expr(`
      date and time(
        date("2016-01-21"), time("03:01:00+01:00")
      ) = date and time("2016-01-21T03:01:00+01:00")
    `, true);

    expr(`
      date("2016-01-15") = date(2016, 1, 15)
    `, true);

    expr(`
      date(2016, 1, 15) = date and time("2016-01-15T00:00:00z")
    `, true);

    expr(`
      today() = date and time(now(), @"00:00:00")
    `, true);


    describe('properties', function() {

      exprSkip('duration("P1D").months', null);
      exprSkip('duration("P1D").years', null);
      exprSkip('duration("P1Y").minutes', null);
      exprSkip('duration("P1Y").hours', null);

      exprSkip('time("10:30:00+05:00").time offset', 'duration("PT5H")');
      exprSkip('date and time("2018-12-10T10:30:00+05:00").time offset', 'duration("PT5H")');

    });


    describe('ranges', function() {

      exprSkip('duration("P5D") in (duration("P4D"), >=duration("P6D"))', true);

      exprSkip(`
        date and time("2018-12-08T10:30:02") in [
          date and time("2018-12-08T10:30:02")
          ..
          date and time("2018-12-08T10:30:04")
        ]
      `, true);

      exprSkip(`
        time("10:30:05") in (time("10:30:04"), >=time("10:30:05"))
      `, true);

      exprSkip(`
        date("2018-12-02") between date("2018-12-02") and date("2018-12-04")
      `, true);

    });

  });


  describe('Range', function() {

    expr('meets([0..5], [5..10])', true);
    expr('meets([0..5), [5..10])', false);
    expr('meets([0..5], [4..10])', false);

    expr('before( 1, 10 )', true);
    expr('before( 10, 1 )', false);
    expr('before( [1..10], 10 )', false);
    expr('before( 1, (1..10] )', true);
    expr('before( [1..10), [10..20] )', true);
  });


  // TODO(nikku): support this
  describe.skip('Temporal');


  // TODO(nikku): support this
  describe.skip('Sort', function() {

    expr('sort()', null);

  });


  describe('Context', function() {

    expr('get value({key1 : "value1"}, "key1")', 'value1');
    expr('get value({key1 : "value1"}, "unexistent-key")', null);

    expr('get value(key:"a", m:{a: "foo"}) = "foo"', true);

    // TODO(nikku): this should work, according to spec
    // evaluate('get entries({key1: "value1"})[key="key1"].value', 'value1');

    expr('get entries({key1: "value1"})', [ { key: 'key1', value: 'value1' } ]);
    expr('get entries({key1 : "value1", key2 : "value2"})', [
      { key : 'key1', value : 'value1' },
      { key : 'key2', value : 'value2' }
    ]);

    expr(`
      get entries(m:{a: "foo", b: "bar"}) = [{"key": "a", "value":"foo"},{"key":"b", "value":"bar"}]
    `, true);

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
