import {
  isType,
  equals,
  Range,
  isString,
  isNumber,
  getType,
  typeCast
} from './types.js';

import {
  getFromContext,
  isNotImplemented,
  notImplemented,
  parseParameterNames
} from './utils.js';

import {
  duration,
  date,
  isDateTime
} from './temporal.js';

import { DateTime, Duration, SystemZone } from 'luxon';


const names = [

  // 10.3.4.1 Conversion functions
  'date and time',
  'time',
  'date',
  'number',
  'string',
  'duration',
  'years and months duration',

  // 10.3.4.2 Boolean function
  'not',

  // 10.3.4.3 String functions
  'substring',
  'string length',
  'upper case',
  'lower case',
  'substring before',
  'substring after',
  'replace',
  'contains',
  'matches',
  'starts with',
  'ends with',
  'split',
  'string join',

  // 10.3.4.4 List functions
  'list contains',
  'list replace',
  'count',
  'min',
  'max',
  'sum',
  'mean',
  'all',
  'any',
  'sublist',
  'append',
  'concatenate',
  'insert before',
  'remove',
  'reverse',
  'index of',
  'union',
  'distinct values',
  'flatten',
  'product',
  'median',
  'stddev',
  'mode',

  // 10.3.4.5 Numeric functions
  'decimal',
  'floor',
  'ceiling',
  'abs',
  'modulo',
  'sqrt',
  'log',
  'exp',
  'odd',
  'even',

  // 10.3.4.6 Date and time functions
  'is',

  // 10.3.4.7 Range Functions
  'before',
  'after',
  'meets',
  'met by',
  'overlaps',
  'overlaps before',
  'overlaps after',
  'finishes',
  'finished by',
  'includes',
  'during',
  'starts',
  'started by',
  'coincides',

  // 10.3.4.8 Temporal built-in functions
  'day of year',
  'day of week',
  'month of year',
  'week of year',

  // 10.3.4.9 Sort
  'sort',
  'list',
  'precedes',

  // 10.3.4.10 Context function
  'get value',
  'get entries',
  'context',
  'context merge',
  'context put'
];


// 10.3.4 Built-in functions

