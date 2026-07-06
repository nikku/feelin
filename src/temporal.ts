import { Temporal } from 'temporal-polyfill';

import {
  isDate,
  isTime,
  isDateTime,
  isDuration,
  isZonedTime,
  isZonedDateTime
} from './types.js';

export {
  isDate,
  isTime,
  isDateTime,
  isDuration,
  isZonedTime,
  isZonedDateTime
};

import { notImplemented } from './utils.js';


/**
 * A fixed reference date used to anchor zoned times and to compute
 * duration totals that require a `relativeTo` (years / months).
 */
export const REFERENCE_DATE = Temporal.PlainDate.from('1970-01-01');

/**
 * A FEEL <time> that carries a time zone.
 *
 * Temporal has no native "time with zone" type, so we anchor the
 * time-of-day to {@link REFERENCE_DATE}. This keeps named zones (e.g.
 * `Europe/Paris`) resolvable to a concrete offset and allows instant
 * based comparison via `epochMilliseconds`.
 */
export class ZonedTime {
  readonly value: Temporal.ZonedDateTime;

  constructor(value: Temporal.ZonedDateTime) {
    this.value = value;
  }
}

export type FeelDate = Temporal.PlainDate;
export type FeelTime = Temporal.PlainTime | ZonedTime;
export type FeelDateTime = Temporal.PlainDateTime | Temporal.ZonedDateTime;
export type FeelDuration = Temporal.Duration;
export type FeelTemporal = FeelDate | FeelTime | FeelDateTime;


/**
 * Split a trailing time zone indicator off an ISO date / time string.
 *
 * Recognizes `Z`, numeric offsets (`+HH:MM`) and named zones (`@Zone`).
 * Returns the time zone as a Temporal time zone identifier
 * (`Z` becomes `UTC`).
 */
function splitZone(str: string) : { value: string, zone: string | null } {

  const atIndex = str.indexOf('@');

  if (atIndex !== -1) {
    return {
      value: str.substring(0, atIndex),
      zone: str.substring(atIndex + 1)
    };
  }

  if (/z$/i.test(str)) {
    return {
      value: str.substring(0, str.length - 1),
      zone: 'UTC'
    };
  }

  const offsetMatch = /[+-]\d{2}:\d{2}$/.exec(str);

  if (offsetMatch) {
    return {
      value: str.substring(0, offsetMatch.index),
      zone: offsetMatch[0]
    };
  }

  return {
    value: str,
    zone: null
  };
}

/**
 * Return the time zone suffix for a zoned value, e.g.
 * `Z`, `+05:00` or `@Europe/Paris`.
 */
export function zoneSuffix(value: Temporal.ZonedDateTime) : string {

  const id = value.timeZoneId;

  if (id === 'UTC') {
    return 'Z';
  }

  if (/^[+-]\d{2}:\d{2}$/.test(id)) {
    return id;
  }

  return '@' + id;
}

/**
 * Convert any temporal value to a comparable number of milliseconds.
 *
 * Wall-clock (zone-less) values are anchored to UTC so they compare
 * consistently among themselves.
 */
export function toComparable(value) : number | null {

  if (value instanceof Temporal.ZonedDateTime) {
    return value.epochMilliseconds;
  }

  if (value instanceof ZonedTime) {
    return value.value.epochMilliseconds;
  }

  if (value instanceof Temporal.PlainDate) {
    return value.toZonedDateTime('UTC').epochMilliseconds;
  }

  if (value instanceof Temporal.PlainDateTime) {
    return value.toZonedDateTime('UTC').epochMilliseconds;
  }

  if (value instanceof Temporal.PlainTime) {
    return REFERENCE_DATE.toPlainDateTime(value).toZonedDateTime('UTC').epochMilliseconds;
  }

  if (value instanceof Temporal.Duration) {
    return durationToMillis(value);
  }

  return null;
}

export function durationToMillis(d: Temporal.Duration) : number {
  return d.total({ unit: 'millisecond', relativeTo: REFERENCE_DATE });
}

/**
 * Normalize a duration for output: years / months durations balance
 * into years and months, everything else balances into days and time.
 */
export function normalizeDuration(d: Temporal.Duration) : Temporal.Duration {

  if (d.years !== 0 || d.months !== 0) {
    return d.round({ largestUnit: 'year', relativeTo: REFERENCE_DATE });
  }

  return d.round({ largestUnit: 'day' });
}

export function duration(opts: string | number) : FeelDuration {

  if (typeof opts === 'number') {
    return Temporal.Duration.from({ milliseconds: opts });
  }

  return Temporal.Duration.from(opts);
}

/**
 * Parse a FEEL <date> string (`2020-01-01`).
 *
 * Returns `null` if the input is not a valid date.
 */
export function parseDate(str: string) : FeelDate | null {

  if (str.startsWith('-')) {
    throw notImplemented('negative date');
  }

  try {
    return Temporal.PlainDate.from(str);
  } catch {
    return null;
  }
}

/**
 * Parse a FEEL date-ish string into the most specific temporal value:
 * a plain <date> or, if the string carries a time / zone, a <date and time>.
 *
 * Primarily used to build expected values and as a public convenience export.
 */
export function date(str: string) : FeelTemporal | null {

  if (str.includes('T')) {
    return parseDateTime(str);
  }

  return parseDate(str);
}

/**
 * Parse a FEEL <time> string (`10:30:00`, `10:30:00Z`,
 * `10:30:00+01:00`, `10:30:00@Europe/Paris`).
 */
export function parseTime(str: string) : FeelTime | null {

  const { value, zone } = splitZone(str);

  try {
    const plainTime = Temporal.PlainTime.from(value);

    if (zone === null) {
      return plainTime;
    }

    return zonedTime(plainTime, zone);
  } catch {
    return null;
  }
}

/**
 * Parse a FEEL <date and time> string (`2020-01-01T10:30:00`,
 * `...Z`, `...@Europe/Paris`).
 */
export function parseDateTime(str: string) : FeelDateTime | null {

  if (str.startsWith('-')) {
    throw notImplemented('negative date');
  }

  const { value: parsedValue, zone } = splitZone(str);

  let value = parsedValue;

  if (!value.includes('T')) {
    value = value + 'T00:00:00';
  }

  try {
    const plainDateTime = Temporal.PlainDateTime.from(value);

    if (zone === null) {
      return plainDateTime;
    }

    return plainDateTime.toZonedDateTime(zone);
  } catch {
    return null;
  }
}

/**
 * Create a zoned time from a plain time and a time zone identifier.
 */
export function zonedTime(plainTime: Temporal.PlainTime, timeZone: string) : ZonedTime {
  return new ZonedTime(REFERENCE_DATE.toZonedDateTime({ plainTime, timeZone }));
}

/**
 * The current system date and time as a zoned value.
 */
export function now() : Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO();
}

/**
 * The current system date.
 */
export function today() : Temporal.PlainDate {
  return Temporal.Now.plainDateISO();
}
