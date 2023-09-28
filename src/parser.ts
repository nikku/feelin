import {
  parser,
  trackVariables
} from 'lezer-feel';

import { Tree } from '@lezer/common';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParseContext = Record<string, any>;

export function parseExpression(expression: string, context: ParseContext = {}): Tree {
  return parser.configure({
    top: 'Expression',
    contextTracker: trackVariables(context)
  }).parse(expression);
}

export function parseUnaryTests(expression: string, context: ParseContext = {}): Tree {
  return parser.configure({
    top: 'UnaryTests',
    contextTracker: trackVariables(context)
  }).parse(expression);
}