const builtins = {

  // 10.3.4.1 Conversion functions

  'number': fn(function(from, groupingSeparator, decimalSeparator) {

    // must always provide three arguments
    if (arguments.length !== 3) {
      return null;
    }

    if (groupingSeparator) {
      from = from.split(groupingSeparator).join('');
    }

    if (decimalSeparator && decimalSeparator !== '.') {
      from = from.split('.').join('#').split(decimalSeparator).join('.');
    }

    const number = +from;

    if (isNaN(number)) {
      return null;
    }

    return number;
  }, [ 'string', 'string?', 'string?' ], [ 'from', 'grouping separator', 'decimal separator' ]),

  'string': fn(function(from) {
    if (from === null) {
      return null;
    }

    return toString(from);
  }, [ 'any' ], [ 'from' ]),

  // date(from) => date string
  // date(from) => date and time
  // date(year, month, day)
  'date': fn(function(year, month, day, from) {

    if (!from && !isNumber(year)) {
      from = year;
      year = null;
    }

    let d;

    if (isString(from)) {
      d = date(from);
    }

    if (isDateTime(from)) {
      d = from;
    }

    if (year) {

      if (!isNumber(month) || !isNumber(day)) {
        return null;
      }

      d = date().setZone('utc').set({
        year,
        month,
        day
      });
    }

    return d && ifValid(d.setZone('utc').startOf('day')) || null;
  }, [ 'any?', 'number?', 'number?', 'any?' ], [ 'year', 'month', 'day', 'from' ]),

  // date and time(from) => date time string
  // date and time(date, time)
  'date and time': fn(function(d, time, from) {

    let dt;

    if (isDateTime(d) && isDateTime(time)) {

      const dLocal = d.toLocal();

      dt = time.set({
        year: dLocal.year,
        month: dLocal.month,
        day: dLocal.day
      });
    }

    if (isString(d)) {
      from = d;
      d = null;
    }

    if (isString(from)) {
      dt = date(from, null, from.includes('@') ? null : SystemZone.instance);
    }

    return dt && ifValid(dt) || null;
  }, [ 'any?', 'time?', 'string?' ], [ 'date', 'time', 'from' ]),

  // time(from) => time string
  // time(from) => time, date and time
  // time(hour, minute, second, offset?) => ...
  'time': fn(function(hour, minute, second, offset, from) {

    let t;

    if (offset) {
      throw notImplemented('time(..., offset)');
    }

    if (isString(hour) || isDateTime(hour)) {
      from = hour;
      hour = null;
    }

    if (isString(from) && from) {
      t = date(null, from);
    }

    if (isDateTime(from)) {
      t = from.set({
        year: 1900,
        month: 1,
        day: 1
      });
    }

    if (isNumber(hour)) {

      if (!isNumber(minute) || !isNumber(second)) {
        return null;
      }

      // TODO: support offset = days and time duration
      t = date().set({
        hour,
        minute,
        second
      }).set({
        year: 1900,
        month: 1,
        day: 1,
        millisecond: 0
      });
    }

    return t && ifValid(t) || null;
  }, [ 'any?', 'number?', 'number?', 'any?', 'any?' ], [ 'hour', 'minute', 'second', 'offset', 'from' ]),

  'duration': fn(function(from) {
    return ifValid(duration(from));
  }, [ 'string' ], [ 'from' ]),

  'years and months duration': fn(function(from, to) {
    return ifValid(to.diff(from, [ 'years', 'months' ]));
  }, [ 'date', 'date' ], [ 'from', 'to' ]),

  '@': fn(function(string) {

    let t;

    if (/^-?P/.test(string)) {
      t = duration(string);
    }

    else if (/^[\d]{1,2}:[\d]{1,2}:[\d]{1,2}/.test(string)) {
      t = date(null, string);
    }

    else {
      t = date(string);
    }

    return t && ifValid(t) || null;
  }, [ 'string' ]),

  'now': fn(function() {
    return date();
  }, [], []),

  'today': fn(function() {
    return date().startOf('day');
  }, [], []),

  // 10.3.4.2 Boolean function
  'not': fn(function(negand) {
    return isType(negand, 'boolean') ? !negand : null;
  }, [ 'any' ], [ 'negand' ]),

  // 10.3.4.3 String functions
  'substring': fn(function(string, start, length) {

    const _start = (start < 0 ? string.length + start : start - 1);

    const arr = Array.from(string);

    return (
      typeof length !== 'undefined'
        ? arr.slice(_start, _start + length)
        : arr.slice(_start)
    ).join('');
  }, [ 'string', 'number', 'number?' ], [ 'string', 'start position', 'length' ]),

  'string length': fn(function(string) {
    return countSymbols(string);
  }, [ 'string' ], [ 'string' ]),

  'upper case': fn(function(string) {
    return string.toUpperCase();
  }, [ 'string' ], [ 'string' ]),

  'lower case': fn(function(string) {
    return string.toLowerCase();
  }, [ 'string' ], [ 'string' ]),

  'substring before': fn(function(string, match) {

    const index = string.indexOf(match);

    if (index === -1) {
      return '';
    }

    return string.substring(0, index);
  }, [ 'string', 'string' ], [ 'string', 'match' ]),

  'substring after': fn(function(string, match) {

    const index = string.indexOf(match);

    if (index === -1) {
      return '';
    }

    return string.substring(index + match.length);
  }, [ 'string', 'string' ], [ 'string', 'match' ]),

  'replace': fn(function(input, pattern, replacement, flags) {
    const regexp = createRegexp(pattern, flags || '', 'g');

    return regexp && input.replace(regexp, replacement.replace(/\$0/g, '$$&'));
  }, [ 'string', 'string', 'string', 'string?' ], [ 'input', 'pattern', 'replacement', 'flags' ]),

  'contains': fn(function(string, match) {
    return string.includes(match);
  }, [ 'string', 'string' ], [ 'string', 'match' ]),

  'matches': fn(function(input, pattern, flags) {
    const regexp = createRegexp(pattern, flags || '', '');

    return regexp && regexp.test(input);
  }, [ 'string', 'string', 'string?' ], [ 'input', 'pattern', 'flags' ]),

  'starts with': fn(function(string, match) {
    return string.startsWith(match);
  }, [ 'string', 'string' ], [ 'string', 'match' ]),

  'ends with': fn(function(string, match) {
    return string.endsWith(match);
  }, [ 'string', 'string' ], [ 'string', 'match' ]),

  'split': fn(function(string, delimiter) {
    const regexp = createRegexp(delimiter, '', '');

    return regexp && string.split(regexp);
  }, [ 'string', 'string' ], [ 'string', 'delimiter' ]),

  'string join': fn(function(list, delimiter) {
    if (list.some(e => !isString(e) && e !== null)) {
      return null;
    }

    return list.filter(l => l !== null).join(delimiter || '');
  }, [ 'list', 'string?' ], [ 'list', 'delimiter' ]),

  // 10.3.4.4 List functions

  'list contains': fn(function(list, element) {
    return list.some(el => matches(el, element));
  }, [ 'list', 'any?' ], [ 'list', 'element' ]),

  // list replace(list, position, newItem)
  // list replace(list, match, newItem)
  'list replace': fn(function(list, position, newItem, match) {

    const matcher = position || match;

    if (![ 'number', 'function' ].includes(getType(matcher))) {
      return null;
    }

    return listReplace(list, position || match, newItem);
  }, [ 'list', 'any?', 'any', 'function?' ], [ 'list', 'position', 'newItem', 'match' ]),

  'count': fn(function(list) {
    return list.length;
  }, [ 'list' ], [ 'list' ]),

  'min': listFn(function(...list) {
    return list.reduce((min, el) => min === null ? el : Math.min(min, el), null);
  }, 'number', [ '...list' ]),

  'max': listFn(function(...list) {
    return list.reduce((max, el) => max === null ? el : Math.max(max, el), null);
  }, 'number', [ '...list' ]),

  'sum': listFn(function(...list) {
    return sum(list);
  }, 'number', [ '...list' ]),

  'mean': listFn(function(...list) {
    const s = sum(list);

    return s === null ? s : s / list.length;
  }, 'number', [ '...list' ]),

  'all': listFn(function(...list) {

    let nonBool = false;

    for (const o of list) {

      if (o === false) {
        return false;
      }

      if (typeof o !== 'boolean') {
        nonBool = true;
      }
    }

    return nonBool ? null : true;

  }, 'any?', [ '...list' ]),

  'any': listFn(function(...list) {

    let nonBool = false;

    for (const o of list) {

      if (o === true) {
        return true;
      }

      if (typeof o !== 'boolean') {
        nonBool = true;
      }
    }

    return nonBool ? null : false;
  }, 'any?', [ '...list' ]),

  'sublist': fn(function(list, start, length) {

    const _start = (start < 0 ? list.length + start : start - 1);

    return (
      typeof length !== 'undefined'
        ? list.slice(_start, _start + length)
        : list.slice(_start)
    );

  }, [ 'list', 'number', 'number?' ], [ 'list', 'start', 'length' ]),

  'append': fn(function(list, ...items) {
    return list.concat(items);
  }, [ 'list', 'any?' ], [ 'list', '...item' ]),

  'concatenate': fn(function(...list) {

    return list.reduce((result, arg) => {
      return result.concat(arg);
    }, []);

  }, [ 'any' ], [ '...list' ]),

  'insert before': fn(function(list, position, newItem) {
    return list.slice(0, position - 1).concat([ newItem ], list.slice(position - 1));
  }, [ 'list', 'number', 'any?' ], [ 'list', 'position', 'newItem' ]),

  'remove': fn(function(list, position) {
    return list.slice(0, position - 1).concat(list.slice(position));
  }, [ 'list', 'number' ], [ 'list', 'position' ]),

  'reverse': fn(function(list) {
    return list.slice().reverse();
  }, [ 'list' ], [ 'list' ]),

  'index of': fn(function(list, match) {

    return list.reduce(function(result, element, index) {

      if (matches(element, match)) {
        result.push(index + 1);
      }

      return result;
    }, []);
  }, [ 'list', 'any' ], [ 'list', 'match' ]),

  'union': listFn(function(...lists) {

    return lists.reduce((result, list) => {

      return list.reduce((result, e) => {
        if (!result.some(r => equals(e, r))) {
          result.push(e);
        }

        return result;
      }, result);
    }, []);

  }, 'list', [ '...list' ]),

  'distinct values': fn(function(list) {
    return list.reduce((result, e) => {
      if (!result.some(r => equals(e, r))) {
        result.push(e);
      }

      return result;
    }, []);
  }, [ 'list' ], [ 'list' ]),

  'flatten': fn(function(list) {
    return flatten(list);
  }, [ 'list' ], [ 'list' ]),

  'product': listFn(function(...list) {

    if (list.length === 0) {
      return null;
    }

    return list.reduce((result, n) => {
      return result * n;
    }, 1);
  }, 'number', [ '...list' ]),

  'median': listFn(function(...list) {

    if (list.length === 0) {
      return null;
    }

    return median(list);
  }, 'number', [ '...list' ]),

  'stddev': listFn(function(...list) {

    if (list.length < 2) {
      return null;
    }

    return stddev(list);
  }, 'number', [ '...list' ]),

  'mode': listFn(function(...list) {
    return mode(list);
  }, 'number', [ '...list' ]),


  // 10.3.4.5 Numeric functions
  'decimal': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    return offsetted(bankersRound, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ]),

  'floor': fn(function(n, scale = 0) {

    if (scale === null) {
      return null;
    }

    const adjust = 10 ** scale;

    return Math.floor(n * adjust) / adjust;
  }, [ 'number', 'number?' ], [ 'n', 'scale' ]),

  'ceiling': fn(function(n, scale = 0) {

    if (scale === null) {
      return null;
    }

    const adjust = 10 ** scale;

    return Math.ceil(n * adjust) / adjust;
  }, [ 'number', 'number?' ], [ 'n', 'scale' ]),

  'abs': fn(function(n) {

    if (typeof n !== 'number') {
      return null;
    }

    return Math.abs(n);
  }, [ 'number' ], [ 'n' ]),

  'round up': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    return n > 0 ? offsetted(Math.ceil, n, scale) : offsetted(Math.floor, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ]),

  'round down': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    return n > 0 ? offsetted(Math.floor, n, scale) : offsetted(Math.ceil, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ]),

  'round half up': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    const remainder = (n * 10 ** scale) % 1;
    if (Math.abs(remainder) === 0.5) {
      return offsetted(n > 0 ? Math.ceil : Math.floor, n, scale);
    }
    return offsetted(Math.round, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ]),

  'round half down': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    const remainder = (n * 10 ** scale) % 1;
    if (Math.abs(remainder) === 0.5) {
      return offsetted(n > 0 ? Math.floor : Math.ceil, n, scale);
    }
    return offsetted(Math.round, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ]),

  'modulo': fn(function(dividend, divisor) {

    if (!divisor) {
      return null;
    }

    const adjust = 1000000000;

    // cf. https://dustinpfister.github.io/2017/09/02/js-whats-wrong-with-modulo/
    //
    // need to round here as using this custom modulo
    // variant is prone to rounding errors
    return Math.round((dividend % divisor + divisor) % divisor * adjust) / adjust;
  }, [ 'number', 'number' ], [ 'dividend', 'divisor' ]),

  'sqrt': fn(function(number) {

    if (number < 0) {
      return null;
    }

    return Math.sqrt(number);
  }, [ 'number' ], [ 'number' ]),

  'log': fn(function(number) {
    if (number <= 0) {
      return null;
    }

    return Math.log(number);
  }, [ 'number' ], [ 'number' ]),

  'exp': fn(function(number) {
    return Math.exp(number);
  }, [ 'number' ], [ 'number' ]),

  'odd': fn(function(number) {
    return Math.abs(number) % 2 === 1;
  }, [ 'number' ], [ 'number' ]),

  'even': fn(function(number) {
    return Math.abs(number) % 2 === 0;
  }, [ 'number' ], [ 'number' ]),


  // 10.3.4.6 Date and time functions

  'is': fn(function(value1, value2) {

    if (typeof value1 === 'undefined' || typeof value2 === 'undefined') {
      return false;
    }

    return equals(value1, value2, true);
  }, [ 'any?', 'any?' ], [ 'value1', 'value2' ]),

  // 10.3.4.7 Range Functions

  'before': fn(function(a, b) {
    return before(a, b);
  }, [ 'any', 'any' ], [ 'a', 'b' ]),

  'after': fn(function(a, b) {
    return before(b, a);
  }, [ 'any', 'any' ], [ 'a', 'b' ]),

  'meets': fn(function(range1, range2) {
    return meetsRange(range1, range2);
  }, [ 'range', 'range' ], [ 'range1', 'range2' ]),

  'met by': fn(function(range1, range2) {
    return meetsRange(range2, range1);
  }, [ 'range', 'range' ], [ 'range1', 'range2' ]),

  'overlaps': fn(function(range1, range2) {
    return !before(range1, range2) && !before(range2, range1);
  }, [ 'range', 'range' ], [ 'range1', 'range2' ]),

  'overlaps before': fn(function() {
    throw notImplemented('overlaps before');
  }, [ 'any?' ]),

  'overlaps after': fn(function() {
    throw notImplemented('overlaps after');
  }, [ 'any?' ]),

  'finishes': fn(function() {
    throw notImplemented('finishes');
  }, [ 'any?' ]),

  'finished by': fn(function() {
    throw notImplemented('finished by');
  }, [ 'any?' ]),

  'includes': fn(function(range, value) {
    return includesRange(range, value);
  }, [ 'range', 'any' ], [ 'range', 'value' ]),

  'during': fn(function() {
    throw notImplemented('during');
  }, [ 'any?' ]),

  'starts': fn(function() {
    throw notImplemented('starts');
  }, [ 'any?' ]),

  'started by': fn(function() {
    throw notImplemented('started by');
  }, [ 'any?' ]),

  'coincides': fn(function() {
    throw notImplemented('coincides');
  }, [ 'any?' ]),


  // 10.3.4.8 Temporal built-in functions

  'day of year': fn(function(date) {
    return date.ordinal;
  }, [ 'date time' ], [ 'date' ]),

  'day of week': fn(function(date) {
    return date.weekdayLong;
  }, [ 'date time' ], [ 'date' ]),

  'month of year': fn(function(date) {
    return date.monthLong;
  }, [ 'date time' ], [ 'date' ]),

  'week of year': fn(function(date) {
    return date.weekNumber;
  }, [ 'date time' ], [ 'date' ]),


  // 10.3.4.9 Sort

  'sort': fn(function(list, precedes) {
    return Array.from(list).sort((a, b) => precedes.invoke([ a, b ]) ? -1 : 1);
  }, [ 'list', 'function' ], [ 'list', 'precedes' ]),


  // 10.3.4.10 Context function

  'get value': fn(function(m, key) {
    const value = getFromContext(key, m);
    return value != undefined ? value : null;
  }, [ 'context', 'string' ], [ 'm', 'key' ]),

  'get entries': fn(function(m) {

    if (arguments.length !== 1) {
      return null;
    }

    if (Array.isArray(m)) {
      return null;
    }

    return Object.entries(m).map(([ key, value ]) => ({ key, value }));
  }, [ 'context' ], [ 'm' ]),

  'context': listFn(function(...entries) {
    const context = entries.reduce((context, entry) => {

      if (context === FALSE || ![ 'key', 'value' ].every(e => e in entry)) {
        return FALSE;
      }

      const key = entry.key;

      if (key === null) {
        return FALSE;
      }

      if (key in context) {
        return FALSE;
      }

      return {
        ...context,
        [entry.key]: entry.value
      };
    }, {});

    if (context === FALSE) {
      return null;
    }

    return context;
  }, 'context', [ '...entries' ]),

  'context merge': listFn(function(...contexts) {
    return Object.assign({}, ...contexts);
  }, 'context', [ '...contexts' ]),

  'context put': fn(function(context, keys, value, key) {

    if (typeof keys === 'undefined' && typeof key === 'undefined') {
      return null;
    }

    return contextPut(context, keys || [ key ], value);
  }, [ 'context', 'list?', 'any', 'string?' ], [ 'context', 'keys', 'value', 'key' ])

};

