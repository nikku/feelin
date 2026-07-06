import { Temporal } from 'temporal-polyfill';

import { notImplemented } from './utils.js';

/**
 * This module is the single place in the code base that talks to the
 * underlying temporal implementation ({@link Temporal}, provided by
 * `temporal-polyfill`).
 *
 * FEEL temporal values are represented by the wrapper classes
 * {@link FeelDate}, {@link FeelTime}, {@link FeelDateTime} and
 * {@link FeelDuration}. Consumers of the library interact with these
 * wrappers (via `toString()`, component getters and `unwrap()`) rather
 * than with raw `Temporal` objects. This keeps the temporal
 * implementation a swappable internal detail.
 */

/**
 * A fixed reference date used to anchor zoned times and to compute
 * duration totals that require a `relativeTo` (years / months).
 */
const REFERENCE_DATE = Temporal.PlainDate.from('1970-01-01');


// wrapper classes ///////////////////////////////////////////////////

/**
 * A FEEL <date> (e.g. `2020-04-06`).
 */
export class FeelDate {

  /**
   * @internal underlying temporal value
   */
  readonly value: Temporal.PlainDate;

  constructor(value: Temporal.PlainDate) {
    this.value = value;
  }

  get year() { return this.value.year; }
  get month() { return this.value.month; }
  get day() { return this.value.day; }
  get 'day of year'() { return this.value.dayOfYear; }
  get 'day of week'() { return this.value.dayOfWeek; }
  get 'week of year'() { return this.value.weekOfYear; }

  /**
   * Return the underlying `Temporal.PlainDate`.
   *
   * Escape hatch for consumers that need the raw temporal value. The
   * returned type is implementation specific and may change.
   */
  unwrap() : Temporal.PlainDate {
    return this.value;
  }

  toString() : string {
    return this.value.toString();
  }
}

/**
 * A FEEL <time>, either local (e.g. `10:30:00`) or zoned
 * (e.g. `10:30:00Z`, `10:30:00+05:00`, `10:30:00@Europe/Paris`).
 */
export class FeelTime {

  /**
   * @internal wall-clock time
   */
  readonly value: Temporal.PlainTime;

  /**
   * @internal time zone identifier, `null` for a local time
   */
  readonly zone: string | null;

  constructor(value: Temporal.PlainTime, zone: string | null = null) {
    this.value = value;
    this.zone = zone;
  }

  get hour() { return this.value.hour; }
  get minute() { return this.value.minute; }
  get second() { return this.value.second; }
  get timezone() { return this.zone; }

  /**
   * The zone offset as a {@link FeelDuration}, or `null` for a local time.
   */
  get 'time offset'() {
    return this.zone === null ? null : zoneOffset(this);
  }

  /**
   * Return the underlying wall-clock `Temporal.PlainTime`.
   *
   * Escape hatch for consumers that need the raw temporal value. Zone
   * information is available via {@link timezone} / {@link 'time offset'}.
   */
  unwrap() : Temporal.PlainTime {
    return this.value;
  }

  toString() : string {
    return this.value.toString() + (this.zone === null ? '' : zoneSuffix(this.zone));
  }
}

/**
 * A FEEL <date and time>, either local (e.g. `2020-04-06T10:30:00`) or
 * zoned (e.g. `...Z`, `...+05:00`, `...@Europe/Paris`).
 */
export class FeelDateTime {

  /**
   * @internal wall-clock date and time
   */
  readonly value: Temporal.PlainDateTime;

  /**
   * @internal time zone identifier, `null` for a local date time
   */
  readonly zone: string | null;

  constructor(value: Temporal.PlainDateTime, zone: string | null = null) {
    this.value = value;
    this.zone = zone;
  }

  get year() { return this.value.year; }
  get month() { return this.value.month; }
  get day() { return this.value.day; }
  get hour() { return this.value.hour; }
  get minute() { return this.value.minute; }
  get second() { return this.value.second; }
  get 'day of year'() { return this.value.dayOfYear; }
  get 'day of week'() { return this.value.dayOfWeek; }
  get 'week of year'() { return this.value.weekOfYear; }
  get timezone() { return this.zone; }

