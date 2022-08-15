import { FixedOffsetZone } from 'luxon';
import { isDateTime, isDuration } from './temporal';

export {
  isDateTime,
  isDuration
};

export function isContext(e) {
  return Object.getPrototypeOf(e) === Object.prototype;
}

export function isArray(e) {
  return Array.isArray(e);
}

export function isBoolean(e) {
  return typeof e === 'boolean';
}

export function getType(e) {

  if (e === null || e === undefined) {
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

  if (isDateTime(e)) {
    if (
      e.year === 1900 &&
      e.month === 1 &&
      e.day === 1
    ) {
      return 'time';
    }

    if (
      e.hour === 0 &&
      e.minute === 0 &&
      e.second === 0 &&
      e.millisecond === 0 &&
      e.zone === FixedOffsetZone.utcInstance
    ) {
      return 'date';
    }

    return 'date time';
  }

  if (e instanceof Range) {
    return 'range';
  }

  return 'literal';
}

export function isType(el: string, type: string): boolean {
  return getType(el) === type;
}

export function isCompatible(aType: string, bType: string) {

  if (aType === bType) {
    return true;
  }

  return [
    [ 'time', 'date time' ],
    [ 'date', 'date time' ]
  ].some(
    e => (
      e[0] === aType && e[1] === bType ||
      e[1] === aType && e[0] === bType
    )
  );
}

export type RangeProps = {
  'start included': boolean,
  'end included': boolean,
  start: string|number|null,
  end: string|number|null,
  map<T>(fn: (val: any) => T): T[],
  includes(val: any): boolean
};

export class Range {

  props: RangeProps;

  constructor(props: RangeProps) {
    this.props = props;
  }

  map<T>(fn: (any) => T) : T[] {
    return this.props.map(fn);
  }

  includes(val: any) : boolean {

    if (val === null) {
      return null;
    }

    return this.props.includes(val);
  }

  get start() {
    return this.props.start;
  }

  get 'start included'() {
    return this.props['start included'];
  }

  get end() {
    return this.props.end;
  }

  get 'end included'() {
    return this.props['end included'];
  }

}

export function isNumber(obj) : obj is number {
  return typeof obj === 'number';
}

export function isString(obj) : obj is string {
  return typeof obj === 'string';
}

export function equals(a, b) {
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

  if (!isCompatible(aType, bType)) {
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

  if (aType === 'date time' || aType === 'time' || aType === 'date') {
    return (
      a.toUTC().valueOf() === b.toUTC().valueOf()
    );
  }

  if (aType === 'duration') {

    // years and months duration -> months
    if (Math.abs(a.as('days')) > 180) {
      return Math.trunc(a.minus(b).as('months')) === 0;
    }

    // days and time duration -> seconds
    else {
      return Math.trunc(a.minus(b).as('seconds')) === 0;
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