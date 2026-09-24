import {
  getType
} from './types.js';

/**
 * Renders values for human inspection (warning messages).
 * Sample-based and deterministic: bounded entries, nesting depth
 * and string length.
 */

// caps for sample-based rendering: keep messages concise and deterministic
const MAX_SAMPLE_ITEMS = 3;

// when truncating, show fewer samples: the truncation marker
// communicates volume better than a third entry
const MAX_SAMPLE_ITEMS_TRUNCATED = 2;
const MAX_SAMPLE_DEPTH = 2;
const MAX_STRING_LENGTH = 20;

/**
 * Interpolate a warning message {@link template}:
 *
 * - `{key}` — inspected value, single-quote delimited (`'1'`, `'"Hello"'`)
 * - `{{key}}` — inspected value, embedded in a larger representation
 * - `{{{key}}}` — raw value, for non-FEEL metadata (e.g. type names)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatDetails(template: string, values: Record<string, any>) {

  return Object.keys(values).reduce((message, key) => {
    return message
      .replace(`{{{${key}}}}`, String(values[key]))
      .replace(`{{${key}}}`, formatValue(values[key]))
      .replace(`{${key}}`, `'${ formatValue(values[key]) }'`);
  }, template);
}

/**
 * Render a value for human inspection: canonical FEEL literal where
 * one exists (strings, temporals, ranges), samples for lists and
 * contexts, graceful fallback for foreign values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatValue(value: any, depth = 0) {

  // explicit branch per getType() type
  const type = getType(value);

  if (type === 'nil') {
    return 'null';
  }

  if (type === 'boolean' || type === 'number') {
    return String(value);
  }

  if (type === 'string') {
    const string = String(value);

    const truncated = string.length > MAX_STRING_LENGTH
      ? string.slice(0, MAX_STRING_LENGTH) + '…'
      : string;

    // strings render as FEEL string literals ("...");
    // formatDetails adds the single-quote delimiters
    return `"${ truncated }"`;
  }

  if (type === 'list') {

    if (depth >= MAX_SAMPLE_DEPTH) {
      return `[${value.length} items]`;
    }

    const truncate = value.length > MAX_SAMPLE_ITEMS;

    const sample = value.slice(0, truncate ? MAX_SAMPLE_ITEMS_TRUNCATED : MAX_SAMPLE_ITEMS).map(item => formatValue(item, depth + 1));

    if (truncate) {
      sample.push(`… ${value.length - MAX_SAMPLE_ITEMS_TRUNCATED} more`);
    }

    return `[${ sample.join(', ') }]`;
  }

  if (type === 'context') {
    return formatEntries(Object.entries(value), depth);
  }

  if (type === 'date') {
    return `date("${ value }")`;
  }

  if (type === 'time') {
    return `time("${ value }")`;
  }

  if (type === 'date time') {
    return `date and time("${ value }")`;
  }

  if (type === 'duration') {
    return `duration("${ value }")`;
  }

  if (type === 'range') {
    return String(value);
  }

  if (type === 'function') {

    const parameterNames = value.parameterNames;

    if (parameterNames) {
      return `function(${ parameterNames.join(', ') })`;
    }

    return 'function';
  }

  // graceful fallback for foreign values (type 'literal')
  if (typeof value === 'function') {
    return 'function';
  }

  if (typeof value === 'object') {
    return formatEntries(Object.entries(value), depth);
  }

  return String(value);
}

/**
 * Render object entries as a `{k: v, …}` sample.
 */
function formatEntries(entries: [string, unknown][], depth: number) {

  if (depth >= MAX_SAMPLE_DEPTH) {
    return `{${entries.length} entries}`;
  }

  const truncate = entries.length > MAX_SAMPLE_ITEMS;

  const sample = entries.slice(0, truncate ? MAX_SAMPLE_ITEMS_TRUNCATED : MAX_SAMPLE_ITEMS).map(([ key, entryValue ]) => {
    return `${key}: ${ formatValue(entryValue, depth + 1) }`;
  });

  if (truncate) {
    sample.push(`… ${entries.length - MAX_SAMPLE_ITEMS_TRUNCATED} more`);
  }

  return `{${ sample.join(', ') }}`;
}
