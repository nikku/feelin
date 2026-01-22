import {
  parser,
  trackVariables
} from 'lezer-feel';

import { Tree } from '@lezer/common';


export type ParseContext = Record<string, unknown>;

export function parseExpression(expression: string, context: ParseContext = {}, dialect: string | undefined): Tree {
  return parser.configure({
    top: 'Expression',
    contextTracker: trackVariables(context),
    dialect
  }).parse(expression);
}

export function parseUnaryTests(expression: string, context: ParseContext = {}, dialect: string | undefined): Tree {
  return parser.configure({
    top: 'UnaryTests',
    contextTracker: trackVariables(context),
    dialect
  }).parse(expression);
}