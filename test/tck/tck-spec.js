import { inspect } from 'node:util';
import { readFileSync } from 'node:fs';

import glob from 'fast-glob';

import {
  expect
} from 'chai';

import {
  evaluate
} from '../../dist/index.esm.js';


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
    return evaluate(expr, context);
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
    '0079-feel-string-function-test-01.xml#dt_duration_004'
  ].includes(`${suiteName}#${testId}`);
}

function fixContext(testName, decisionName) {

  if (testName === '0084-feel-for-loops-test-01.xml' && decisionName === 'decision_014') {
    return (context) => ({ ...context, 'days in weekend': [ 'saturday', 'sunday' ] });
  }

  return (c) => c;
}