import { isArray, isNil } from './types.js';

import { isRange } from './range.js';

/**
 * This module is the single place in the code base that deals with FEEL
 * <function> values.
 *
 * A {@link FeelFunction} is pure data (its wrapped implementation and the
 * names of its parameters) plus the {@link FeelFunction#invoke} behavior
 * that binds positional or named arguments to those parameters. Coercion of
 * arbitrary values into functions — including the range-as-membership-test
 * shortcut — is centralized in {@link wrapFunction}, and the parameter names
 * of a plain JS function are recovered through {@link parseParameterNames}.
 */

/**
 * Sentinel returned by {@link FeelFunction#invoke} when the provided
 * arguments do not match the function's parameters.
 */
export const FUNCTION_PARAMETER_MISMATCH = {};


export class FeelFunction {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (...args) => any;
  parameterNames: string[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(fn: (...args) => any, parameterNames: string[]) {

    this.fn = fn;
    this.parameterNames = parameterNames;

    // the wrapped implementation is an internal detail; keep it
    // non-enumerable so serialization and structural comparison rely on
    // the public parameter names rather than the opaque closure
    Object.defineProperty(this, 'fn', { enumerable: false });
  }

  invoke(contextOrArgs) {

    let params;

    if (isArray(contextOrArgs)) {
      params = contextOrArgs;

      // reject
      if (params.length > this.parameterNames.length) {

        const lastParam = this.parameterNames[this.parameterNames.length - 1];

        // strictly check for parameter count provided
        // for non var-args functions
        if (!lastParam || !lastParam.startsWith('...')) {
          return FUNCTION_PARAMETER_MISMATCH;
        }
      }
    } else {

      // strictly check for required parameter names,
      // and fail on wrong parameter name
      if (Object.keys(contextOrArgs).some(
        key => !this.parameterNames.includes(key) && !this.parameterNames.includes(`...${key}`)
      )) {
        return FUNCTION_PARAMETER_MISMATCH;
      }

      params = this.parameterNames.reduce((params, name) => {

        if (name.startsWith('...')) {
          name = name.slice(3);

          const value = contextOrArgs[name];

          if (isNil(value)) {
            return params;
          } else {

            // ensure that single arg provided for var args named
            // parameter is wrapped in a list
            return [ ...params, ...(isArray(value) ? value : [ value ]) ];
          }
        }

        return [ ...params, contextOrArgs[name] ];
      }, []);
    }

    return this.fn.call(null, ...params);
  }
}

/**
 * Whether the value is a FEEL <function>.
 */
export function isFunction(obj) : obj is FeelFunction {
  return obj instanceof FeelFunction;
}

/**
 * Recover the parameter names of a plain JS function, either from an
 * explicit `$args` annotation or by parsing its source.
 */
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

/**
 * Coerce a value into a {@link FeelFunction}.
 *
 * Passes through existing functions, turns a {@link FeelRange} into a
 * membership test and wraps a plain JS function (recovering its parameter
 * names when not given). Returns `null` for anything that cannot be
 * invoked.
 *
 * @param {Function} fn
 * @param {string[]} [parameterNames]
 *
 * @return {FeelFunction}
 */
export function wrapFunction(fn, parameterNames = null) {

  if (!fn) {
    return null;
  }

  if (fn instanceof FeelFunction) {
    return fn;
  }

  if (isRange(fn)) {
    return new FeelFunction((value) => fn.includes(value), [ 'value' ]);
  }

  if (typeof fn !== 'function') {
    return null;
  }

  return new FeelFunction(fn, parameterNames || parseParameterNames(fn));
}