  get 'time offset'() {
    return this.zone === null ? null : zoneOffset(this);
  }

  /**
   * Return the underlying wall-clock `Temporal.PlainDateTime`.
   *
   * Escape hatch for consumers that need the raw temporal value. Zone
   * information is available via {@link timezone} / {@link 'time offset'}.
   */
  unwrap() : Temporal.PlainDateTime {
    return this.value;
  }

  toString() : string {
    return this.value.toString() + (this.zone === null ? '' : zoneSuffix(this.zone));
  }
}

/**
 * A FEEL <duration>, both `years and months` and `days and time`
 * durations (e.g. `P1Y2M`, `P2DT3H`).
 */
export class FeelDuration {

  /**
   * @internal normalized underlying duration
   */
  readonly value: Temporal.Duration;

  /**
   * @internal whether this is a years and months (rather than a
   * days and time) duration; retained so the category survives even a
   * zero-valued duration (e.g. `P0M` vs `PT0S`)
   */
  readonly yearsMonths: boolean;

  constructor(value: Temporal.Duration, yearsMonths?: boolean) {
    this.value = normalize(value);
    this.yearsMonths = yearsMonths ?? isYearsMonths(this.value);
  }

  get years() { return this.yearsMonths ? this.value.years : null; }
  get months() { return this.yearsMonths ? this.value.months : null; }
  get days() { return this.yearsMonths ? null : this.value.days; }
  get hours() { return this.yearsMonths ? null : this.value.hours; }
  get minutes() { return this.yearsMonths ? null : this.value.minutes; }
  get seconds() { return this.yearsMonths ? null : this.value.seconds; }

  /**
   * Return the underlying `Temporal.Duration`.
   *
   * Escape hatch for consumers that need the raw temporal value. The
   * returned type is implementation specific and may change.
   */
  unwrap() : Temporal.Duration {
    return this.value;
  }

  toString() : string {

    // a zero years and months duration would otherwise stringify as
    // `PT0S`, dropping its category
    if (this.yearsMonths && this.value.sign === 0) {
      return 'P0M';
    }

    return this.value.toString();
  }
}

/**
 * Any FEEL temporal instant (date, time or date time).
 */
export type FeelTemporal = FeelDate | FeelTime | FeelDateTime;


// type guards ///////////////////////////////////////////////////////

export function isDate(obj) : obj is FeelDate {
  return obj instanceof FeelDate;
}

export function isTime(obj) : obj is FeelTime {
  return obj instanceof FeelTime;
}

export function isDateTime(obj) : obj is FeelDateTime {
  return obj instanceof FeelDateTime;
}

export function isDuration(obj) : obj is FeelDuration {
  return obj instanceof FeelDuration;
}

/**
 * Whether the value is any temporal instant (date, time or date time),
 * i.e. anything but a duration.
 */
export function isTemporal(obj) : obj is FeelTemporal {
  return isDate(obj) || isTime(obj) || isDateTime(obj);
}

/**
 * Whether the temporal value carries a time zone.
 */
export function isZoned(obj) : boolean {
  return (isTime(obj) || isDateTime(obj)) && obj.zone !== null;
}


// zone helpers //////////////////////////////////////////////////////

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

  const offsetMatch = /[+-]\d{2}:\d{2}(:\d{2})?$/.exec(str);

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
 * Return the FEEL time zone suffix for a time zone identifier, e.g.
 * `Z`, `+05:00` or `@Europe/Paris`.
 */
function zoneSuffix(zone: string) : string {

  if (zone === 'UTC') {
    return 'Z';
  }

  if (/^[+-]\d{2}:\d{2}(:\d{2})?$/.test(zone)) {
    return zone;
  }

  return '@' + zone;
}

