import {
  sync as glob
} from 'fast-glob';

import fs from 'fs';


import {
  expect
} from 'chai';

import { interpreter } from '../../src/interpreter';


describe('tck', function() {

  const suitePaths = glob('tmp/dmn-tck/*/*.json');

  for (const suitePath of suitePaths) {

    const suite = JSON.parse(fs.readFileSync(suitePath, 'utf8'));

    describe(suite.testName, function() {

      for (const [ _, c ] of Object.entries(suite.cases)) {

        const expression = c.expression;
        const expectedValue = c.resultNode.expected;

        it(`${c.name}   ${expression} === ${expectedValue}`, function() {
          expect(interpreter.evaluate(expression)).to.eql(interpreter.evaluate(expectedValue));
        });

      }

    });

  }

});