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

import { FeelRange, isRange } from './range.js';

import { isFunction } from './function.js';

export {
  isDate,
  isTime,
  isDateTime,
  isDuration,
  isTemporal,
  isZoned,
  FeelRange
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

/**
 * FEEL types that are orderable, i.e. may be compared through `<`, `>`,
 * `<=`, `>=`, `between` and range membership.
 */
const ORDERABLE_TYPES = [ 'number', 'string', 'date', 'date time', 'time', 'duration' ];

/**
 * Whether `a` and `b` may be *ordered* (via `<`, `>`, `<=`, `>=`,
 * `between` or range membership). Two values are comparable only when
 * they share the same orderable FEEL type; ordering values of different
 * (or non-orderable) types is a semantic error that yields `null`.
 *
 * A singleton list is compared as its element (mirroring {@link equals}).
 */
export function isComparable(a, b): boolean {

  if (isArray(a) && a.length < 2) {
    a = a[0];
  }

  if (isArray(b) && b.length < 2) {
    b = b[0];
  }

  const type = getType(a);

  return type === getType(b) && ORDERABLE_TYPES.includes(type);
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

    // `date`, `time` and `date and time` are distinct FEEL types; a value
    // of one type is never comparable to a value of another. Strict
    // equality (`is`) yields `false` for such a mismatch, a regular
    // comparison yields `null`.
    if (aType !== bType) {
      return strict ? false : null;
    }

    // a zoned and a zone-less temporal of the same type are never equal
    if (isZoned(a) !== isZoned(b)) {
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
    return (
      a['start included'] === b['start included'] &&
      a['end included'] === b['end included'] &&
      equals(a.start, b.start) === true &&
      equals(a.end, b.end) === true
    );
  }

  if (a == b) {
    return true;
  }

  return aType === bType ? false : null;
}

