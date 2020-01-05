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
    evaluateSkip('string(date("2012-12-25"))', '2012-12-25');

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
    evaluate('substring(null, -2, 1)', null);

    evaluate('string length("")', 0);
    evaluate('string length("123")', 3);

    evaluate('upper case("aBc4")', 'ABC4');

    evaluate('lower case("aBc4")', 'abc4');

    evaluate('substring before("foobar", "bar")', 'foo');
    evaluate('substring before("foobar", "xyz")', '');

    evaluate('substring after("foobar", "ob")', 'ar');
    evaluate('substring after("", "a")', '');

    evaluate('replace("abcd", "(ab)|(a)", "[1=$1][2=$2]")', '[1=ab][2=]cd');

    evaluate('contains("foobar", "of")', false);
    evaluate('contains("foobar", "ob")', true);

    evaluate('starts with("foobar", "fo")', true);

    evaluate('ends with("foobar", "r")', true);

    evaluate('split("John Doe", "\\s")', ['John', 'Doe']);
    evaluate('split("a;b;c;;", ";")', ['a','b','c','','']);

  });


  describe.skip('List', function() {

    evaluate('list contains()', null);

    evaluate('count()', null);

    evaluate('min()', null);

    evaluate('max()', null);

    evaluate('sum()', null);

    evaluate('mean()', null);

    evaluate('all()', null);

    evaluate('any()', null);

    evaluate('sublist()', null);

    evaluate('append()', null);

    evaluate('concatenate()', null);

    evaluate('insert before()', null);

    evaluate('remove()', null);

    evaluate('reverse()', null);

    evaluate('index of()', null);

    evaluate('union()', null);

    evaluate('distinct values()', null);

    evaluate('flatten()', null);

    evaluate('product()', null);

    evaluate('median()', null);

    evaluate('stddev()', null);

    evaluate('mode()', null);

  });


  describe('Numeric', function() {

    evaluate('decimal(1/3, 2)', .33);
    evaluate('decimal(1.5, 0)', 1);

    // TODO(nikku): according to spec
    // evaluate('decimal(1.5, 0)', 2);
    evaluate('decimal(2.5, 0)', 2);

    evaluate('floor(1.5)', 1);
    evaluate('floor(-1.5)', -2);

    evaluate('ceiling(1.5)', 2);
    evaluate('ceiling(-1.5)', -1);

    evaluate('abs( 10 )', 10);
    evaluate('abs( -10 )', 10);

    evaluate('modulo( 12, 5 )', 2);

    evaluate('sqrt( 16 )', 4);
    evaluate('sqrt( -3 )', null);

    evaluate('log( 10 )', 2.302585092994046);

    evaluate('exp( 5 )', 148.4131591025766);

    evaluate('odd( 5 )', true);
    evaluate('odd( 2 )', false);

    evaluate('even( 5 )', false);
    evaluate('even ( 2 )', true);

  });


  describe.skip('Sort', function() {

    evaluate('sort()', null);

  });


  describe('Context', function() {

    evaluate('get value({key1: "value1"}, "key1")', 'value1');

    // TODO(nikku): this should work, according to spec
    // evaluate('get entries({key1: "value1"})[key="key1"].value', 'value1');

    evaluate('get entries({key1: "value1"})', [ { key: 'key1', value: 'value1' } ]);

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