export {
  names,
  builtins
};

/**
 * @param {Object} context
 * @param {string[]} keys
 * @param {any} value
 */
function contextPut(context, keys, value) {
  const [ key, ...remainingKeys ] = keys;

  if (getType(key) !== 'string') {
    return null;
  }

  if (getType(context) === 'nil') {
    return null;
  }

  if (remainingKeys.length) {
    value = contextPut(context[key], remainingKeys, value);

    if (value === null) {
      return null;
    }
  }

  return {
    ...context,
    [key]: value
  };
}

function matches(a, b) {
  return a === b;
}

const FALSE = {};

function createArgTester(arg) {
  const optional = arg.endsWith('?');

  const type = optional ? arg.substring(0, arg.length - 1) : arg;

  return function(obj) {

    const arr = Array.isArray(obj);

    if (type === 'list') {
      if (arr || optional && typeof obj === 'undefined') {
        return obj;
      } else {

        // implicit conversion obj => [ obj ]
        return obj === null ? FALSE : [ obj ];
      }
    }

    if (type !== 'any' && arr && obj.length === 1) {

      // implicit conversion [ obj ] => obj
      obj = obj[0];
    }

    const objType = getType(obj);

    if (type === 'any' || type === objType) {
      return optional ? obj : typeof obj !== 'undefined' ? obj : FALSE;
    }

    if (objType === 'nil') {
      return (optional ? obj : FALSE);
    }

    return typeCast(obj, type) || FALSE;
  };
}

