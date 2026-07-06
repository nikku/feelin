import {
  isDate,
  isTime,
  isDateTime,
  isDuration,
  isTemporal,
  isZoned,
  toComparable,
  durationEquals,
  dateOf,
  timeOf,
  combine,
  timeFrom
} from './temporal.js';

export {
  isDate,
  isTime,
  isDateTime,
  isDuration,
  isTemporal,
  isZoned
};

export function isNil(e) {
  return e === null || e === undefined;
}

export function isContext(e) {
  return !isNil(e) && Object.getPrototypeOf(e) === Object.prototype;
}

export function isArray(e) {
  return Array.isArray(e);
}

export function isBoolean(e) {
  return typeof e === 'boolean';
}

export function getType(e) {

  if (isNil(e)) {
    return 'nil';
  }

  if (isBoolean(e)) {
    return 'boolean';
  }

  if (isNumber(e)) {
    return 'number';
  }

  if (isString(e)) {
    return 'string';
  }

  if (isContext(e)) {
    return 'context';
  }

  if (isArray(e)) {
    return 'list';
  }

  if (isDuration(e)) {
    return 'duration';
  }

  if (isDate(e)) {
    return 'date';
  }

  if (isTime(e)) {
    return 'time';
  }

  if (isDateTime(e)) {
    return 'date time';
  }

  if (e instanceof FeelRange) {
    return 'range';
  }

  if (e instanceof FeelFunction) {
    return 'function';
  }

  return 'literal';
}

export function isType(el: string, type: string): boolean {
  return getType(el) === type;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function typeCast(obj: any, type: string) {

  if (isDate(obj)) {

    if (type === 'date time') {
      return combine(obj, timeFrom(0, 0, 0));
    }

    return null;
  }

  if (isTime(obj)) {
    return null;
  }

  if (isDateTime(obj)) {

    if (type === 'time') {
      return timeOf(obj);
    }

    if (type === 'date') {
      return dateOf(obj);
    }

    if (type === 'date time') {
      return obj;
    }
  }

  return null;
}

export type FeelRangeProps = {
  'start included': boolean;
  'end included': boolean;
  start: string|number|null;
  end: string|number|null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: <T> (fn: (val: any) => T) => T[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  includes: (val: any) => boolean;
};

export class FeelRange {

  'start included': boolean;
  'end included': boolean;
  start: string|number|null;
  end: string|number|null;


  map: <T> (fn: (val) => T) => T[];


  includes: (val) => boolean;

  constructor(props: FeelRangeProps) {
    Object.assign(this, props);

    // `map` / `includes` are behavior, not identity; keep them
    // non-enumerable so structural equality and serialization rely on
    // the range bounds (start / end and their inclusion)
    Object.defineProperty(this, 'map', { enumerable: false });
    Object.defineProperty(this, 'includes', { enumerable: false });
  }
}

export function isNumber(obj) : obj is number {
  return typeof obj === 'number';
}

export function isString(obj) : obj is string {
  return typeof obj === 'string';
}

export function equals(a, b, strict = false) {
  if (
    a === null && b !== null ||
    a !== null && b === null
  ) {
    return false;
  }

  if (isArray(a) && a.length < 2) {
    a = a[0];
  }

  if (isArray(b) && b.length < 2) {
    b = b[0];
  }

  const aType = getType(a);
  const bType = getType(b);

  const temporalTypes = [ 'date time', 'time', 'date' ];

  if (temporalTypes.includes(aType)) {

    if (!temporalTypes.includes(bType)) {
      return null;
    }

    if ((aType === 'time') !== (bType === 'time')) {
      return null;
    }

    // strict equality (`is`) does not coerce across temporal types
    if (strict && aType !== bType) {
      return false;
    }

    // a zoned and a zone-less temporal of the same type are never equal
    if (aType === bType && isZoned(a) !== isZoned(b)) {
      return false;
    }

    return toComparable(a) === toComparable(b);
  }

  if (aType !== bType) {
    return null;
  }

  if (aType === 'nil') {
    return true;
  }

  if (aType === 'list') {
    if (a.length !== b.length) {
      return false;
    }

    return a.every(
      (element, idx) => equals(element, b[idx])
    );
  }

  if (aType === 'duration') {
    return durationEquals(a, b);
  }

  if (aType === 'context') {

    const aEntries = Object.entries(a);
    const bEntries = Object.entries(b);

    if (aEntries.length !== bEntries.length) {
      return false;
    }

    return aEntries.every(
      ([ key, value ]) => key in b && equals(value, b[key])
    );
  }

  if (aType === 'range') {
    return [
      [ a.start, b.start ],
      [ a.end, b.end ],
      [ a['start included'], b['start included'] ],
      [ a['end included'], b['end included'] ]
    ].every(([ a, b ]) => a === b);
  }

  if (a == b) {
    return true;
  }

  return aType === bType ? false : null;
}

export const FUNCTION_PARAMETER_MISSMATCH = {};


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
          return FUNCTION_PARAMETER_MISSMATCH;
        }
      }
    } else {

      // strictly check for required parameter names,
      // and fail on wrong parameter name
      if (Object.keys(contextOrArgs).some(
        key => !this.parameterNames.includes(key) && !this.parameterNames.includes(`...${key}`)
      )) {
        return FUNCTION_PARAMETER_MISSMATCH;
      }

      params = this.parameterNames.reduce((params, name) => {

        if (name.startsWith('...')) {
          name = name.slice(3);

          const value = contextOrArgs[name];

          if (!value) {
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