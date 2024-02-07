import { normalizeContextKey } from 'lezer-feel';

import { getType } from './types';


export function parseParameterNames(fn) {

  if (Array.isArray(fn.$args)) {
    return fn.$args;
  }

  const code = fn.toString();

  const match = /^(?:[^(]*\s*)?\(([^)]+)?\)/.exec(code);

  if (!match) {
    throw new Error('failed to parse params: ' + code);
  }

  const [ _, params ] = match;

  if (!params) {
    return [];
  }

  return params.split(',').map(p => p.trim());
}

export function notImplemented(thing) {
  return new Error(`not implemented: ${thing}`);
}

/**
 * Returns a name from context or undefined if it does not exist.
 *
 * @param {string} name
 * @param {Record<string, any>} context
 *
 * @return {any|undefined}
 */
export function getFromContext(name, context) {

  if ([ 'nil', 'boolean', 'number', 'string' ].includes(getType(context))) {
    return undefined;
  }

  if (name in context) {
    return context[name];
  }

  const normalizedName = normalizeContextKey(name);

  if (normalizedName in context) {
    return context[normalizedName];
  }

  const entry = Object.entries(context).find(
    ([ key ]) => normalizedName === normalizeContextKey(key)
  );

  if (entry) {
    return entry[1];
  }

  return undefined;
}
