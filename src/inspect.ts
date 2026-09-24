import {
  getType
} from './types.js';

/**
 * Renders values for human inspection (warning messages).
 */

/**
 * Interpolate a warning message {@link template}, replacing each
 * `{key}` placeholder with the inspected, single-quote delimited value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatDetails(template: string, values: Record<string, any>) {

  return Object.keys(values).reduce((message, key) => {
    return message.replace(`{${key}}`, `'${ formatValue(values[key]) }'`);
  }, template);
}

/**
 * Render a value for human inspection.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatValue(value: any) {
  const type = getType(value);

  if (type === 'string') {
    return `"${ String(value) }"`;
  }

  if (type === 'list') {
    return `[${value.length} items]`;
  }

  if (type === 'context') {
    return '{...}';
  }

  if (type === 'function') {

    const parameterNames = value.parameterNames;

    if (parameterNames) {
      return `function(${ parameterNames.join(', ') })`;
    }

    return 'function';
  }

  if (type === 'nil') {
    return 'null';
  }

  return String(value);
}
