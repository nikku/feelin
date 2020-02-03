import {
  sync as glob
} from 'fast-glob';

import fs from 'fs';


import {
  expect
} from 'chai';

import {
  evaluate
} from '../dist/index.esm';


const NOT_IMPLEMENTED = {};


describe('tck', function() {

  const suitePaths = glob('tmp/dmn-tck/*/*.json');

  for (const suitePath of suitePaths) {

    const suite = JSON.parse(fs.readFileSync(suitePath, 'utf8'));

    describe(suite.testName, function() {

      for (const [ _, c ] of Object.entries(suite.cases)) {

        let iit = it;

        const expression = c.expression;
        const expectedValue = c.resultNode.value;

        const a = tryEval(expression);
        const b = tryEval(expectedValue);

        if (a === NOT_IMPLEMENTED || b === NOT_IMPLEMENTED) {
          iit = it.skip;
        }

        iit(`${c.name}   ${expression} === ${expectedValue}`, function() {

          if (a instanceof Error) {
            expect(a).not.to.exist;
          }

          if (b instanceof Error) {
            expect(b).not.to.exist;
          }

          expect(a).to.eql(b);
        });

      }

    });

  }

});


function tryEval(expr) {
  try {
    return evaluate(expr);
  } catch (err) {
    if (err.message.startsWith('not implemented')) {
      return NOT_IMPLEMENTED;
    }

    return new Error(err.message);
  }
}