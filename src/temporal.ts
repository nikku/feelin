import { Temporal } from 'temporal-polyfill';

import { notImplemented } from './utils.js';

class FTBase<R extends Temporal.Duration | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime, T extends string> {

  type: T;
  raw: R;

  constructor(type: T, raw: R) {
    this.type = type;
    this.raw = raw;
  }

  equals(other: unknown) {

    if (isTemporal(other)) {

      // @ts-expect-error "weak cast"
      return this.raw.equals(other.raw);
    }

    return false;
  }

  toJSON() {
    return this.toString();
  }
}

export interface FDateConvertible {
  getDate(): FDate;
}

export interface FTimeConvertible {
  getTime(): FTime;
}

export class FDuration extends FTBase<Temporal.Duration, 'duration'> {

  constructor(raw: Temporal.Duration) {
    super('duration', raw);
  }

  toString() {
    return this.raw.toString();
  }
}

type TemporalType = 'date' | 'date time' | 'time';

class FTemporal<R extends Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime> extends FTBase<R, TemporalType> { }

export class FDateTime extends FTemporal<Temporal.PlainDateTime | Temporal.ZonedDateTime> implements FDateConvertible, FTimeConvertible {

  constructor(raw: Temporal.PlainDateTime | Temporal.ZonedDateTime) {
    super('date time', raw);
  }

  getDate() {
    return new FDate(this.raw.toPlainDate());
  }

  getTime() {
    return new FTime(this.raw);
  }

  toString() {
    return this.raw.toString();
  }
}

export class FDate extends FTemporal<Temporal.PlainDate> implements FDateConvertible {

  constructor(raw: Temporal.PlainDate) {
    super('date', raw);
  }

  substract(other: FDate) {
    return new FDuration(this.raw.since(other.raw));
  }

  getDate() {
    return this;
  }

  toString() {
    return this.raw.toString();
  }
}

export class FTime extends FTemporal<Temporal.ZonedDateTime | Temporal.PlainDateTime> {

  constructor(raw: Temporal.ZonedDateTime | Temporal.PlainDateTime) {
    super('time', raw);
  }

  setDate(convertible: FDateConvertible) {

    const {
      day,
      month,
      year
    } = convertible.getDate().raw;

    return new FDateTime(this.raw.with({
      day,
      month,
      year
    }));
  }

  toString() {
    return this.raw.toString().split('T')[1];
  }
}

export function isTemporal(obj) : obj is FDuration | FTime | FDate | FDateTime {
  return obj instanceof FTBase;
}

export function isDate(obj) : obj is FDate {
  return obj instanceof FDate;
}

export function isDuration(obj) : obj is FDuration {
  return obj instanceof FDuration;
}

export function isDateTime(obj) : obj is FDateTime {
  return obj instanceof FDateTime;
}

export function isTime(obj) : obj is FTime {
  return obj instanceof FTime;
}

export function isDateConvertible(obj) : obj is FDateConvertible {
  return [ FDate, FDateTime ].some(T => obj instanceof T);
}

export function duration(options: { from: string } | { from: FDateConvertible, to: FDateConvertible }) : FDuration {

  console.log('duration', { options });

  if ('to' in options) {
    const {
      from,
      to
    } = options;

    return to.getDate().substract(from.getDate());
  } else {
    const {
      from
    } = options;

    return tryParse(() => {
      const raw = Temporal.Duration.from(from);

      return new FDuration(raw);
    });
  }
}

export function date(options: { from: string | FDateConvertible } | { year: number, month: number, day: number }) : FDate {

  if ('from' in options) {
    const {
      from
    } = options;

    if (isDateConvertible(from)) {
      return from.getDate();
    } else {

      if (from.startsWith('-')) {
        throw notImplemented('negative date');
      }

      return tryParse(() => {
        const raw = Temporal.PlainDate.from(from);

        return new FDate(raw);
      });
    }
  } else {
    const {
      year,
      month,
      day
    } = options;

    const raw = Temporal.PlainDate.from({
      year,
      month,
      day
    });

    return new FDate(raw);
  }
}

export function time(options: { from: string } | { hour: number, minute: number, second: number }) : FTime {

  if ('from' in options) {

    const {
      from
    } = options;

    if (from.startsWith('-')) {
      throw notImplemented('negative time');
    }

    const todayStr = Temporal.Now.plainDateISO().toString();

    return tryParse(() => {
      if (isZoned(from)) {
        const raw = Temporal.ZonedDateTime.from(`${todayStr}T${from}`);

        return new FTime(raw);
      } else {
        const raw = Temporal.PlainDateTime.from(`${todayStr}T${from}`);

        return new FTime(raw);
      }
    });
  } else {
    const {
      hour,
      minute,
      second
    } = options;

    const raw = Temporal.PlainDateTime.from({ hour, minute, second });

    return new FTime(raw);
  }
}

export function now() {
  return new FDateTime(Temporal.Now.plainDateTimeISO());
}

export function dateTime(options: { from: string }) : FDateTime {

  const {
    from
  } = options;

  if (from.startsWith('-')) {
    throw notImplemented('negative date time');
  }

  return tryParse(() => {
    if (isZoned(from)) {
      const raw = Temporal.ZonedDateTime.from(from);

      return new FDateTime(raw);
    } else {
      const raw = Temporal.PlainDateTime.from(from);

      return new FDateTime(raw);
    }
  });
}

export function temporal(options: { from: string }) : FDate | FTime | FDateTime {

  const {
    from
  } = options;

  if (from.includes('T')) {
    return dateTime({ from });
  }

  if (/\d{1,2}:\d{1,2}:\d{1,2}/.test(from)) {
    return time({ from });
  }

  return date({ from });
}

function isZoned(from: string) {
  return from.includes('@') || from.includes('+') || from.toLowerCase().includes('z');
}

function tryParse<T>(fn: () => T) : T {

  try {
    return fn();
  } catch (err) {
    if (err instanceof RangeError) {

      console.warn('tryParse', err);

      return null;
    }

    throw err;
  }
}