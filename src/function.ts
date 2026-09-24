import { isArray, isNil, getType, typeCast } from './types.js';

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
 * Signal returned in place of a result when a function invocation fails.
 *
 * It carries the {@link InvocationFailure#warning} type to emit plus the
 * message template and interpolation values; the interpreter surfaces it
 * as the corresponding warning and evaluates the invocation to `null`, so
 * the signal never leaks into an enclosing expression.
 *
 * Two flavors exist: a structural {@link parameterMismatch} (wrong
 * parameter count or names, raised by {@link FeelFunction#invoke}) and a
 * semantic {@link invalidArguments} (well-typed but unusable input, raised
 * by a builtin body).
 */
export class InvocationFailure {
  constructor(
    readonly warning: string,
    readonly template: string,
    readonly values: Record<string, unknown> = {}
  ) {}
}

/**
 * Create an {@link InvocationFailure} for a builtin to return when it
 * rejects otherwise well-typed input.
 */
export function invalidArguments(
    template: string,
    values: Record<string, unknown> = {}
) {
  return new InvocationFailure('INVALID_ARGUMENTS', template, values);
}

/**
 * Create an {@link InvocationFailure} for an invocation whose arguments do
 * not match the target's parameters (wrong count or unknown names).
 */
export function parameterMismatch(target: unknown, params: unknown) {
  return new InvocationFailure(
    'FUNCTION_INVOCATION_FAILURE',
    'Cannot invoke {target} with parameters {params}',
    { target, params }
  );
}

/**
 * Whether the value is an {@link InvocationFailure} signal.
 */
export function isInvocationFailure(value: unknown): value is InvocationFailure {
  return value instanceof InvocationFailure;
}


/**
 * A validation/dispatch view onto a {@link FeelFunction}, TypeScript
 * overload style: one implementation receives the arguments of the
 * matching signature; the signatures only describe how provided
 * arguments bind and validate.
 *
 * The first matching signature wins; declare narrower (more
 * restrictive) signatures first.
 *
 * - `args` — arg-definition DSL entries, one per parameter (see
 *   {@link createArgTester}): `<type>`, `<type>?`, `list`, `list<<type>>`,
 *   union types `<type>|<type>|…`
 * - `params` — parameter names, `...`-prefixed for varargs
 */
export interface FunctionSignature {
  args: string[];
  params: string[];
}

/**
 * A {@link FunctionSignature} compiled for dispatch and validation.
 */
interface CompiledSignature extends FunctionSignature {

  /** number of required (non-optional, non-varargs) arguments */
  required: number;

  /** whether the last parameter is a `...` varargs parameter */
  varargs: boolean;

  /** maps raw positional args to converted args, or a failing index */
  validate: (args: unknown[]) => number | unknown[];
}

export class FeelFunction {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (...args) => any;
  parameterNames: string[];

  /**
   * Overload signatures, compiled once at construction time. Absent
   * (user-provided JS functions) a single untyped signature derived
   * from {@link FeelFunction#parameterNames} applies: positional
   * surplus rejects, missing arguments pad with `undefined` and
   * arguments pass unvalidated.
   */
  signatures: FunctionSignature[];

  private _compiled: CompiledSignature[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(fn: (...args) => any, parameterNames: string[], signatures: FunctionSignature[] = null) {

    this.fn = fn;
    this.parameterNames = parameterNames;

    this.signatures = signatures || [ defaultSignature(parameterNames || []) ];
    this._compiled = this.signatures.map(compileSignature);

    // compiled signatures and the wrapped implementation are internal
    // details; keep them non-enumerable so serialization and structural
    // comparison rely on the public data rather than opaque closures
    Object.defineProperty(this, '_compiled', { enumerable: false });
    Object.defineProperty(this, 'fn', { enumerable: false });
  }

  /**
   * Dispatch to the matching overload signature, then bind, validate
   * and invoke. See {@link FeelFunction#signatures}.
   */
  invoke(contextOrArgs) {

    const signatures = this._compiled;

    let signature: CompiledSignature;
    let params;

    if (isArray(contextOrArgs)) {

      const count = contextOrArgs.length;

      // arity candidates: not more than the signature accepts
      const fitting = signatures.filter(sig => sig.varargs || count <= sig.params.length);

      // prefer candidates whose required arguments are fully provided;
      // fall back to all fitting candidates so a single-signature
      // function surfaces a validation error (not a mismatch) for
      // missing required arguments
      const satisfiable = fitting.filter(sig => count >= sig.required);

      const candidates = satisfiable.length ? satisfiable : fitting;

      // first match wins; declare narrower signatures first
      signature = candidates[0];

      if (!signature) {
        return parameterMismatch(this, contextOrArgs);
      }

      params = contextOrArgs;

    } else {

      const keys = Object.keys(contextOrArgs);

      // first covering signature wins; declare narrower signatures
      // first
      signature = signatures.find(
        sig => keys.every(key => sig.params.includes(key) || sig.params.includes(`...${key}`))
      );

      if (!signature) {
        return parameterMismatch(this, contextOrArgs);
      }

      params = [];

      for (let name of signature.params) {

        if (name.startsWith('...')) {
          name = name.slice(3);

          const value = contextOrArgs[name];

          if (isNil(value)) {
            continue;
          }

          // ensure that single arg provided for var args named
          // parameter is wrapped in a list
          if (isArray(value)) {
            for (const v of value) {
              params.push(v);
            }
          } else {
            params.push(value);
          }

          continue;
        }

        params.push(contextOrArgs[name]);
      }
    }

    const converted = signature.validate(params);

    if (typeof converted === 'number') {
      return argumentValidationFailure(signature, params, converted);
    }

    return this.fn.call(null, ...converted);
  }
}

/**
 * Whether the value is a FEEL <function>.
 */
export function isFunction(obj) : obj is FeelFunction {
  return obj instanceof FeelFunction;
}

/**
 * Marker returned by argument testers for a non-matching argument.
 */
export const ARG_MISMATCH = {};

/**
 * Create a tester for a single argument definition.
 *
 * Definitions:
 *
 * - `<type>` — a required argument of the type
 * - `<type>?` — an optional argument (may be nil/undefined)
 * - `<type>|<type>|…` — a union of types (e.g. `string|date|date time`)
 * - `list` — a list, with implicit conversion `obj => [ obj ]`
 * - `list<<type>>` — a list whose members must all be of the type
 *   (nil members pass)
 *
 * The tester returns the (converted) argument, or {@link ARG_MISMATCH} if
 * the argument does not match.
 *
 * @param {string} arg
 *
 * @return {Function}
 */
export function createArgTester(arg) {
  const optional = arg.endsWith('?');

  const type = optional ? arg.substring(0, arg.length - 1) : arg;

  // union type: match any member
  if (type.includes('|')) {
    const testers = type.split('|').map(member => createArgTester(member));

    return function(obj) {

      if (typeof obj === 'undefined' || obj === null) {
        return optional ? obj : ARG_MISMATCH;
      }

      for (const test of testers) {
        const result = test(obj);

        if (result !== ARG_MISMATCH) {
          return result;
        }
      }

      return ARG_MISMATCH;
    };
  }

  // list<memberType>: validate members, too
  const memberMatch = /^list<(\w+)>$/.exec(type);

  if (memberMatch) {
    const memberType = memberMatch[1];

    return function(obj) {

      const arr = Array.isArray(obj);

      if (!arr) {

        // implicit conversion obj => [ obj ]
        if (typeof obj === 'undefined' || obj === null) {
          return optional ? obj : ARG_MISMATCH;
        }

        obj = [ obj ];
      }

      const invalid = obj.find(member => !isNil(member) && getType(member) !== memberType);

      return invalid === undefined ? obj : ARG_MISMATCH;
    };
  }

  return function(obj) {

    const arr = Array.isArray(obj);

    if (type === 'list') {
      if (arr || optional && typeof obj === 'undefined') {
        return obj;
      } else if (typeof obj === 'undefined') {

        // reject a missing required list argument
        return ARG_MISMATCH;
      } else {

        // implicit conversion obj => [ obj ]
        return obj === null ? ARG_MISMATCH : [ obj ];
      }
    }

    if (type !== 'any' && arr && obj.length === 1) {

      // implicit conversion [ obj ] => obj
      obj = obj[0];
    }

    const objType = getType(obj);

    if (type === 'any' || type === objType) {
      return optional ? obj : typeof obj !== 'undefined' ? obj : ARG_MISMATCH;
    }

    if (objType === 'nil') {
      return (optional ? obj : ARG_MISMATCH);
    }

    return typeCast(obj, type) || ARG_MISMATCH;
  };
}

/**
 * Create a validator for the given argument definitions.
 *
 * Returns a function mapping raw arguments to converted arguments,
 * or the index of the first argument that failed validation.
 *
 * @param {string[]} argDefinitions
 * @param {boolean} [varargs]
 *
 * @return {Function}
 */
export function createArgsValidator(argDefinitions, varargs = false) {

  const tests = argDefinitions.map(createArgTester);

  return function(args) {

    const result = [];

    // validate provided args; pad and validate missing trailing args
    // (without mutating the caller's array); a varargs tail is never
    // padded: absence means no varargs
    const padTo = varargs ? argDefinitions.length - 1 : argDefinitions.length;

    const length = Math.max(args.length, padTo);

    for (let index = 0; index < length; index++) {

      const test = tests[index];

      const conversion = test ? test(args[index]) : args[index];

      if (conversion === ARG_MISMATCH) {
        return index;
      }

      result.push(conversion);
    }

    return result;

  };
}

/**
 * The untyped signature derived from plain parameter names, applied
 * when no explicit signatures are given: every parameter accepts
 * anything and may be omitted (legacy behavior).
 */
function defaultSignature(parameterNames: string[]): FunctionSignature {
  return {
    args: parameterNames.map(name => name.startsWith('...') ? 'any' : 'any?'),
    params: parameterNames
  };
}

/**
 * Compile a {@link FunctionSignature} for dispatch and validation.
 */
function compileSignature(signature: FunctionSignature): CompiledSignature {
  const { args, params } = signature;

  const varargs = params.length > 0 && params[params.length - 1].startsWith('...');

  return {
    args,
    params,

    // a varargs parameter is never required
    required: args.filter((arg, index) => !arg.endsWith('?') && !(varargs && index === args.length - 1)).length,
    varargs,
    validate: createArgsValidator(args, varargs)
  };
}

/**
 * Create the {@link invalidArguments} signal for the argument at
 * `index` failing validation against the signature's definitions.
 */
function argumentValidationFailure(signature: CompiledSignature, args, index: number) {

  const name = signature.params[index] || String(index);
  const argDefinition = signature.args[index];
  const expectedType = argDefinition.replace(/\?$/, '');

  // list<memberType>: surface the offending member, not the whole list
  const memberMatch = /^list<(\w+)>$/.exec(expectedType);

  if (memberMatch) {
    const memberType = memberMatch[1];
    const list = Array.isArray(args[index]) ? args[index] : [ args[index] ];
    const invalidMember = list.find(member => !isNil(member) && getType(member) !== memberType);

    return invalidArguments('parameter \'{{{name}}}\' expects a list of \'{{{expectedType}}}\' members, but member {value} is of type \'{{{valueType}}}\'', {
      name,
      expectedType: memberType,
      value: invalidMember,
      valueType: getType(invalidMember)
    });
  }

  return invalidArguments('parameter \'{{{name}}}\' expects a value of type \'{{{expectedType}}}\', got {value}', {
    name,
    expectedType,

    // a missing argument surfaces as FEEL null
    value: typeof args[index] === 'undefined' ? null : args[index]
  });
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