/**
 * The offset, in seconds, of a fixed numeric offset zone
 * (`+HH:MM` or `+HH:MM:SS`). Returns `null` for named zones (including
 * `UTC`), which are resolved through Temporal instead.
 *
 * Temporal itself only accepts offset zones to minute precision, so
 * sub-minute offsets are handled through this manual path.
 */
function offsetZoneSeconds(zone: string | null) : number | null {

  if (zone === null) {
    return null;
  }

  const match = /^([+-])(\d{2}):(\d{2}):(\d{2})$/.exec(zone);

  if (!match) {
    return null;
  }

  const sign = match[1] === '-' ? -1 : 1;

  return sign * (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4]));
}

/**
 * Resolve a zoned temporal to a concrete `Temporal.ZonedDateTime`,
 * anchoring zoned times to {@link REFERENCE_DATE}.
 */
function zonedDateTime(temporal: FeelTime | FeelDateTime) : Temporal.ZonedDateTime {

  if (temporal instanceof FeelTime) {
    return REFERENCE_DATE.toZonedDateTime({
      plainTime: temporal.value,
      timeZone: temporal.zone
    });
  }

  return temporal.value.toZonedDateTime(temporal.zone);
}

/**
 * Return the zone offset of a zoned date time as a {@link FeelDuration}.
 */
function offsetDuration(zdt: Temporal.ZonedDateTime) : FeelDuration {
  return new FeelDuration(Temporal.Duration.from({ nanoseconds: zdt.offsetNanoseconds }));
}

/**
 * Return the zone offset of a zoned temporal as a {@link FeelDuration}.
 *
 * Sub-minute numeric offsets are resolved directly (Temporal only
 * supports offset zones to minute precision); everything else is
 * resolved through {@link zonedDateTime}.
 */
function zoneOffset(temporal: FeelTime | FeelDateTime) : FeelDuration {

  const seconds = offsetZoneSeconds(temporal.zone);

  if (seconds !== null) {
    return new FeelDuration(Temporal.Duration.from({ seconds }), false);
  }

  return offsetDuration(zonedDateTime(temporal));
}


// comparison ////////////////////////////////////////////////////////

/**
 * Convert a temporal value to a comparable number of milliseconds.
 *
 * Wall-clock (zone-less) values are anchored to UTC so they compare
 * consistently among themselves.
 */
export function toComparable(value) : number | null {

  if (isDate(value)) {
    return value.value.toZonedDateTime('UTC').epochMilliseconds;
  }

  if (isTime(value) || isDateTime(value)) {

    const offsetSeconds = offsetZoneSeconds(value.zone);

    // sub-minute offset zone: interpret the wall clock at UTC, then
    // shift by the fixed offset (Temporal rejects such offset zones)
    if (offsetSeconds !== null) {
      const utcEpoch = (value instanceof FeelTime
        ? REFERENCE_DATE.toZonedDateTime({ plainTime: value.value, timeZone: 'UTC' })
        : value.value.toZonedDateTime('UTC')
      ).epochMilliseconds;

      return utcEpoch - offsetSeconds * 1000;
    }

    const zone = value.zone ?? 'UTC';

    return (value instanceof FeelTime
      ? REFERENCE_DATE.toZonedDateTime({ plainTime: value.value, timeZone: zone })
      : value.value.toZonedDateTime(zone)
    ).epochMilliseconds;
  }

  if (isDuration(value)) {
    return value.value.total({ unit: 'millisecond', relativeTo: REFERENCE_DATE });
  }

  return null;
}


// duration //////////////////////////////////////////////////////////

/**
 * Normalize a duration: years / months durations balance into years and
 * months, everything else balances into days and time.
 */
function normalize(d: Temporal.Duration) : Temporal.Duration {

  if (d.years !== 0 || d.months !== 0) {
    return d.round({ largestUnit: 'year', relativeTo: REFERENCE_DATE });
  }

  return d.round({ largestUnit: 'day', relativeTo: REFERENCE_DATE });
}

