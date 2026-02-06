import { isArray } from 'min-dash';

import {
  isDate,
  isTime,
  isDateConvertible,
  isDateTime,
  isDuration
} from './temporal.js';

export {
  isDate,
  isTime,
  isDateConvertible,
  isDuration,
  isDateTime
};

export function isNil(e) {
  return e === null || e === undefined;
}

export function isContext(e) {
  return !isNil(e) && Object.getPrototypeOf(e) === Object.prototype;
}

export function isList(obj) : obj is Array<unknown> {
  return isArray(obj);
}

export function isBoolean(obj) : obj is boolean {
  return typeof obj === 'boolean';
}

export function isFunction(obj) : obj is FunctionWrapper {
  return obj instanceof FunctionWrapper;
}

export function isRange(obj) : obj is Range {
  return obj instanceof Range;
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

  if (isList(e)) {
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

  if (isRange(e)) {
    return 'range';
  }

  if (isFunction(e)) {
    return 'function';
  }

  return 'literal';
}

export function isType(el: string, type: string): boolean {
  return getType(el) === type;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function typeCast(obj: any, type: string) {

  if (isDateTime(obj)) {
    if (type === 'time') {
      return obj.getTime();
    }

    if (type === 'date') {
      return obj.getDate();
    }

    if (type === 'date time') {
      return obj;
    }
  }

  return null;
}

export type RangeProps = {
  'start included': boolean;
  'end included': boolean;
  start: string|number|null;
  end: string|number|null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: <T> (fn: (val: any) => T) => T[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  includes: (val: any) => boolean;
};

export class Range {

  'start included': boolean;
  'end included': boolean;
  start: string|number|null;
  end: string|number|null;


  map: <T> (fn: (val) => T) => T[];


  includes: (val) => boolean;

  constructor(props: RangeProps) {
    Object.assign(this, props);
  }
}

export function isNumber(obj) : obj is number {
  return typeof obj === 'number';
}

export function isString(obj) : obj is string {
  return typeof obj === 'string';
}

export function equals(a, b, strict = false) {

  if (isList(a) && a.length === 1) {
    a = a[0];
  }

  if (isList(b) && b.length === 1) {
    b = b[0];
  }

  console.log('equals', { a, b });

  if (isNil(a)) {
    return isNil(b);
  }

  if (isNil(b)) {
    return isNil(a);
  }

  // implicit conversion from date to date and time

  if (!strict && (isDate(a) && isDateTime(b))) {
    return equals(a, b.getDate());
  }

  if (!strict && (isDateTime(a) && isDate(b))) {
    return equals(a.getDate(), b);
  }

  if (isDate(a)) {

    if (!isDate(b)) {
      return null;
    }

    return a.equals(b);
  }

  if (isTime(a)) {

    if (!isTime(b)) {
      return null;
    }

    return a.equals(b);
  }

  if (isDateTime(a)) {

    if (!isDateTime(b)) {
      return null;
    }

    return a.equals(b);
  }

  if (isList(a)) {

    if (!isList(b)) {
      return null;
    }

    if (a.length !== b.length) {
      return false;
    }

    return a.every(
      (element, idx) => equals(element, b[idx])
    );
  }

  if (isDuration(a)) {

    if (!isDuration(b)) {
      return null;
    }

    if (a.years || a.months) {

      // years and months duration -> months
      return a.total('months') === b.total('months');
    } else {

      // days and time duration -> seconds
      return a.total('seconds') === b.total('seconds');
    }
  }

  if (isContext(a)) {

    if (!isContext(b)) {
      return null;
    }

    const aEntries = Object.entries(a);
    const bEntries = Object.entries(b);

    if (aEntries.length !== bEntries.length) {
      return false;
    }

    return aEntries.every(
      ([ key, value ]) => key in b && equals(value, b[key])
    );
  }

  if (isRange(a)) {

    if (!isRange(b)) {
      return null;
    }

    return [
      [ a.start, b.start ],
      [ a.end, b.end ],
      [ a['start included'], b['start included'] ],
      [ a['end included'], b['end included'] ]
    ].every(([ a, b ]) => a === b);
  }

  if (isString(a)) {

    if (!isString(b)) {
      return null;
    }

    return a === b;
  }

  if (isNumber(a)) {

    if (!isNumber(b)) {
      return null;
    }

    return a === b;
  }

  if (isBoolean(a)) {

    if (!isBoolean(b)) {
      return null;
    }

    return a === b;
  }

  return a == b;
}

export const FUNCTION_PARAMETER_MISSMATCH = {};


export class FunctionWrapper {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (...args) => any;
  parameterNames: string[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(fn: (...args) => any, parameterNames: string[]) {

    this.fn = fn;
    this.parameterNames = parameterNames;
  }

  invoke(contextOrArgs) {

    let params;

    if (isList(contextOrArgs)) {
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
            return [ ...params, ...(isList(value) ? value : [ value ]) ];
          }
        }

        return [ ...params, contextOrArgs[name] ];
      }, []);
    }

    return this.fn.call(null, ...params);
  }
}