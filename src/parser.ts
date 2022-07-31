import {
  parser,
  trackVariables
} from 'lezer-feel';

import { Tree } from '@lezer/common';


export type ParseContext = Record<string, any>;

export function parseExpressions(expression: string, context: ParseContext = {}): Tree {
  return parser.configure({
    top: 'Expressions',
    contextTracker: trackVariables(context)
  }).parse(expression);
}

export function parseUnaryTests(expression: string, context: ParseContext = {}): Tree {
  return parser.configure({
    top: 'UnaryTests',
    contextTracker: trackVariables(context)
  }).parse(expression);
}