/**
 * Whether a duration is a years and months duration (rather than a
 * days and time duration). Years and months durations only expose
 * `years` / `months` components; days and time durations only expose
 * `days` / `hours` / `minutes` / `seconds`.
 */
function isYearsMonths(d: Temporal.Duration) : boolean {
  return d.years !== 0 || d.months !== 0;
}

/**
 * Whether an ISO-8601 duration literal denotes a years and months
 * duration, i.e. carries a year (`Y`) or month (`M`) component in its
 * date part. Retains the category even when the value is zero
 * (`P0Y` / `P0M` vs `P0D` / `PT0S`).
 */
function isYearsMonthsString(str: string) : boolean {
  const datePart = str.split('T')[0];
  return /[YM]/.test(datePart);
}

/**
 * Whether two durations are equal, comparing years / months durations by
 * month and days / time durations by second (mirroring FEEL semantics).
 */
export function durationEquals(a: FeelDuration, b: FeelDuration) : boolean {

  const total = (d: FeelDuration, unit) => d.value.total({ unit, relativeTo: REFERENCE_DATE });

  // years and months duration -> compare in months
  if (Math.abs(total(a, 'day')) > 180) {
    return Math.trunc(total(a, 'month') - total(b, 'month')) === 0;
  }

  // days and time duration -> compare in seconds
  return Math.trunc(total(a, 'second') - total(b, 'second')) === 0;
}

export function duration(opts: string | number) : FeelDuration {

  if (typeof opts === 'number') {
    return new FeelDuration(Temporal.Duration.from({ milliseconds: opts }), false);
  }

  return new FeelDuration(Temporal.Duration.from(opts), isYearsMonthsString(opts));
}

/**
 * Return the absolute (non-negative) value of a duration.
 */
export function absDuration(d: FeelDuration) : FeelDuration {
  return new FeelDuration(d.value.abs(), d.yearsMonths);
}

/**
 * Whether a duration carries a sub-day (time) component.
 */
function hasTimeComponent(d: FeelDuration) : boolean {
  const { hours, minutes, seconds, milliseconds } = d.value;

  return !!(hours || minutes || seconds || milliseconds);
}


// arithmetic ////////////////////////////////////////////////////////

/**
 * Add (`sign > 0`) or subtract (`sign < 0`) a duration from a temporal
 * instant, returning a new temporal instant.
 *
 * A local <date> combined with a time-bearing duration is promoted to a
 * UTC <date and time> (bare dates are anchored in UTC).
 */
export function addDuration(temporal: FeelTemporal, dur: FeelDuration, sign: number) : FeelTemporal {

  const d = sign < 0 ? dur.value.negated() : dur.value;

  if (isDate(temporal)) {

    if (hasTimeComponent(dur)) {
      return new FeelDateTime(temporal.value.toPlainDateTime().add(d), 'UTC');
    }

    return new FeelDate(temporal.value.add(d));
  }

  if (isTime(temporal)) {

    // times wrap around midnight and keep their zone
    return new FeelTime(temporal.value.add(d), temporal.zone);
  }

  // date time
  if (temporal.zone === null) {
    return new FeelDateTime(temporal.value.add(d), null);
  }

  // a fixed sub-minute offset has no DST, so shifting the wall clock is
  // equivalent (and Temporal rejects such offset zones anyway)
  if (offsetZoneSeconds(temporal.zone) !== null) {
    return new FeelDateTime(temporal.value.add(d), temporal.zone);
  }

  // honor the zone (e.g. DST) for zoned date times
  const shifted = temporal.value.toZonedDateTime(temporal.zone).add(d);

  return new FeelDateTime(shifted.toPlainDateTime(), temporal.zone);
}

/**
 * Subtract two temporal instants, yielding a {@link FeelDuration}.
 */
