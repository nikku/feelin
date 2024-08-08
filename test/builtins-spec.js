import { expect } from './helpers.js';

import {
  inspect
} from 'node:util';

import {
  evaluate
} from '../dist/index.esm.js';


describe('builtin functions', function() {

  describe('Conversion', function() {

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

    expr(`
      number("1 000,0", " ", ",") =
      number("1,000.0", ",", ".")
    `, true);

    expr('number("1,000,000", ",", null)', 1000000);
    expr('number("1000000.01", null, ".")', 1000000.01);

    expr('number("1.000.000,01", ".")', null);

    expr('number(from: "1,000,000", grouping separator: ",", decimal separator: ".")', 1000000);

    expr('string(1.1)', '1.1');
    expr('string(null)', null);
    expr('string("foo")', 'foo');
    expr('string(123.45)', '123.45');
    expr('string(true)', 'true');
    expr('string(false)', 'false');

    expr('string(date("2012-12-25"))', '2012-12-25');
    expr('string(date("2018-12-10"))', '2018-12-10');
    expr('string(date and time("2018-12-10"))', '2018-12-10T00:00:00');
    exprSkip('string(date and time("2018-12-10T10:30:00.0001"))', '2018-12-10T10:30:00.0001');
    exprSkip('string(date and time("2018-12-10T10:30:00.0001+05:00:01"))', '2018-12-10T10:30:00.0001+05:00:01');
    expr('string(date and time("2018-12-10T10:30:00@Etc/UTC"))', '2018-12-10T10:30:00@Etc/UTC');
    expr('string(date and time("2018-12-10T10:30:00Z"))', '2018-12-10T10:30:00Z');
    expr('string(date and time(date and time("2017-09-05T10:20:00@Europe/Paris"),time("09:15:30.987@Europe/Paris")))', '2017-09-05T09:15:30.987@Europe/Paris');
    exprSkip('string(time("10:30:00.0001"))', '10:30:00.0001');
    exprSkip('string(time("10:30:00.0001+05:00:01"))', '10:30:00.0001+05:00:01');
    expr('string(time("10:30:00"))', '10:30:00');
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

    expr('string([1,2,3,"foo"])', '[1, 2, 3, "foo"]');
    expr('string([1,2,3,[4,5,"foo"]])', '[1, 2, 3, [4, 5, "foo"]]');
    expr('string(["\\"foo\\""])', '["\\"foo\\""]');
    expr('string({a: "foo"})', '{a: "foo"}');
    expr('string({a: "foo", b: {bar: "baz"}})', '{a: "foo", b: {bar: "baz"}}');
    expr('string({"{": "foo"})', '{"{": "foo"}');
    expr('string({":": "foo"})', '{":": "foo"}');
    expr('string({",": "foo"})', '{",": "foo"}');
    expr('string({"}": "foo"})', '{"}": "foo"}');
    expr('string({"\\"": "foo"})', '{"\\"": "foo"}');
    expr('string("\\"")', '"');
    expr('string("\\\\\\"")', '\\"');
    expr('string("\\\\")', '\\');

    expr('string({"{": "foo"}) = "{\\"{\\": \\"foo\\"}"', true);
    expr('string({"\\"": "foo"}) = "{\\"\\\\\\"\\": \\"foo\\"}"', true);

    expr('string([1 .. 3])', '<range>');
    expr('string(function(a) a)', '<function>');
    expr('string(< 10)', '<range>');

    expr(`string({
      "aa +    b": 1,
      a +    1: false
    })`, '{"aa +    b": 1, "a + 1": false}');

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
    expr('string length(string(["\\"foo\\""]))', 11);

    expr('upper case("aBc4")', 'ABC4');

    expr('lower case("aBc4")', 'abc4');

    expr('substring before("foobar", "bar")', 'foo');
    expr('substring before("foo🐎bar", "🐎")', 'foo');
    expr('substring before("foobar", "xyz")', '');

    expr('substring after("foobar", "ob")', 'ar');
    expr('substring after("foo🐎bar", "🐎")', 'bar');
    expr('substring after("", "a")', '');

    expr('replace(input:"abc",pattern:"[A-Z]",replacement:"#",flags:"i")', '###');

    expr('replace("abcd", "(ab)|(a)", "[1=$1][2=$2]")', '[1=ab][2=]cd');
    expr('replace("ab🐎cd", "(b.c)", "___")', 'a___d');

    expr('replace("abracadabra","bra","*")', 'a*cada*');
    expr('replace("facetiously","[iouy]","[$0]")', 'facet[i][o][u]sl[y]');
    expr('replace("abc","[A-Z]","#", "i")', '###');

    expr('replace("ab","AB","CD","i")', 'CD');
    expr('replace("ab","ab","CD", null)', 'CD');
    expr('replace("ab","ab","CD", "")', 'CD');
    expr('replace("a\\na",".","x","s")', 'xxx');
    expr('replace("a\\na\\nb\\na","^a$", "CD", "m")', 'CD\nCD\nb\nCD');

    expr('replace("ab","AB","CD","u")', null);
    expr('replace("ab","AB","CD","g")', null);
    expr('replace("ab","AB","CD","y")', null);

    expr('matches("abab", "ab")', true);
    expr('matches("abc", "abc")', true);

    expr('matches("abc", "abc", "u")', null);
    expr('matches("abc", "abc", "g")', null);
    expr('matches("abc", "abc", "y")', null);

    expr('matches("123", "\\d+", "")', true);
    expr('matches("😀", "\\u{1F600}")', true);

    expr('matches("abc", "abc", "")', true);
    expr('matches("\\n", ".", "s")', true);
    expr('matches("abab", "^ab", "m")', true);
    expr('matches("ABC", "abc", "i")', true);
    expr('matches("abc", "abc", null)', true);

    exprSkip('matches("hello world", "hello\\ sworld", "x")', true);

    expr('matches("cat or dog", "cat|dog|fish")', true);
    expr('matches("a123b456", "a.*?b")', true);
    expr('matches("foobar", "^fo*b")', true);

    expr('matches("abcd", "(asd)[\\1]")', null);
    exprSkip('matches("abcd", "(asd)[asd\\0]")', null);
    exprSkip('matches("abcd", "1[asd\\0]")', null);

    expr('matches("bad pattern","[0-9")', null);

    expr('matches(input:"abc",pattern:"[A-Z]", flags:"i")', true);

    expr('matches(a, "^$", "m")', true, { a: '\nabcd\ndefg\n' });
    expr('matches("\\nabcd", "^$", "m")', true);
    expr('matches("abcd\\n", "^$", "m")', true);
    expr('matches("abcd\\n\\ndefg", "^$", "m")', true);
    expr('matches("a\\n\\nb", "^$", "m")', true);

    exprSkip('matches("x", "[A-Z-[OI]]", "i")', true);
    exprSkip('matches("X", "[A-Z-[OI]]", "i")', true);
    exprSkip('matches("O", "[A-Z-[OI]]", "i")', false);
    exprSkip('matches("i", "[A-Z-[OI]]", "i")', false);

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

    expr('split("foo bar", "[a-z")', null);

    expr('string join(123, "X")', null);

    expr('string join(123, "X")', null);
    expr('string join(null, "X")', null);
    expr('string join([1, 2, 3])', null);
    expr('string join(["a","c"], "X", "foo")', null);
    expr('string join(list: ["a","c"], delimitr: "X")', null);

    expr('string join(list: ["a","c"])', 'ac');
    expr('string join([])', '');
    expr('string join(["a",null,"c"], "X")', 'aXc');
    expr('string join(["a","b","c"], null)', 'abc');

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

    expr('union([1,2],[2,3])', [ 1,2,3 ]);

    expr('union(["a", "b"],["a", "c"])', [ 'a', 'b', 'c' ]);
    expr('union([null, { a: 1 }],[null, { a: 1}])', [ null, { a : 1 } ]);

    expr('distinct values([1,2,3,2,1])', [ 1,2,3 ]);

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

    expr('sort(list: [3,1,4,5,2], precedes: function(x,y) x < y)', [ 1,2,3,4,5 ]);

    expr('sort([3,1,4,5,2], function(x,y) x < y)', [ 1,2,3,4,5 ]);

    expr('list replace( [2, 4, 7, 8], 3, 6)', [ 2, 4, 6, 8 ]);

    expr('list replace(list: [2, 4, 7, 8], position: 3, newItem: 6)', [ 2, 4, 6, 8 ]);

    expr('list replace ( [2, 4, 7, 8], function(item, newItem) item < newItem, 5)', [ 5, 5, 7, 8 ]);
    expr('list replace(list: [2, 4, 7, 8], match: function(item, newItem) item < newItem, newItem: 5)', [ 5, 5, 7, 8 ]);

  });


  describe('Numeric', function() {

    expr('decimal(1/3, 2)', .33);
    expr('decimal(0.267, 2)', .27);
    expr('decimal(1.5, 0)', 2);
    expr('decimal(2.5, 0)', 2);
    expr('decimal(-1.5, 0)', -2);
    expr('decimal(-2.5, 0)', -2);
    expr('decimal(0.505, 2)', 0.50);
    expr('decimal(0.515, 2)', 0.52);
    expr('decimal(-0.505, 2)', -0.50);
    expr('decimal(-0.515, 2)', -0.52);
    expr('decimal(1.5, null)', null);
    expr('decimal(null, 2)', null);

    expr('floor(1.5)', 1);
    expr('floor(-1.5)', -2);
    expr('floor(1.56, 1)',1.5);
    expr('floor(-1.56, 1)',-1.6);
    expr('floor(1.56, null)', null);
    expr('floor(1.56, "1")', null);

    expr('ceiling(1.5)', 2);
    expr('ceiling(-1.5)', -1);
    expr('ceiling(1.56, 1)', 1.6);
    expr('ceiling(-1.56, 1)', -1.5);
    expr('ceiling(1.56, null)', null);
    expr('ceiling(1.56, "1")', null);

    expr('round up(5.5, 0)', 6);
    expr('round up(-5.5, 0)', -6);
    expr('round up(1.121, 2)', 1.13);
    expr('round up(-1.126, 2)', -1.13);
    expr('round up(null, 2)', null);
    expr('round up(1.121, null)', null);

    expr('round down(5.5, 0)', 5);
    expr('round down(-5.5, 0)', -5);
    expr('round down(1.121, 2)', 1.12);
    expr('round down(-1.126, 2)', -1.12);
    expr('round down(null, 2)', null);
    expr('round down(1.121, null)', null);

    expr('round half up(5.5, 0)', 6);
    expr('round half up(-5.5, 0)', -6);
    expr('round half up(1.121, 2)', 1.12);
    expr('round half up(-1.126, 2)', -1.13);
    expr('round half up(null, 2)', null);
    expr('round half up(1.121, null)', null);

    expr('round half down(5.5, 0)', 5);
    expr('round half down(-5.5, 0)', -5);
    expr('round half down(1.121, 2)', 1.12);
    expr('round half down(-1.126, 2)', -1.13);
    expr('round half down(null, 2)', null);
    expr('round half down(1.121, null)', null);

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

    expr('is(value1: @"2021-02-13")', false);
    expr('is(value2: @"2021-02-13")', false);

    expr('is({ a: 1 }, null)', false);

    expr('is(value1: true)', false);

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
    expr('@"15:00:00z" = time("15:00:00z")', true);
    expr('@"15:00:00" = time("15:00:00z")', false);

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

    exprSkip('is(@"2012-12-25", @"2012-12-25T00:00:00Z")', null);
    exprSkip('is(@"2012-12-25", @"2012-12-25T00:00:00")', true);

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

    expr('date and time("2012-12-24") = date and time("2012-12-24T00:00:00")', true);

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

    expr('date(1)', null);
    exprSkip('date(2017,8,-2)', null);
    exprSkip('date(2017,-8,2)', null);
    exprSkip('date(2017,12,32)', null);
    exprSkip('date(2017,13,31)', null);
    exprSkip('date(2016, 1, 15, 100)', null);

    expr('date("")', null);
    expr('date(2017,null,1)', null);
    expr('date(2017,1,null)', null);
    expr('date(2017,null,null)', null);

    expr('time("")', null);
    expr('time(12,null,null,null)', null);
    expr('time(12,11,null,null)', null);

    expr(`
      today() = date and time(now(), @"00:00:00")
    `, true);

    expr('day of year(@"2016-01-15")', 15);
    expr('day of year(@"2016-11-15")', 320);
    expr('day of year(date: @"2016-11-15")', 320);
    expr('day of year(date: 1)', null);

    expr('day of week(@"2016-01-15")', 'Friday');
    expr('day of week(@"2016-11-15")', 'Tuesday');
    expr('day of week(date: @"2016-11-15")', 'Tuesday');
    expr('day of week(date: 1)', null);

    expr('month of year(@"2016-01-15")', 'January');
    expr('month of year(@"2016-11-15")', 'November');
    expr('month of year(date: @"2016-11-15")', 'November');
    expr('month of year(date: 1)', null);

    expr('week of year(@"2016-01-15")', 2);
    expr('week of year(@"2016-11-15")', 46);
    expr('week of year(date: @"2016-11-15")', 46);
    expr('week of year(date: 1)', null);

    expr('date("2020-04-06") + duration("P1D") = date("2020-04-07")', true);
    expr('duration("P1D") + date("2020-04-06") = date("2020-04-07")', true);
    expr('time("08:00:00") + duration("PT1H") = time("09:00:00")', true);
    expr('duration("PT1H") + time("08:00:00") = time("09:00:00")', true);
    expr('date and time("2020-04-06T08:00:00") + duration("P7D") = date and time("2020-04-13T08:00:00")', true);
    expr('duration("P7D") + date and time("2020-04-06T08:00:00") = date and time("2020-04-13T08:00:00")', true);
    expr('duration("P2D") + duration("P5D") = duration("P7D")', true);


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

      expr(`
        date and time("2018-12-08T10:30:01") in [
          date and time("2018-12-08T10:30:02")
          ..
          date and time("2018-12-08T10:30:04")
        ]
      `, false);
      expr(`
        date and time("2018-12-08T10:30:02") in [
          date and time("2018-12-08T10:30:02")
          ..
          date and time("2018-12-08T10:30:04")
        ]
      `, true);
      expr(`
        date and time("2018-12-08T10:30:03") in [
          date and time("2018-12-08T10:30:02")
          ..
          date and time("2018-12-08T10:30:04")
        ]
      `, true);
      expr(`
        date and time("2018-12-08T10:30:04") in [
          date and time("2018-12-08T10:30:02")
          ..
          date and time("2018-12-08T10:30:04")
        ]
      `, true);
      expr(`
        date and time("2018-12-08T10:30:05") in [
          date and time("2018-12-08T10:30:02")
          ..
          date and time("2018-12-08T10:30:04")
        ]
      `, false);

      expr('time("10:30:03") in (time("10:30:04"), >=time("10:30:05"))', false);
      expr('time("10:30:05") in (time("10:30:04"), >=time("10:30:05"))', true);

      expr('date("2018-12-01") between date("2018-12-02") and date("2018-12-04")', false);
      expr('date("2018-12-02") between date("2018-12-02") and date("2018-12-04")', true);
      expr('date("2018-12-03") between date("2018-12-02") and date("2018-12-04")', true);
      expr('date("2018-12-04") between date("2018-12-02") and date("2018-12-04")', true);
      expr('date("2018-12-05") between date("2018-12-02") and date("2018-12-04")', false);

      expr('date("2018-12-01") in [date("2018-12-02") .. date("2018-12-04")]', false);
      expr('date("2018-12-02") in [date("2018-12-02") .. date("2018-12-04")]', true);
      expr('date("2018-12-03") in [date("2018-12-02") .. date("2018-12-04")]', true);
      expr('date("2018-12-04") in [date("2018-12-02") .. date("2018-12-04")]', true);
      expr('date("2018-12-05") in [date("2018-12-02") .. date("2018-12-04")]', false);

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

    expr('overlaps( [1..5], [3..8] )', true);
    expr('overlaps( [3..8], [1..5] )', true);
    expr('overlaps( [1..8], [3..5] )', true);
    expr('overlaps( [3..5], [1..8] )', true);
    expr('overlaps( [1..5], [6..8] )', false);
    expr('overlaps( [6..8], [1..5] )', false);
    expr('overlaps( [1..5], [5..8] )', true);
    expr('overlaps( [1..5], (5..8] )', false);
    expr('overlaps( [1..5), [5..8] )', false);
    expr('overlaps( [1..5), (5..8] )', false);
    expr('overlaps( [5..8], [1..5] )', true);
    expr('overlaps( (5..8], [1..5] )', false);
    expr('overlaps( [5..8], [1..5) )', false);
    expr('overlaps( (5..8], [1..5) )', false);
  });


  describe('Context', function() {

    expr('get value({key1 : "value1"}, "key1")', 'value1');
    expr('get value({key1 : 0}, "key1")', 0);
    expr('get value({key1 : false}, "key1")', false);
    expr('get value({key1 : "value1"}, "unexistent-key")', null);
    expr('get value({key+    +1 : "value1"}, "key + + 1")', 'value1');

    expr('get value(key:"a", m:{a: "foo"}) = "foo"', true);

    expr('get entries({key1: "value1"})[key="key1"].value', [ 'value1' ]);

    expr('get entries({key1: "value1"})', [ { key: 'key1', value: 'value1' } ]);
    expr('get entries({key1 : "value1", key2 : "value2"})', [
      { key : 'key1', value : 'value1' },
      { key : 'key2', value : 'value2' }
    ]);

    expr(`
      get entries(m:{a: "foo", b: "bar"}) = [{"key": "a", "value":"foo"},{"key":"b", "value":"bar"}]
    `, true);

    expr('context([ { key: "a", value: 1 }, { key: "b", value: 2 } ])', { a: 1, b: 2 });

    expr('context()', null);
    expr('context(123)', null);
    expr('context("123")', null);
    expr('context({ key: "a" })', null);
    expr('context({ value: "a" })', null);

    expr('context(entries: [{key:"a", value:1}])', { 'a':1 });
    expr('context(entries: {key:"a", value:1})', { 'a':1 });

    expr('context merge([{x:1}, {y:2}])', { x:1, y:2 });
    expr('context merge([{x:1, y:0}, {y:2}])', { x:1, y:2 });

    expr('context put({x:1}, "y", 2)', { x:1, y:2 });
    expr('context put(context: {x:1}, key: "y", value: 2)', { x:1, y:2 });
    expr('context put({x:1,y:0}, "y", 2)', { x:1, y:2 });
    expr('context put({x:1, y:0, z:0}, "y", 2)', { x:1, y:2, z:0 });

    expr('context put({}, "a", null)', { 'a': null });
    expr('context put({}, "a")', null);
    expr('context put({}, 1, 1)', null);
    expr('context put({x:1 }, [null], 2)', null);
    expr('context put({x:1, y: {a: 0} }, ["y", null], 2)', null);

    expr('context put({x:1}, ["y"], 2)', { x:1, y:2 });
    expr('context put(context: {x:1}, keys: ["y"], value: 2)', { x:1, y:2 });

    expr('context put({x:1, y: {a: 0} }, ["y", "a"], 2)', { x:1, y: { a: 2 } });
    expr('context put({x:1, y: {a: 0} }, [], 2)', null);

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

  const name = `${expression}${context ? ` ${ inspect(context) }` : ''}`;

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
