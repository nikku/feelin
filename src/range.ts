import { toComparable } from './temporal.js';

import { getType } from './types.js';

/**
 * This module is the single place in the code base that deals with FEEL
 * <range> values.
 *
 * A {@link FeelRange} is pure data (its bounds and their inclusion) plus a
 * non-enumerable {@link FeelRange#valueType} that records the FEEL type of
 * its elements (e.g. `number`, `date`). All behavior — membership
 * ({@link FeelRange#includes}), iteration ({@link FeelRange#map}) and the
 * range relation functions ({@link before}, {@link meets},
 * {@link includes}) — is derived from that data through a single
 * comparator ({@link cmp}). Because the comparator routes temporal values
 * through {@link toComparable}, ranges of dates, times and durations
 * compare correctly, just like ranges of numbers and strings.
 */

/**
 * A value that may appear as a range bound: a number, a string or a FEEL
 * temporal value (date, time, date time or duration).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RangeValue = any;

export type FeelRangeProps = {
  'start included': boolean;
  'end included': boolean;
  start: RangeValue | null;
  end: RangeValue | null;
  valueType: string | null;
};

/**
 * A FEEL <range> (e.g. `[1..10]`, `(date("2020-01-01")..date("2020-12-31")]`).
 *
 * The FEEL-visible properties are `start`, `end`, `start included` and
 * `end included`. The element type is tracked separately (and
 * non-enumerably) as {@link valueType} so it does not leak into context
 * spreads or path access.
 */
export class FeelRange {

  'start included': boolean;
  'end included': boolean;
  start: RangeValue | null;
  end: RangeValue | null;

  /**
   * @internal FEEL type of the range elements, `null` for the empty range
   */
  valueType: string | null;

  constructor(props: FeelRangeProps) {
    Object.assign(this, props);

    // the element type is identity, not a FEEL-visible property; keep it
    // non-enumerable so it does not leak into context spreads / path access
    Object.defineProperty(this, 'valueType', { enumerable: false });
  }

  /**
   * Whether the range includes the given point or range. Returns `null`
   * for the empty range or a `null` probe.
   */
  includes(value: RangeValue | null) : boolean | null {
    return rangeIncludes(this, value);
  }

  /**
   * Enumerate the range, applying `fn` to each element. Only defined for
   * closed number ranges and single-character string ranges.
   */
  map<T>(fn: (val: RangeValue) => T) : T[] {
    return rangeMap(this, fn);
  }

  toString() : string {
    const startBracket = this['start included'] ? '[' : '(';
    const endBracket = this['end included'] ? ']' : ')';

    return `${startBracket}${this.start}..${this.end}${endBracket}`;
  }
}


// comparator ////////////////////////////////////////////////////////

/**
 * Reduce a range value to something orderable: temporal values become
 * their comparable number, everything else (numbers, strings) is used
 * as-is.
 */
function comparable(value: RangeValue) : RangeValue {
  const c = toComparable(value);

  return c === null ? value : c;
}

/**
 * Compare two same-typed, non-null range values. Returns `-1`, `0` or
 * `1`.
 */
function cmp(a: RangeValue, b: RangeValue) : number {
  const ca = comparable(a);
  const cb = comparable(b);

  if (ca < cb) {
    return -1;
  }

  if (ca > cb) {
    return 1;
  }

  return 0;
}


// membership ////////////////////////////////////////////////////////

function afterStart(value, start, startIncluded) {
  if (start === null) {
    return true;
  }

  const c = cmp(value, start);

  return startIncluded ? c >= 0 : c > 0;
}

function beforeEnd(value, end, endIncluded) {
  if (end === null) {
    return true;
  }

  const c = cmp(value, end);

  return endIncluded ? c <= 0 : c < 0;
}

function rangeIncludes(range: FeelRange, value: RangeValue | null) : boolean | null {

  let { start, end } = range;
  let startIncluded = range['start included'];
  let endIncluded = range['end included'];

  // empty range
  if (start === null && end === null) {
    return null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof FeelRange) {
    return rangeIncludesRange(range, value);
  }

  // normalize a descending range (e.g. `[10..1]`) so bounds are ordered
  if (start !== null && end !== null && cmp(start, end) > 0) {
    [ start, end ] = [ end, start ];
    [ startIncluded, endIncluded ] = [ endIncluded, startIncluded ];
  }

  return (
    afterStart(value, start, startIncluded) &&
    beforeEnd(value, end, endIncluded)
  );
}

