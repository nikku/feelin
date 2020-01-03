import { interpreter } from './interpreter';

function unaryTest(input, expression, context) {
  return interpreter.unaryTest(input, expression, context);
}

function evaluate(expression, context) {
  return interpreter.evaluate(expression, context);
}

function parseExpressions(expression, context={}) {
  return interpreter.parseExpressions(expression, context);
}

function parseUnaryTests(expression, context={}) {
  return interpreter.parseUnaryTests(expression, context);
}

export {
  parseExpressions,
  parseUnaryTests,
  unaryTest,
  evaluate
};