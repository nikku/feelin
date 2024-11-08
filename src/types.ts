import {
  DateTime,
  Duration,
  FixedOffsetZone,
  SystemZone
} from 'luxon';

export function isContext(e) {
  return Object.getPrototypeOf(e) === Object.prototype;
}

export function isDateTime(obj): obj is DateTime {
  return DateTime.isDateTime(obj);
}

export function isDuration(obj): obj is Duration {
  return Duration.isDuration(obj);
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

  if (e instanceof FunctionWrapper) {
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
      return obj.set({
        year: 1900,
        month: 1,
        day: 1
      });
    }

    if (type === 'date') {
      return obj.setZone('utc', { keepLocalTime: true }).startOf('day');
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

    if (aType === 'time' && bType !== 'time') {
      return null;
    }

    if (bType === 'time' && aType !== 'time') {
      return null;
    }

    if (strict || a.zone === SystemZone.instance || b.zone === SystemZone.instance) {
      return a.equals(b);
    } else {
      return a.toUTC().valueOf() === b.toUTC().valueOf();
    }
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
          return null;
        }
      }
    } else {

      // strictly check for required parameter names,
      // and fail on wrong parameter name
      if (Object.keys(contextOrArgs).some(
        key => !this.parameterNames.includes(key) && !this.parameterNames.includes(`...${key}`)
      )) {
        return null;
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