function createArgsValidator(argDefinitions) {

  const tests = argDefinitions.map(createArgTester);

  return function(args) {

    while (args.length < argDefinitions.length) {
      args.push(undefined);
    }

    return args.reduce((result, arg, index) => {

      if (result === false) {
        return result;
      }

      const test = tests[index];

      const conversion = test ? test(arg) : arg;

      if (conversion === FALSE) {
        return false;
      }

      result.push(conversion);

      return result;
    }, []);

  };
}

/**
 * @param {Function} fnDefinition
 * @param {string} type
 * @param {string[]} [parameterNames]
 *
 * @return {Function}
 */
function listFn(fnDefinition, type, parameterNames = null) {

  const tester = createArgTester(type);

  const wrappedFn = function(...args) {

    if (args.length === 0) {
      return null;
    }

    // unwrap first arg
    if (Array.isArray(args[0]) && args.length === 1) {
      args = args[0];
    }

    if (!args.every(arg => tester(arg) !== FALSE)) {
      return null;
    }

    return fnDefinition(...args);
  };

  wrappedFn.$args = parameterNames || parseParameterNames(fnDefinition);

  return wrappedFn;
}

/**
 * @param {Function} fnDefinition
 * @param {string[]} argDefinitions
 * @param {string[]} [parameterNames]
 *
 * @return {Function}
 */
