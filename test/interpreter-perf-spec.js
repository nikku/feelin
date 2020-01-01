import {
  readFileSync as readFile
} from 'fs';

import { interpreter } from '../src/interpreter';


describe('interpreter', function() {

  it.skip('perf', function() {

    this.timeout(20000);

    // given
    const terms = readFile(__dirname + '/perf/snippets.txt', 'utf8').split('\n').filter(t => t).map(t => {
      const [ term, context ] = t.substring('I: '.length).split('  ##  ');

      return [ term, parseContext(context) ];
    });

    console.time('perf');

    for (let i = 0; i < 20; i++) {
      console.time('perf #' + i);

      for (let j = 0; j < 100; j++) {

        for (let t of terms) {

          const [ term, context ] = t;

          interpreter.evaluate(term, context);
        }

      }

      console.timeEnd('perf #' + i);
    }

    console.timeEnd('perf');

  });

});


function parseContext(context) {

  const FUNCTION_TAG = 'FUNCTION$';

  function reify(key, value) {

    if (typeof value === 'string' && value.startsWith(FUNCTION_TAG)) {
      return new Function('return ' + value.substring(FUNCTION_TAG.length))();
    }

    return value;
  }

  return JSON.parse(context, reify);
}