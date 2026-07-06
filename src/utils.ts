import { normalizeContextKey } from 'lezer-feel';

import { getType } from './types.js';


export function notImplemented(thing) {
  return new Error(`not implemented: ${thing}`);
}

export function isNotImplemented(err) {
  return /^not implemented/.test(err.message);
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