function fn(fnDefinition, argDefinitions, parameterNames = null) {

  const checkArgs = createArgsValidator(argDefinitions);

  parameterNames = parameterNames || parseParameterNames(fnDefinition);

  const wrappedFn = function(...args) {

    const convertedArgs = checkArgs(args);

    if (!convertedArgs) {
      return null;
    }

    return fnDefinition(...convertedArgs);
  };

  wrappedFn.$args = parameterNames;

  return wrappedFn;
}

/**
 * @param {Range} a
 * @param {Range} b
 */
function meetsRange(a, b) {
  return [
    (a.end === b.start),
    (a['end included'] === true),
    (b['start included'] === true)
  ].every(v => v);
}

/**
 * @param {Range|number} a
 * @param {Range|number} b
 */
function before(a, b) {
  if (a instanceof Range && b instanceof Range) {
    return (
      a.end < b.start || (
        !a['end included'] || !b['start included']
      ) && a.end == b.start
    );
  }

  if (a instanceof Range) {
    return (
      a.end < b || (
        !a['end included'] && a.end === b
      )
    );
  }

  if (b instanceof Range) {
    return (
      b.start > a || (
        !b['start included'] && b.start === a
      )
    );
  }

  return a < b;
}

/**
 * @param {Range} container - The range that should contain the other value
 * @param {Range|number} value - The range or point to check if contained
 */
