const { inherits } = require('node:util');

const Mocha = require('mocha');
const fs = require('node:fs');

const SpecReporter = Mocha.reporters.Spec;

const {
  EVENT_RUN_END,
  EVENT_TEST_FAIL
} = Mocha.Runner.constants;

const resultsImgPath = 'docs/tck-results.svg';
const resultsJSONPath = 'docs/tck-results.json';

function testDiff(tests, oldTests=[]) {

  let diff = '';

  for (const test of tests) {
    if (!oldTests.includes(test)) {
      diff += `\n
  + ${test}`;
    }
  }

  for (const test of oldTests) {
    if (!tests.includes(test)) {
      diff += `\n
  - ${test}`;
    }
  }

  return diff;
}

function testTitle(test, suffix = '') {

  suffix = test.title + (suffix ? ' - ' + suffix : '');

  if (test.parent && test.parent.title) {
    return testTitle(test.parent, suffix);
  }

  return suffix;
}

/**
 * @param {Mocha.Runner} runner
 * @param {Mocha.MochaOptions} options
 */
function TckReporter(runner, options) {
  SpecReporter.call(this, runner, options);

  const failedTests = [];

  runner.on(EVENT_TEST_FAIL, function(test) {
    failedTests.push(testTitle(test));
  });

  runner.on(EVENT_RUN_END, function() {
    const {
      passes,
      pending,
      failures,
      tests
    } = runner.stats;

    const passesPercentage = passes / tests * 100;
    const pendingPercentage = pending / tests * 100;
    const failuresPercentage = failures / tests * 100;

    const resultsSvg = `<svg
  version="1.1"
  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 5" width="200">
  <defs>
    <clipPath id="round-corners">
      <rect x="0" y="0" width="100" height="5" rx="1" />
    </clipPath>
  </defs>

  <g clip-path="url(#round-corners)">
    <rect width="${ passesPercentage }" height="5" fill="rgb(26, 127, 55)" x="0" y="0" />
    <rect width="${ pendingPercentage }" height="5" fill="rgb(200, 200, 200)" x="${ passesPercentage }" y="0" />
    <rect width="${ failuresPercentage }" height="5" fill="rgb(209, 36, 47)" x="${ passesPercentage + pendingPercentage }" y="0" />
  </g>

</svg>`;

    const results = {
      passes,
      pending,
      failures,
      tests,
      failedTests
    };

    const oldResults = (function() {
      try {
        return JSON.parse(fs.readFileSync(resultsJSONPath, 'utf8'));
      } catch (e) {
        console.warn('could not read tck-results.json', e);

        return results;
      }
    })();

    const diff = testDiff(failedTests, oldResults.failedTests);

    console.log(`Completed with ${results.failures}${oldResults.failures == results.failures ? '' : ` (${oldResults.failures > results.failures ? '-' : '+'}${Math.abs(results.failures - oldResults.failures)})`} failures${diff ? ':' + diff : '.'}`);

    if (process.env.DRY_RUN === 'false') {
      console.log('Writing test results.');

      fs.writeFileSync(resultsImgPath, resultsSvg, 'utf8');
      fs.writeFileSync(resultsJSONPath, JSON.stringify(results, null, 2), 'utf8');
    }

    process.exit(oldResults.failures < results.failures ? 101 : 0);
  });

}

inherits(TckReporter, SpecReporter);

module.exports = TckReporter;