export function subtractTemporals(a: FeelTemporal, b: FeelTemporal) : FeelDuration {

  if (isTime(a) && isTime(b)) {
    return new FeelDuration(a.value.since(b.value));
  }

  const left = toPlainDateTime(a);
  const right = toPlainDateTime(b);

  return new FeelDuration(left.since(right, { largestUnit: 'day' }));
}

/**
 * Add or subtract two durations.
 */
export function addDurations(a: FeelDuration, b: FeelDuration, sign: number) : FeelDuration {

  const other = sign < 0 ? b.value.negated() : b.value;

  // anchor to a reference point so mixed years / months and days / time
  // durations can be combined without a calendar-less RangeError
  const anchor = REFERENCE_DATE.toPlainDateTime();

  const result = anchor.add(a.value).add(other).since(anchor, { largestUnit: 'year' });

  // keep the category from the value; only fall back to the operands'
  // category when the result is zero (and thus category-less)
  const yearsMonths = result.sign === 0
    ? a.yearsMonths || b.yearsMonths
    : isYearsMonths(result);

  return new FeelDuration(result, yearsMonths);
}

/**
 * The <years and months duration> between two dates.
 */
export function yearsAndMonthsDuration(from: FeelDate, to: FeelDate) : FeelDuration {
  return new FeelDuration(from.value.until(to.value, { largestUnit: 'month' }), true);
}


// conversions ///////////////////////////////////////////////////////

function toPlainDateTime(temporal: FeelTemporal) : Temporal.PlainDateTime {

  if (isDate(temporal)) {
    return temporal.value.toPlainDateTime();
  }

  if (isDateTime(temporal)) {
    return temporal.value;
  }

  // time
  return REFERENCE_DATE.toPlainDateTime(temporal.value);
}

/**
 * Extract the calendar date of a date time.
 */
export function dateOf(dateTime: FeelDateTime) : FeelDate {
  return new FeelDate(dateTime.value.toPlainDate());
}

/**
 * Extract the time-of-day of a date time, preserving its time zone.
 */
export function timeOf(dateTime: FeelDateTime) : FeelTime {
  return new FeelTime(dateTime.value.toPlainTime(), dateTime.zone);
}

/**
 * Combine a date (or the date part of a date time) with a time into a
 * date time, carrying over the time's zone.
 */
export function combine(date: FeelDate | FeelDateTime, time: FeelTime) : FeelDateTime {

  const datePart = isDate(date) ? date.value : date.value.toPlainDate();

  return new FeelDateTime(datePart.toPlainDateTime(time.value), time.zone);
}


// construction //////////////////////////////////////////////////////

/**
 * Construct a {@link FeelDate} from components, returning `null` for
 * invalid input.
 */
export function dateFrom(year: number, month: number, day: number) : FeelDate | null {
  try {
    return new FeelDate(Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' }));
  } catch {
    return null;
  }
}

/**
 * Construct a {@link FeelTime} from components, returning `null` for
 * invalid input.
 *
 * An optional `offset` (a days and time duration) sets the time's zone,
 * e.g. `duration("PT5H")` yields a `+05:00` time.
 */
export function timeFrom(hour: number, minute: number, second: number, offset: FeelDuration | null = null) : FeelTime | null {
  try {
    const value = Temporal.PlainTime.from({ hour, minute, second }, { overflow: 'reject' });

    const zone = offset ? offsetZone(offset) : null;

    if (zone !== null) {

      const offsetSeconds = offsetZoneSeconds(zone);

      if (offsetSeconds !== null) {

        // sub-minute offset: validate the range manually, as Temporal
        // rejects offset zones with second precision
        if (Math.abs(offsetSeconds) >= 24 * 3600) {
          return null;
        }
      } else {

        // validate the offset (throws for an out-of-range offset)
        REFERENCE_DATE.toZonedDateTime({ plainTime: value, timeZone: zone });
      }
    }

    return new FeelTime(value, zone);
  } catch {
    return null;
  }
}

/**
 * Convert a days and time duration into a fixed-offset time zone
 * identifier, e.g. `+05:00`, `-01:00` or `+05:30:15`.
 */
function offsetZone(offset: FeelDuration) : string {

  const totalSeconds = Math.trunc(
    offset.value.total({ unit: 'second', relativeTo: REFERENCE_DATE })
  );

  const sign = totalSeconds < 0 ? '-' : '+';
  const abs = Math.abs(totalSeconds);

  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  const base = `${sign}${pad(hours)}:${pad(minutes)}`;

  return seconds ? `${base}:${pad(seconds)}` : base;
}


// parsing ///////////////////////////////////////////////////////////

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
    return new FeelDate(Temporal.PlainDate.from(str));
  } catch {
    return null;
  }
}

