import {
  parser as grammarParser
} from './grammar/feel-parser';

import {
  Interpreter
} from './interpreter';

import {
  Parser
} from './parser';

const parser = new Parser(grammarParser);

const interpreter = new Interpreter(parser);


export function unaryTest(expression, context={}) {
  const value = context['?'] || null;

  const {
    root,
    parsedContext
  } = interpreter.unaryTest(expression, context);

  // root = fn(ctx) => test(val)
  const test = root(parsedContext);

  return test(value);
}

export function evaluate(expression, context={}) {

  const {
    root,
    parsedContext
  } = interpreter.evaluate(expression, context);

  // root = [ fn(ctx) ]

  const results = root(parsedContext);

  if (results.length === 1) {
    return results[0];
  } else {
    return results;
  }
}

export function parseExpressions(expression, context={}) {
  return parser.parseExpressions(expression, context);
}

export function parseUnaryTests(expression, context={}) {
  return parser.parseUnaryTests(expression, context);
}