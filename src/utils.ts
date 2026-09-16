import { normalizeContextKey } from 'lezer-feel';

import { getType } from './types.js';


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

export function isNotImplemented(err) {
  return /^not implemented/.test(err.message);
}

/**
 * Whether `context` exposes `name` to FEEL: an own property, or a
 * prototype getter (read-only view).
 *
 * @param {Record<string, any>} context
 * @param {string} name
 *
 * @return {boolean}
 */
export function has(context, name) {

  if (Object.prototype.hasOwnProperty.call(context, name)) {
    return true;
  }

  // walk the prototype chain, stopping before `Object.prototype`
  // (its `__proto__` accessor must not become visible)
  for (let proto = Object.getPrototypeOf(context); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);

    if (descriptor) {
      return typeof descriptor.get === 'function';
    }
  }

  return false;
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

  // fast path: exact own entry, no normalization needed
  if (has(context, name)) {
    return context[name];
  }

  const normalizedName = normalizeContextKey(name);

  if (has(context, normalizedName)) {
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
