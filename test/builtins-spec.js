import { expect } from 'chai';

import { interpreter } from '../src/interpreter';


describe('builtin functions', function() {

  describe.skip('Conversion', function() {

    evaluate('date()', null);

    evaluate('date and time()', null);

    evaluate('time()', null);

    evaluate('number()', null);

    evaluate('string()', null);

    evaluate('duration()', null);

    evaluate('years and months duration()', null);

  });


  describe('Boolean', function() {

    evaluate('not(null)', null);
    evaluate('not(true)', false);
    evaluate('not(false)', true);

  });


  describe.skip('String', function() {

    evaluate('substring()', null);

    evaluate('string length()', null);

    evaluate('upper case()', null);

    evaluate('lower case()', null);

    evaluate('substring before()', null);

    evaluate('substring after()', null);

    evaluate('replace()', null);

    evaluate('contains()', null);

    evaluate('starts with()', null);

    evaluate('ends with()', null);

    evaluate('split()', null);

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


  describe.skip('Numeric', function() {

    evaluate('decimal()', null);

    evaluate('floor()', null);

    evaluate('ceiling()', null);

    evaluate('abs()', null);

    evaluate('modulo()', null);

    evaluate('sqrt()', null);

    evaluate('log()', null);

    evaluate('exp()', null);

    evaluate('odd()', null);

    evaluate('even()', null);

  });


  describe.skip('Sort', function() {

    evaluate('sort()', null);

  });


  describe.skip('Context', function() {

    evaluate('get value()', null);

    evaluate('get entries()', null);

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