function rangeIncludesRange(container: FeelRange, value: FeelRange) : boolean {

  const startOk = container.start === null || (
    value.start !== null && (() => {
      const c = cmp(container.start, value.start);

      return c < 0 || (
        c === 0 && (container['start included'] || !value['start included'])
      );
    })()
  );

  const endOk = container.end === null || (
    value.end !== null && (() => {
      const c = cmp(container.end, value.end);

      return c > 0 || (
        c === 0 && (container['end included'] || !value['end included'])
      );
    })()
  );

  return startOk && endOk;
}


// relations (used by built-in range functions) //////////////////////

/**
 * Whether `a` is (entirely) before `b`. Both operands may be a point or
 * a {@link FeelRange}.
 */
export function before(a: RangeValue, b: RangeValue) : boolean {

  if (a instanceof FeelRange && b instanceof FeelRange) {
    const c = cmp(a.end, b.start);

    return c < 0 || (
      c === 0 && (!a['end included'] || !b['start included'])
    );
  }

  if (a instanceof FeelRange) {
    const c = cmp(a.end, b);

    return c < 0 || (c === 0 && !a['end included']);
  }

  if (b instanceof FeelRange) {
    const c = cmp(b.start, a);

    return c > 0 || (c === 0 && !b['start included']);
  }

  return cmp(a, b) < 0;
}

/**
 * Whether range `a` meets range `b`, i.e. `a` ends exactly where `b`
 * starts, both inclusive.
 */
export function meets(a: FeelRange, b: FeelRange) : boolean {
  return (
    cmp(a.end, b.start) === 0 &&
    a['end included'] === true &&
    b['start included'] === true
  );
}

/**
 * Whether `range` includes the given point or range.
 */
export function includes(range: FeelRange, value: RangeValue) : boolean | null {

  if (!(range instanceof FeelRange)) {
    return false;
  }

  return rangeIncludes(range, value);
}


// iteration /////////////////////////////////////////////////////////

const chars = Array.from(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
);

function rangeMap<T>(range: FeelRange, fn: (val: RangeValue) => T) : T[] {

  const { start, end, valueType } = range;

  // empty range
  if (start === null && end === null) {
    return [];
  }

  if (valueType === 'number' && start !== null && end !== null) {
    return numberRangeMap(start, end, range['start included'], range['end included'], fn);
  }

  if (valueType === 'string' && start !== null && end !== null) {
    const values = charRangeValues(start, end, range['start included'], range['end included']);

    if (values) {
      return values.map(fn);
    }
  }

  throw new Error('unsupported range operation: map');
}

function numberRangeMap<T>(start, end, startIncluded, endIncluded, fn: (val) => T) : T[] {

  const direction = start > end ? -1 : 1;

  const result: T[] = [];

  for (let i = start;; i += direction) {

    if (i === start && !startIncluded) {
      continue;
    }

    if (i === end && !endIncluded) {
      break;
    }

    result.push(fn(i));

    if (i === end) {
      break;
    }
  }

  return result;
}

function charRangeValues(start, end, startIncluded, endIncluded) : string[] | null {

  if (!chars.includes(start) || !chars.includes(end)) {
    return null;
  }

  let startIdx = chars.indexOf(start);
  let endIdx = chars.indexOf(end);

  const direction = startIdx > endIdx ? -1 : 1;

  if (startIncluded === false) {
    startIdx += direction;
  }

  if (endIncluded === false) {
    endIdx -= direction;
  }

  return chars.slice(
    Math.min(startIdx, endIdx),
    Math.max(startIdx, endIdx) + 1
  );
}


// construction //////////////////////////////////////////////////////

const RANGE_TYPES = [ 'string', 'number', 'duration', 'time', 'date time', 'date' ];

function isTyped(type: string, values: RangeValue[]) : boolean {
  return (
    values.some(e => getType(e) === type) &&
    values.every(e => e === null || getType(e) === type)
  );
}

/**
 * Create a {@link FeelRange} from its bounds, inferring the element type.
 */
export function createRange(
    start: RangeValue | null,
    end: RangeValue | null,
    startIncluded = true,
    endIncluded = true
) : FeelRange {

  const valueType = RANGE_TYPES.find(type => isTyped(type, [ start, end ])) ?? null;

  if (valueType === null && !(start === null && end === null)) {
    throw new Error(`unsupported range: ${start}..${end}`);
  }

  return new FeelRange({
    start,
    end,
    'start included': startIncluded,
    'end included': endIncluded,
    valueType
  });
}
