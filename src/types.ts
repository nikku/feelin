import { Temporal } from 'temporal-polyfill';

import {
  ZonedTime,
  REFERENCE_DATE,
  toComparable
} from './temporal.js';

import type {
  FeelDate,
  FeelTime,
  FeelDateTime,
  FeelDuration
} from './temporal.js';

export function isNil(e) {
  return e === null || e === undefined;
}

export function isContext(e) {
  return !isNil(e) && Object.getPrototypeOf(e) === Object.prototype;
}

export function isDate(obj): obj is FeelDate {
  return obj instanceof Temporal.PlainDate;
}

export function isZonedTime(obj): obj is ZonedTime {
  return obj instanceof ZonedTime;
}

export function isTime(obj): obj is FeelTime {
  return obj instanceof Temporal.PlainTime || obj instanceof ZonedTime;
}

export function isZonedDateTime(obj): obj is Temporal.ZonedDateTime {
  return obj instanceof Temporal.ZonedDateTime;
}

/**
 * Whether the value is a FEEL <date and time>
 * (local {@link Temporal.PlainDateTime} or zoned {@link Temporal.ZonedDateTime}).
 */
export function isDateTime(obj): obj is FeelDateTime {
  return obj instanceof Temporal.PlainDateTime || obj instanceof Temporal.ZonedDateTime;
}

/**
 * Whether the value is any temporal instant (date, time or date time),
 * i.e. anything but a duration.
 */
export function isTemporal(obj): boolean {
  return isDate(obj) || isTime(obj) || isDateTime(obj);
}

export function isDuration(obj): obj is FeelDuration {
  return obj instanceof Temporal.Duration;
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

  if (e instanceof Range) {
    return 'range';
  }

  if (e instanceof FunctionWrapper) {
    return 'function';
  }

  return 'literal';
}

export function isType(el: string, type: string): boolean {
  return getType(el) === type;
}

/**
 * Extract the wall-clock time-of-day of a temporal value.
 */
function toPlainTime(obj): Temporal.PlainTime {

  if (obj instanceof ZonedTime) {
    return obj.value.toPlainTime();
  }

  return obj.toPlainTime();
}

/**
 * Extract the calendar date of a temporal value.
 */
function toPlainDate(obj): Temporal.PlainDate {
  return obj.toPlainDate();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function typeCast(obj: any, type: string) {

  if (isDate(obj)) {

    if (type === 'date time') {
      return obj.toPlainDateTime(Temporal.PlainTime.from('00:00:00'));
    }

    return null;
  }

  if (isTime(obj)) {
    return null;
  }

  if (isDateTime(obj)) {

    if (type === 'time') {
      return toPlainTime(obj);
    }

    if (type === 'date') {
      return toPlainDate(obj);
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
    if (aType === bType) {
      const aZoned = isZonedTime(a) || isZonedDateTime(a);
      const bZoned = isZonedTime(b) || isZonedDateTime(b);

      if (aZoned !== bZoned) {
        return false;
      }
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

    const relativeTo = REFERENCE_DATE;

    const total = (d, unit) => d.total({ unit, relativeTo });

    // years and months duration -> compare in months
    if (Math.abs(total(a, 'day')) > 180) {
      return Math.trunc(total(a, 'month') - total(b, 'month')) === 0;
    }

    // days and time duration -> compare in seconds
    else {
      return Math.trunc(total(a, 'second') - total(b, 'second')) === 0;
    }

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