function includesRange(container, value) {
  if (!(container instanceof Range)) {
    return false;
  }

  // Range includes another range
  if (value instanceof Range) {
    const startOk = (
      container.start < value.start ||
      (
        container.start === value.start &&
        (container['start included'] || !value['start included'])
      )
    );

    // Check end boundary: container.end >= value.end
    const endOk = (
      container.end > value.end ||
      (
        container.end === value.end &&
        (container['end included'] || !value['end included'])
      )
    );

    return startOk && endOk;
  }

  // Range includes a point
  // Check if point is within [start, end] considering inclusive/exclusive
  const afterStart = (
    value > container.start ||
    (value === container.start && container['start included'])
  );

  const beforeEnd = (
    value < container.end ||
    (value === container.end && container['end included'])
  );

  return afterStart && beforeEnd;
}

function sum(list) {
  return list.reduce((sum, el) => sum === null ? el : sum + el, null);
}

function flatten<T>([ x,...xs ]: (T|T[])[]):T[] {
  return (
    x !== undefined
      ? [ ...Array.isArray(x) ? flatten(x) : [ x ],...flatten(xs) ]
      : []
  );
}

function toKeyString(key) {
  if (typeof key === 'string' && /\W/.test(key)) {
    return toString(key, true);
  }

  return key;
}

