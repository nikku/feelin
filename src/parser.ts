import {
  parser,
  trackVariables
} from 'lezer-feel';

import { Tree } from '@lezer/common';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParseContext = Record<string, any>;

export function parseExpression(expression: string, context: ParseContext = {}, dialect?: string): Tree {
  return parser.configure({
    top: 'Expression',
    contextTracker: trackVariables(context),
    dialect
  }).parse(expression);
}

export function parseUnaryTests(expression: string, context: ParseContext = {}, dialect?: string): Tree {
  return parser.configure({
    top: 'UnaryTests',
    contextTracker: trackVariables(context),
    dialect
  }).parse(expression);
}