/**
 * Parse a FEEL <time> string (`10:30:00`, `10:30:00Z`,
 * `10:30:00+01:00`, `10:30:00@Europe/Paris`).
 */
export function parseTime(str: string) : FeelTime | null {

  const { value, zone } = splitZone(str);

  try {
    return new FeelTime(Temporal.PlainTime.from(value), zone);
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

    // validate the zone (throws for an unknown zone); sub-minute offset
    // zones are validated by range, as Temporal rejects them
    if (zone !== null) {

      const offsetSeconds = offsetZoneSeconds(zone);

      if (offsetSeconds !== null) {
        if (Math.abs(offsetSeconds) >= 24 * 3600) {
          return null;
        }
      } else {
        new Temporal.PlainDateTime(1970, 1, 1).toZonedDateTime(zone);
      }
    }

    return new FeelDateTime(Temporal.PlainDateTime.from(value), zone);
  } catch {
    return null;
  }
}


// public factories //////////////////////////////////////////////////

/**
 * Parse a FEEL date-ish string into the most specific temporal value:
 * a plain <date> or, if the string carries a time / zone, a
 * <date and time>.
 */
export function date(str: string) : FeelTemporal | null {

  if (str.includes('T')) {
    return parseDateTime(str);
  }

  return parseDate(str);
}

/**
 * Parse a FEEL <time> string into a {@link FeelTime}.
 */
export function time(str: string) : FeelTime | null {
  return parseTime(str);
}

/**
 * Parse a FEEL <date and time> string into a {@link FeelDateTime}.
 */
export function dateAndTime(str: string) : FeelDateTime | null {
  return parseDateTime(str);
}

/**
 * The current system date and time as a zoned value.
 */
export function now() : FeelDateTime {
  const zdt = Temporal.Now.zonedDateTimeISO();

  return new FeelDateTime(zdt.toPlainDateTime(), zdt.timeZoneId);
}

/**
 * The current system date.
 */
export function today() : FeelDate {
  return new FeelDate(Temporal.Now.plainDateISO());
}


// coercion //////////////////////////////////////////////////////////

/**
 * Coerce a raw temporal value into its FEEL wrapper.
 *
 * Accepts the wrapper types (returned as-is), native `Temporal` values
 * and native `Date` instances. Anything else is returned untouched.
 */
export function toFeel(value) {

  if (isDate(value) || isTime(value) || isDateTime(value) || isDuration(value)) {
    return value;
  }

  if (value instanceof Temporal.PlainDate) {
    return new FeelDate(value);
  }

  if (value instanceof Temporal.PlainTime) {
    return new FeelTime(value);
  }

  if (value instanceof Temporal.PlainDateTime) {
    return new FeelDateTime(value);
  }

  if (value instanceof Temporal.ZonedDateTime) {
    return new FeelDateTime(value.toPlainDateTime(), value.timeZoneId);
  }

  if (value instanceof Temporal.Duration) {
    return new FeelDuration(value);
  }

  if (value instanceof Date) {
    const zdt = Temporal.Instant
      .fromEpochMilliseconds(value.getTime())
      .toZonedDateTimeISO('UTC');

    return new FeelDateTime(zdt.toPlainDateTime(), 'UTC');
  }

  return value;
}