function toDeepString(obj) {
  return toString(obj, true);
}

function escapeStr(str) {
  return str.replace(/("|\\)/g, '\\$1');
}

function toString(obj, wrap = false) {

  const type = getType(obj);

  if (type === 'nil') {
    return 'null';
  }

  if (type === 'string') {
    return wrap ? `"${ escapeStr(obj) }"` : obj;
  }

  if (type === 'boolean' || type === 'number') {
    return String(obj);
  }

  if (type === 'list') {
    return '[' + obj.map(toDeepString).join(', ') + ']';
  }

  if (type === 'context') {
    return '{' + Object.entries(obj).map(([ key, value ]) => {
      return toKeyString(key) + ': ' + toDeepString(value);
    }).join(', ') + '}';
  }

  if (type === 'duration') {
    return obj.shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds').normalize().toISO();
  }

  if (type === 'date time') {
    if (obj.zone === SystemZone.instance) {
      return obj.toISO({ suppressMilliseconds: true, includeOffset: false });
    }

    if (obj.zone?.zoneName) {
      return obj.toISO({ suppressMilliseconds: true, includeOffset: false }) + '@' + obj.zone?.zoneName;
    }

    return obj.toISO({ suppressMilliseconds: true });
  }

  if (type === 'date') {
    return obj.toISODate();
  }

  if (type === 'range') {
    return '<range>';
  }

  if (type === 'time') {
    if (obj.zone === SystemZone.instance) {
      return obj.toISOTime({ suppressMilliseconds: true, includeOffset: false });
    }

    if (obj.zone?.zoneName) {
      return obj.toISOTime({ suppressMilliseconds: true, includeOffset: false }) + '@' + obj.zone?.zoneName;
    }

    return obj.toISOTime({ suppressMilliseconds: true });
  }

  if (type === 'function') {
    return '<function>';
  }

  throw notImplemented('string(' + type + ')');
}

function countSymbols(str) {

  // cf. https://mathiasbynens.be/notes/javascript-unicode
  return str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '_').length;
}

function offsetted(func, n, scale) {
  return func(n * 10 ** scale) / 10 ** scale;
}

function bankersRound(n) {
  const floored = Math.floor(n);
  const decimalPart = n - floored;

  if (decimalPart === 0.5) {
    return (floored % 2 === 0) ? floored : floored + 1;
  }

  return Math.round(n);
}

// adapted from https://stackoverflow.com/a/53577159

function stddev(array) {
  const n = array.length;
  const mean = array.reduce((a, b) => a + b) / n;

  return Math.sqrt(
    array.map(
      x => Math.pow(x - mean, 2)
    ).reduce(
      (a, b) => a + b
    ) / (n - 1)
  );
}

function listReplace(list, matcher, newItem) {

  if (isNumber(matcher)) {
    return [ ...list.slice(0, matcher - 1), newItem, ...list.slice(matcher) ];
  }

  return list.map((item, _idx) => {

    if (matcher.invoke([ item, newItem ])) {
      return newItem;
    } else {
      return item;
    }
  });
}

function median(array) {
  const n = array.length;
  const sorted = array.slice().sort();

  const mid = n / 2 - 1;
  const index = Math.ceil(mid);

  // even
  if (mid === index) {
    return (sorted[index] + sorted[index + 1]) / 2;
  }

  // uneven
  return sorted[index];
}

function mode(array: number[]) {

  if (array.length < 2) {
    return array;
  }

  const buckets: Record<number, number> = {};

  for (const n of array) {
    buckets[n] = (buckets[n] || 0) + 1;
  }

  const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);

  return sorted.filter(s => s[1] === sorted[0][1]).map(e => +e[0]);
}

function ifValid<T extends DateTime | Duration>(o: T) : T | null {
  return o.isValid ? o : null;
}

/**
 * Concatenates flags for a regular expression.
 *
 * Ensures that default flags are included without duplication, even if
 * user-specified flags overlap with the defaults.
 */
export function buildFlags(flags: string, defaultFlags: string) {

  const unsupportedFlags = flags.replace(/[smix]/g, '');

  if (unsupportedFlags) {
    throw new Error('illegal flags: ' + unsupportedFlags);
  }

  // we don't implement the <x> flag
  if (/x/.test(flags)) {
    throw notImplemented('matches <x> flag');
  }

  return flags + defaultFlags;
}

/**
 * Creates a regular expression from a given pattern
 */
function createRegexp(pattern: string, flags: string, defaultFlags: string = '') : RegExp | null {
  try {
    return new RegExp(pattern, 'u' + buildFlags(flags, defaultFlags));
  } catch (_err) {
    if (isNotImplemented(_err)) {
      throw _err;
    }
  }

  return null;
}