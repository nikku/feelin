import {
  parser as expressionGrammarParser
} from './grammar/expression-parser';

import {
  parser as unaryTestGrammarParser
} from './grammar/unary-test-parser';

import {
  Interpreter
} from './interpreter';

import {
  Parser
} from './parser';

const unaryTestParser = new Parser(unaryTestGrammarParser);
const expressionParser = new Parser(expressionGrammarParser);

const unaryTester = new Interpreter(unaryTestParser);
const expressionEvaluator = new Interpreter(expressionParser);


export function unaryTest(expression, context={}) {
  const value = context['?'] || null;

  const {
    root,
    parsedContext
  } = unaryTester.evaluate(expression, context);

  // root = fn(ctx) => test(val)
  const test = root(parsedContext);

  return test(value);
}

export function evaluate(expression, context={}) {

  const {
    root,
    parsedContext
  } = expressionEvaluator.evaluate(expression, context);

  // root = [ fn(ctx) ]

  const results = root(parsedContext);

  if (results.length === 1) {
    return results[0];
  } else {
    return results;
  }
}

export function parseExpressions(expression, context={}) {
  return expressionParser.parse(expression, context);
}

export function parseUnaryTests(expression, context={}) {
  return unaryTestParser.parse(expression, context);
}