import { interpreter } from './interpreter';

function unaryTest(input, expression, context) {
  return interpreter.unaryTest(input, expression, context);
}

function evaluate(expression, context) {
  return interpreter.evaluate(expression, context);
}

export {
  unaryTest,
  evaluate
};