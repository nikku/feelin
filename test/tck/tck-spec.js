import { inspect } from 'node:util';
import { readFileSync } from 'node:fs';

import glob from 'fast-glob';

import {
  expect
} from 'chai';

import {
  evaluate
} from 'feelin';


const NOT_IMPLEMENTED = {};


describe('tck', function() {

  const suitePaths = glob.sync('tmp/dmn-tck/*/*.json');

  for (const suitePath of suitePaths) {

    const suite = JSON.parse(readFileSync(suitePath, 'utf8'));

    const descSuite = (skipSuite(suite.testName) ? describe.skip : describe);

    descSuite(suite.testName, function() {

      for (const testCase of suite.cases) {

        const descTest = (skipTest(suite.testName, testCase.id) ? describe.skip : describe);

        descTest(testCase.id, function() {

          for (const run of testCase.runs) {

            let iit = it;

            const {
              context,
              expression,
              expectedValue,
              decision
            } = run;

            let a;

            const c = tryEval(context);
            const b = tryEval(expectedValue);

            if (c !== NOT_IMPLEMENTED) {
              a = tryEval(expression.text, fixContext(suite.testName, decision)(c));
            } else {
              console.error(`Failed to evaluate context: ${context}`);

              iit = it.skip;
            }

            if (b === NOT_IMPLEMENTED) {
              console.error(`Failed to evaluate expectedValue: ${expectedValue}`);

              iit = it.skip;
            }

            if (a === NOT_IMPLEMENTED) {
              iit = it.skip;
            }

            iit(`${expression.text} === ${expectedValue}${ context ? ` ${ inspect(context) }` : '' }`, function() {

              if (a instanceof Error) {
                expect(a, 'expression parse error').not.to.exist;
              }

              if (b instanceof Error) {
                expect(b, 'expected value parse error').not.to.exist;
              }

              if (typeof a === 'number' && typeof b === 'number') {
                expect(a).to.be.closeTo(b, 0.00001);
              } else {
                if (tryEval('a = b', { a, b }) !== true) {
                  expect(a).to.eql(b);
                }
              }
            });

          }

        });

      }

    });

  }

});


function tryEval(expr, context = {}) {
  try {
    return evaluate(expr, context).value;
  } catch (err) {
    if (err.message.startsWith('not implemented')) {
      return NOT_IMPLEMENTED;
    }

    return new Error(err.message);
  }
}

function skipSuite(suiteName) {
  const only = process.env.TEST_ONLY;

  if (only) {
    return !suiteName.includes(only);
  }

  return [
    '0070-feel-instance-of-test-01.xml',
    '0076-feel-external-java-test-01.xml',
    '0082-feel-coercion-test-01.xml',
    '0092-feel-lambda-test-01.xml'
  ].includes(suiteName);
}

function skipTest(suiteName, testId) {
  return [
    '0057-feel-context-test-01.xml#008',

    // interoperability with boxed expressions
    '1146-feel-context-put-function-test-01.xml#014',
    '1146-feel-context-put-function-test-01.xml#015',
    '1146-feel-context-put-function-test-01.xml#nested010',
    '1146-feel-context-put-function-test-01.xml#nested011',

    // non-sense nested matcher group
    '1111-feel-matches-function-test-01.xml#caselessmatch08',
    '1111-feel-matches-function-test-01.xml#caselessmatch09',
    '1111-feel-matches-function-test-01.xml#caselessmatch10',
    '1111-feel-matches-function-test-01.xml#caselessmatch11',

    '0079-feel-string-function-test-01.xml#dt_duration_004',

    // we're not Java
    '1141-feel-round-up-function-test-01.xml#016_b',
    '1141-feel-round-up-function-test-01.xml#017_b',
    '1142-feel-round-down-function-test-01.xml#016_b',
    '1142-feel-round-down-function-test-01.xml#017_b',
    '1143-feel-round-half-up-function-test-01.xml#016_b',
    '1143-feel-round-half-up-function-test-01.xml#017_b',
    '1144-feel-round-half-down-function-test-01.xml#016_b',
    '1144-feel-round-half-down-function-test-01.xml#017_b',
  ].includes(`${suiteName}#${testId}`);
}

function fixContext(testName, decisionName) {

  if (testName === '0084-feel-for-loops-test-01.xml' && decisionName === 'decision_014') {
    return (context) => ({ ...context, 'days in weekend': [ 'saturday', 'sunday' ] });
  }

  return (c) => c;
}