import {
  isType,
  isArray,
  equals,
  isString,
  isNumber,
  getType,
  isDate,
  isTime,
  isDateTime,
  isDuration
} from './types.js';

import {
  before,
  meets,
  includes as includesRange
} from './range.js';

import {
  ARG_MISMATCH,
  FeelFunction,
  createArgTester,
  invalidArguments,
  isInvocationFailure,
  parseParameterNames,
  withFunctionName,
  type FunctionSignature
} from './function.js';

import {
  getFromContext,
  has,
  isNotImplemented,
  notImplemented
} from './utils.js';

import {
  duration,
  parseDate,
  parseTime,
  parseDateTime,
  now,
  today,
  dateFrom,
  timeFrom,
  dateOf,
  timeOf,
  timeOfDate,
  combine,
  yearsAndMonthsDuration,
  absDuration,
  isZoned,
  toComparable
} from './temporal.js';


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

    const original = from;

    if (groupingSeparator) {
      from = from.split(groupingSeparator).join('');
    }

    if (decimalSeparator && decimalSeparator !== '.') {
      from = from.split('.').join('#').split(decimalSeparator).join('.');
    }

    const number = +from;

    if (isNaN(number)) {
      return invalidArguments('parameter \'from\' expects a numeric string, got {from}', {
        from: original
      });
    }

    return number;
  }, [ 'string', 'string?', 'string?' ], [ 'from', 'grouping separator', 'decimal separator' ], 'number'),

  'string': fn(function(from) {
    if (from === null) {
      return null;
    }

    return toString(from);
  }, [ 'any' ], [ 'from' ], 'string'),

  // date(year, month, day)
  // date(from) => date string, date or date and time
  'date': overloads(function(year, month, day) {

    let d;

    if (isNumber(year)) {
      d = dateFrom(year, month, day);

      if (!d) {
        return invalidArguments('{{year}}, {{month}}, {{day}} is not a valid date', {
          year,
          month,
          day
        });
      }
    } else if (isString(year)) {
      d = parseDate(year);
    } else if (isDate(year)) {
      d = year;
    } else if (isDateTime(year)) {
      d = dateOf(year);
    }

    if (d) {
      return d;
    }

    return invalidArguments('\'date({{from}})\' is not a valid date', { from: year });
  }, [
    { args: [ 'number', 'number', 'number' ], params: [ 'year', 'month', 'day' ] },
    { args: [ 'string|date|date time' ], params: [ 'from' ] }
  ], 'date'),

  // date and time(date, time)
  // date and time(from) => date time string
  'date and time': overloads(function(date, time) {

    let dt;

    if (isString(date)) {
      dt = parseDateTime(date);
    } else {
      dt = combine(date, time);
    }

    if (dt) {
      return dt;
    }

    return invalidArguments('\'date and time({{from}})\' is not a valid date time', {
      from: date
    });
  }, [
    { args: [ 'date|date time', 'time' ], params: [ 'date', 'time' ] },
    { args: [ 'string' ], params: [ 'from' ] }
  ], 'date and time'),

  // time(hour, minute, second, offset?)
  // time(from) => time string, time, date or date and time
  'time': overloads(function(hour, minute, second, offset) {

    let t;

    if (isNumber(hour)) {
      t = timeFrom(hour, minute, second, offset);

      if (!t) {
        return invalidArguments('\'time({{hour}}, {{minute}}, {{second}})\' is not a valid time', {
          hour,
          minute,
          second
        });
      }
    } else if (isString(hour)) {
      t = parseTime(hour);
    } else if (isTime(hour)) {
      t = hour;
    } else if (isDateTime(hour)) {
      t = timeOf(hour);
    } else if (isDate(hour)) {

      // a date converts to its midnight (UTC) time
      t = timeOfDate(hour);
    }

    if (t) {
      return t;
    }

    return invalidArguments('\'time({{from}})\' is not a valid time', { from: hour });
  }, [
    { args: [ 'number', 'number', 'number', 'duration?' ], params: [ 'hour', 'minute', 'second', 'offset' ] },
    { args: [ 'string|time|date|date time' ], params: [ 'from' ] }
  ], 'time'),

  'duration': fn(function(from) {

    const d = duration(from);

    if (!d) {
      return invalidArguments('\'duration({{from}})\' is not a valid duration', { from });
    }

    return d;
  }, [ 'string' ], [ 'from' ], 'duration'),

  'years and months duration': fn(function(from, to) {
    return yearsAndMonthsDuration(from, to);
  }, [ 'date', 'date' ], [ 'from', 'to' ], 'years and months duration'),

  '@': fn(function(string) {

    let t;

    if (DURATION_START_PATTERN.test(string)) {
      t = duration(string);
    }

    else if (TIME_START_PATTERN.test(string)) {
      t = parseTime(string);
    }

    else if (string.includes('T')) {
      t = parseDateTime(string);
    }

    else {
      t = parseDate(string);
    }

    if (!t) {
      return invalidArguments('"{{{string}}}" is not a valid temporal literal', { string });
    }

    return t;
  }, [ 'string' ], null, '@'),

  'now': fn(function() {
    return now();
  }, [], [], 'now'),

  'today': fn(function() {
    return today();
  }, [], [], 'today'),

  // 10.3.4.2 Boolean function
  'not': fn(function(negand) {
    return isType(negand, 'boolean') ? !negand : null;
  }, [ 'any' ], [ 'negand' ], 'not'),

  // 10.3.4.3 String functions
  'substring': fn(function(string, start, length) {

    const _start = (start < 0 ? string.length + start : start - 1);

    const arr = Array.from(string);

    return (
      typeof length !== 'undefined'
        ? arr.slice(_start, _start + length)
        : arr.slice(_start)
    ).join('');
  }, [ 'string', 'number', 'number?' ], [ 'string', 'start position', 'length' ], 'substring'),

  'string length': fn(function(string) {
    return countSymbols(string);
  }, [ 'string' ], [ 'string' ], 'string length'),

  'upper case': fn(function(string) {
    return string.toUpperCase();
  }, [ 'string' ], [ 'string' ], 'upper case'),

  'lower case': fn(function(string) {
    return string.toLowerCase();
  }, [ 'string' ], [ 'string' ], 'lower case'),

  'substring before': fn(function(string, match) {

    const index = string.indexOf(match);

    if (index === -1) {
      return '';
    }

    return string.substring(0, index);
  }, [ 'string', 'string' ], [ 'string', 'match' ], 'substring before'),

  'substring after': fn(function(string, match) {

    const index = string.indexOf(match);

    if (index === -1) {
      return '';
    }

    return string.substring(index + match.length);
  }, [ 'string', 'string' ], [ 'string', 'match' ], 'substring after'),

  'replace': fn(function(input, pattern, replacement, flags) {
    const regexp = createRegexp(pattern, flags || '', 'g');

    if (!regexp) {
      return invalidArguments('{pattern} is not a valid pattern', {
        pattern
      });
    }

    return input.replace(regexp, replacement.replace(/\$0/g, '$$&'));
  }, [ 'string', 'string', 'string', 'string?' ], [ 'input', 'pattern', 'replacement', 'flags' ], 'replace'),

  'contains': fn(function(string, match) {
    return string.includes(match);
  }, [ 'string', 'string' ], [ 'string', 'match' ], 'contains'),

  'matches': fn(function(input, pattern, flags) {
    const regexp = createRegexp(pattern, flags || '', '');

    if (!regexp) {
      return invalidArguments('{pattern} is not a valid pattern', {
        pattern
      });
    }

    return regexp.test(input);
  }, [ 'string', 'string', 'string?' ], [ 'input', 'pattern', 'flags' ], 'matches'),

  'starts with': fn(function(string, match) {
    return string.startsWith(match);
  }, [ 'string', 'string' ], [ 'string', 'match' ], 'starts with'),

  'ends with': fn(function(string, match) {
    return string.endsWith(match);
  }, [ 'string', 'string' ], [ 'string', 'match' ], 'ends with'),

  'split': fn(function(string, delimiter) {
    const regexp = createRegexp(delimiter, '', '');

    if (!regexp) {
      return invalidArguments('{delimiter} is not a valid pattern', {
        delimiter
      });
    }

    return string.split(regexp);
  }, [ 'string', 'string' ], [ 'string', 'delimiter' ], 'split'),

  'string join': fn(function(list, delimiter) {
    return list.filter(l => l !== null).join(delimiter || '');
  }, [ 'list<string>', 'string?' ], [ 'list', 'delimiter' ], 'string join'),

  // 10.3.4.4 List functions

  'list contains': fn(function(list, element) {
    return list.some(el => matches(el, element));
  }, [ 'list', 'any?' ], [ 'list', 'element' ], 'list contains'),

  // list replace(list, position, newItem)
  // list replace(list, match, newItem)
  'list replace': fn(function(list, position, newItem, match) {

    const matcher = position || match;

    if (![ 'number', 'function' ].includes(getType(matcher))) {
      return invalidArguments('{matcher} is not a valid position or match function', {
        matcher
      });
    }

    return listReplace(list, position || match, newItem);
  }, [ 'list', 'any?', 'any', 'function?' ], [ 'list', 'position', 'newItem', 'match' ], 'list replace'),

  'count': fn(function(list) {
    return list.length;
  }, [ 'list' ], [ 'list' ], 'count'),

  'min': listFn(function(...list) {
    return list.reduce((min, el) => min === null ? el : Math.min(min, el), null);
  }, 'number', [ '...list' ], 'min'),

  'max': listFn(function(...list) {
    return list.reduce((max, el) => max === null ? el : Math.max(max, el), null);
  }, 'number', [ '...list' ], 'max'),

  'sum': listFn(function(...list) {
    return sum(list);
  }, 'number', [ '...list' ], 'sum'),

  'mean': listFn(function(...list) {
    const s = sum(list);

    return s === null ? s : s / list.length;
  }, 'number', [ '...list' ], 'mean'),

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

  }, 'any?', [ '...list' ], 'all'),

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
  }, 'any?', [ '...list' ], 'any'),

  'sublist': fn(function(list, start, length) {

    const _start = (start < 0 ? list.length + start : start - 1);

    return (
      typeof length !== 'undefined'
        ? list.slice(_start, _start + length)
        : list.slice(_start)
    );

  }, [ 'list', 'number', 'number?' ], [ 'list', 'start', 'length' ], 'sublist'),

  'append': fn(function(list, ...items) {
    return list.concat(items);
  }, [ 'list', 'any?' ], [ 'list', '...item' ], 'append'),

  'concatenate': fn(function(...list) {

    const result = [];

    for (const arg of list) {
      if (isArray(arg)) {
        for (const item of arg) {
          result.push(item);
        }
      } else {
        result.push(arg);
      }
    }

    return result;

  }, [ 'any' ], [ '...list' ], 'concatenate'),

  'insert before': fn(function(list, position, newItem) {

    // single-copy equivalent of
    // list.slice(0, position - 1).concat([ newItem ], list.slice(position - 1))
    const len = list.length;

    let p = position - 1;

    if (p < 0) {
      p = Math.max(0, len + p);
    } else if (p > len) {
      p = len;
    }

    const result = new Array(len + 1);

    for (let i = 0; i < p; i++) {
      result[i] = list[i];
    }

    result[p] = newItem;

    for (let i = p; i < len; i++) {
      result[i + 1] = list[i];
    }

    return result;
  }, [ 'list', 'number', 'any?' ], [ 'list', 'position', 'newItem' ], 'insert before'),

  'remove': fn(function(list, position) {

    // single-copy equivalent of
    // list.slice(0, position - 1).concat(list.slice(position))
    const len = list.length;

    const head = Math.min(Math.max(position - 1, -len), len);
    const tail = Math.min(Math.max(position, -len), len);

    const a = head < 0 ? len + head : head;
    const b = tail < 0 ? len + tail : tail;

    const result = new Array(a + (len - b));

    for (let i = 0; i < a; i++) {
      result[i] = list[i];
    }

    for (let i = b; i < len; i++) {
      result[a + (i - b)] = list[i];
    }

    return result;
  }, [ 'list', 'number' ], [ 'list', 'position' ], 'remove'),

  'reverse': fn(function(list) {
    return list.slice().reverse();
  }, [ 'list' ], [ 'list' ], 'reverse'),

  'index of': fn(function(list, match) {

    return list.reduce(function(result, element, index) {

      if (matches(element, match)) {
        result.push(index + 1);
      }

      return result;
    }, []);
  }, [ 'list', 'any' ], [ 'list', 'match' ], 'index of'),

  'union': listFn(function(...lists) {

    return distinctLists(lists);

  }, 'list', [ '...list' ], 'union'),

  'distinct values': fn(function(list) {
    return distinctLists([ list ]);
  }, [ 'list' ], [ 'list' ], 'distinct values'),

  'flatten': fn(function(list) {
    return flatten(list);
  }, [ 'list' ], [ 'list' ], 'flatten'),

  'product': listFn(function(...list) {

    if (list.length === 0) {
      return null;
    }

    return list.reduce((result, n) => {
      return result * n;
    }, 1);
  }, 'number', [ '...list' ], 'product'),

  'median': listFn(function(...list) {

    if (list.length === 0) {
      return null;
    }

    return median(list);
  }, 'number', [ '...list' ], 'median'),

  'stddev': listFn(function(...list) {

    if (list.length < 2) {
      return null;
    }

    return stddev(list);
  }, 'number', [ '...list' ], 'stddev'),

  'mode': listFn(function(...list) {
    return mode(list);
  }, 'number', [ '...list' ], 'mode'),


  // 10.3.4.5 Numeric functions
  'decimal': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    return offsetted(bankersRound, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ], 'decimal'),

  'floor': fn(function(n, scale = 0) {

    if (scale === null) {
      return null;
    }

    const adjust = 10 ** scale;

    return Math.floor(n * adjust) / adjust;
  }, [ 'number', 'number?' ], [ 'n', 'scale' ], 'floor'),

  'ceiling': fn(function(n, scale = 0) {

    if (scale === null) {
      return null;
    }

    const adjust = 10 ** scale;

    return Math.ceil(n * adjust) / adjust;
  }, [ 'number', 'number?' ], [ 'n', 'scale' ], 'ceiling'),

  'abs': fn(function(n) {

    if (isNumber(n)) {
      return Math.abs(n);
    }

    if (isDuration(n)) {
      return absDuration(n);
    }

    if (n === null) {
      return null;
    }

    return invalidArguments('{n} is not a number or duration', {
      n
    });
  }, [ 'any' ], [ 'n' ], 'abs'),

  'round up': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    return n > 0 ? offsetted(Math.ceil, n, scale) : offsetted(Math.floor, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ], 'round up'),

  'round down': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    return n > 0 ? offsetted(Math.floor, n, scale) : offsetted(Math.ceil, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ], 'round down'),

  'round half up': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    const remainder = (n * 10 ** scale) % 1;
    if (Math.abs(remainder) === 0.5) {
      return offsetted(n > 0 ? Math.ceil : Math.floor, n, scale);
    }
    return offsetted(Math.round, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ], 'round half up'),

  'round half down': fn(function(n, scale) {
    if (n === null || scale === null) return null;
    const remainder = (n * 10 ** scale) % 1;
    if (Math.abs(remainder) === 0.5) {
      return offsetted(n > 0 ? Math.floor : Math.ceil, n, scale);
    }
    return offsetted(Math.round, n, scale);
  }, [ 'number', 'number' ], [ 'n', 'scale' ], 'round half down'),

  'modulo': fn(function(dividend, divisor) {

    if (!divisor) {
      return invalidArguments('{divisor} is not a valid divisor', {
        divisor
      });
    }

    const adjust = 1000000000;

    // cf. https://dustinpfister.github.io/2017/09/02/js-whats-wrong-with-modulo/
    //
    // need to round here as using this custom modulo
    // variant is prone to rounding errors
    return Math.round((dividend % divisor + divisor) % divisor * adjust) / adjust;
  }, [ 'number', 'number' ], [ 'dividend', 'divisor' ], 'modulo'),

  'sqrt': fn(function(number) {

    if (number < 0) {
      return invalidArguments('{number} is negative', {
        number
      });
    }

    return Math.sqrt(number);
  }, [ 'number' ], [ 'number' ], 'sqrt'),

  'log': fn(function(number) {
    if (number <= 0) {
      return invalidArguments('{number} is not positive', {
        number
      });
    }

    return Math.log(number);
  }, [ 'number' ], [ 'number' ], 'log'),

  'exp': fn(function(number) {
    return Math.exp(number);
  }, [ 'number' ], [ 'number' ], 'exp'),

  'odd': fn(function(number) {
    return Math.abs(number) % 2 === 1;
  }, [ 'number' ], [ 'number' ], 'odd'),

  'even': fn(function(number) {
    return Math.abs(number) % 2 === 0;
  }, [ 'number' ], [ 'number' ], 'even'),


  // 10.3.4.6 Date and time functions

  'is': fn(function(value1, value2) {

    if (typeof value1 === 'undefined' || typeof value2 === 'undefined') {
      return false;
    }

    return equals(value1, value2, true);
  }, [ 'any?', 'any?' ], [ 'value1', 'value2' ], 'is'),

  // 10.3.4.7 Range Functions

  'before': fn(function(a, b) {
    return before(a, b);
  }, [ 'any', 'any' ], [ 'a', 'b' ], 'before'),

  'after': fn(function(a, b) {
    return before(b, a);
  }, [ 'any', 'any' ], [ 'a', 'b' ], 'after'),

  'meets': fn(function(range1, range2) {
    return meets(range1, range2);
  }, [ 'range', 'range' ], [ 'range1', 'range2' ], 'meets'),

  'met by': fn(function(range1, range2) {
    return meets(range2, range1);
  }, [ 'range', 'range' ], [ 'range1', 'range2' ], 'met by'),

  'overlaps': fn(function(range1, range2) {
    return !before(range1, range2) && !before(range2, range1);
  }, [ 'range', 'range' ], [ 'range1', 'range2' ], 'overlaps'),

  'overlaps before': fn(function() {
    throw notImplemented('overlaps before');
  }, [ 'any?' ], null, 'overlaps before'),

  'overlaps after': fn(function() {
    throw notImplemented('overlaps after');
  }, [ 'any?' ], null, 'overlaps after'),

  'finishes': fn(function() {
    throw notImplemented('finishes');
  }, [ 'any?' ], null, 'finishes'),

  'finished by': fn(function() {
    throw notImplemented('finished by');
  }, [ 'any?' ], null, 'finished by'),

  'includes': fn(function(range, value) {
    return includesRange(range, value);
  }, [ 'range', 'any' ], [ 'range', 'value' ], 'includes'),

  'during': fn(function() {
    throw notImplemented('during');
  }, [ 'any?' ], null, 'during'),

  'starts': fn(function() {
    throw notImplemented('starts');
  }, [ 'any?' ], null, 'starts'),

  'started by': fn(function() {
    throw notImplemented('started by');
  }, [ 'any?' ], null, 'started by'),

  'coincides': fn(function() {
    throw notImplemented('coincides');
  }, [ 'any?' ], null, 'coincides'),


  // 10.3.4.8 Temporal built-in functions

  'day of year': fn(function(date) {
    return date.value.dayOfYear;
  }, [ 'date time' ], [ 'date' ], 'day of year'),

  'day of week': fn(function(date) {
    return WEEKDAY_NAMES[date.value.dayOfWeek - 1];
  }, [ 'date time' ], [ 'date' ], 'day of week'),

  'month of year': fn(function(date) {
    return MONTH_NAMES[date.value.month - 1];
  }, [ 'date time' ], [ 'date' ], 'month of year'),

  'week of year': fn(function(date) {
    return date.value.weekOfYear;
  }, [ 'date time' ], [ 'date' ], 'week of year'),


  // 10.3.4.9 Sort

  'sort': fn(function(list, precedes) {

    // fast path: positional two-parameter functions can be invoked
    // directly, skipping FeelFunction#invoke argument binding overhead
    // on every comparison
    const compare = precedes.parameterNames.length === 2
      ? (a, b) => precedes.fn(a, b) ? -1 : 1
      : (a, b) => precedes.invoke([ a, b ]) ? -1 : 1;

    return Array.from(list).sort(compare);
  }, [ 'list', 'function' ], [ 'list', 'precedes' ], 'sort'),


  // 10.3.4.10 Context function

  'get value': fn(function(m, key) {
    const value = getFromContext(key, m);
    return value != undefined ? value : null;
  }, [ 'context', 'string' ], [ 'm', 'key' ], 'get value'),

  'get entries': fn(function(m) {

    if (arguments.length !== 1) {
      return null;
    }

    if (Array.isArray(m)) {
      return null;
    }

    return Object.entries(m).map(([ key, value ]) => ({ key, value }));
  }, [ 'context' ], [ 'm' ], 'get entries'),

  'context': listFn(function(...entries) {

    const context = {};

    for (const entry of entries) {

      if (![ 'key', 'value' ].every(e => e in entry)) {
        return invalidArguments('entry {entry} does not have a key and value', {
          entry
        });
      }

      const key = entry.key;

      if (key === null) {
        return invalidArguments('null key is not allowed');
      }

      if (has(context, key)) {
        return invalidArguments('duplicate key {key}', {
          key
        });
      }

      context[key] = entry.value;
    }

    return context;
  }, 'context', [ '...entries' ], 'context'),

  'context merge': listFn(function(...contexts) {
    return Object.assign({}, ...contexts);
  }, 'context', [ '...contexts' ], 'context merge'),

  'context put': fn(function(context, keys, value, key) {

    if (typeof keys === 'undefined' && typeof key === 'undefined') {
      return invalidArguments('key or keys is required');
    }

    return contextPut(context, keys || [ key ], value);
  }, [ 'context', 'list?', 'any', 'string?' ], [ 'context', 'keys', 'value', 'key' ], 'context put')

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
    return invalidArguments('{key} is not a string key', {
      key
    });
  }

  if (getType(context) === 'nil') {
    return invalidArguments('{context} is not a valid context', {
      context
    });
  }

  if (remainingKeys.length) {
    value = contextPut(context[key], remainingKeys, value);

    if (isInvocationFailure(value)) {
      return value;
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

const DURATION_START_PATTERN = /^-?P/;

const TIME_START_PATTERN = /^\d{1,2}:\d{1,2}:\d{1,2}/;

const NON_WORD_PATTERN = /\W/;

const SUPPORTED_FLAGS_PATTERN = /[smix]/g;

const EXTENDED_FLAG_PATTERN = /x/;

/**
 * @param {Function} fnDefinition
 * @param {string} type
 * @param {string[]} [parameterNames]
 * @param {string} [name]
 *
 * @return {FeelFunction}
 */
function listFn(fnDefinition, type, parameterNames = null, name = null) {

  const tester = createArgTester(type);

  parameterNames = parameterNames || parseParameterNames(fnDefinition);

  const wrappedFn = function(...args) {

    if (args.length === 0) {
      return null;
    }

    // unwrap first arg
    if (Array.isArray(args[0]) && args.length === 1) {
      args = args[0];
    }

    const invalidIndex = args.findIndex(arg => tester(arg) === ARG_MISMATCH);

    // member validation failed: surface the offending member
    // instead of silently evaluating to null
    if (invalidIndex !== -1) {

      const expectedType = type.replace(/\?$/, '');

      return invalidArguments('function \'{{{displayName}}}\' — parameter \'{{{name}}}\' expects members of type \'{{{expectedType}}}\', but member {value} is of type \'{{{valueType}}}\'', {
        displayName: name || parameterNames[0] || 'list',
        name: (parameterNames[0] || 'list').replace(/^\.\.\./, ''),
        expectedType,
        value: args[invalidIndex],
        valueType: getType(args[invalidIndex])
      });
    }

    const result = fnDefinition(...args);

    if (isInvocationFailure(result) && name) {
      return invalidArguments(`function '${name}' — {message}`, {
        message: result.template,
        ...result.values
      });
    }

    return result;
  };

  return new FeelFunction(wrappedFn, parameterNames, null, name);
}

/**
 * Create a builtin as a {@link FeelFunction} with a single validation
 * signature, compiled once at construction (module load) time. The
 * interpreter invokes it directly, without re-wrapping.
 *
 * @param {Function} fnDefinition
 * @param {string[]} argDefinitions
 * @param {string[]} [parameterNames]
 * @param {string} [name]
 *
 * @return {FeelFunction}
 */
function fn(fnDefinition, argDefinitions, parameterNames = null, name = null) {
  parameterNames = parameterNames || parseParameterNames(fnDefinition);

  const wrappedFn = name ? withFunctionName(name, fnDefinition) : fnDefinition;

  return new FeelFunction(wrappedFn, parameterNames, [
    { args: argDefinitions, params: parameterNames }
  ], name);
}

/**
 * Create a builtin as a {@link FeelFunction} with overload signatures
 * (see {@link FunctionSignature}): the implementation receives the
 * arguments of whichever signature matches the invocation.
 *
 * @param {Function} fnDefinition
 * @param {FunctionSignature[]} signatures
 * @param {string} [name]
 *
 * @return {FeelFunction}
 */
function overloads(fnDefinition, signatures: FunctionSignature[], name = null) {

  // union of all signature parameter names, first-seen order; used for
  // function inspection and mismatch messages
  const parameterNames = [ ...new Set(signatures.flatMap(s => s.params)) ];

  const wrappedFn = name ? withFunctionName(name, fnDefinition) : fnDefinition;

  return new FeelFunction(wrappedFn, parameterNames, signatures, name);
}

function sum(list) {
  return list.reduce((sum, el) => sum === null ? el : sum + el, null);
}

/**
 * Deduplicate the concatenation of `lists`, preserving FEEL `equals`
 * semantics and first-occurrence order.
 *
 * @param {any[][]} lists
 *
 * @return {any[]}
 */
function distinctLists(lists) {

  // hash-bucket scalars and temporals for O(1) probes; complex values
  // (lists, contexts, ranges, durations) fall back to linear equals() scans
  const result = [];
  const seenScalars = new Set();
  const seenTemporals = new Set();
  const complex = [];

  const temporalKey = (e) => {
    const type = getType(e);

    if (type === 'date' || type === 'time' || type === 'date time') {
      return `${type}|${isZoned(e) ? 1 : 0}|${toComparable(e)}`;
    }

    return null;
  };

  for (const list of lists) {
    for (const e of list) {

      // NaN excluded: it is never equal to itself per equals() and
      // thus never deduplicated
      const scalar = (
        typeof e === 'number' && !Number.isNaN(e) ||
        typeof e === 'string' ||
        typeof e === 'boolean' ||
        e === null ||
        e === undefined
      );

      // complex values are probed against scalars, too: equals() unwraps
      // single-element lists, so [ 1 ] equals 1
      if (scalar) {
        if (seenScalars.has(e) || complex.some(c => equals(e, c))) {
          continue;
        }

        seenScalars.add(e);
        result.push(e);

        continue;
      }

      const key = temporalKey(e);

      if (key !== null) {
        if (seenTemporals.has(key) || complex.some(c => equals(e, c))) {
          continue;
        }

        seenTemporals.add(key);
        result.push(e);

        continue;
      }

      if (result.some(r => equals(e, r))) {
        continue;
      }

      complex.push(e);
      result.push(e);
    }
  }

  return result;
}

function flatten<T>(list: (T | T[])[]): T[] {

  const result: T[] = [];

  // explicit stack of [array, index] frames, deepest list on top
  const stack: [ (T | T[])[], number ][] = [ [ list, 0 ] ];

  while (stack.length) {
    const frame = stack[stack.length - 1];
    const [ items, index ] = frame;

    if (index >= items.length) {
      stack.pop();
      continue;
    }

    frame[1]++;

    const item = items[index];

    if (Array.isArray(item)) {
      stack.push([ item, 0 ]);
    } else if (item !== undefined) {
      result.push(item);
    }
  }

  return result;
}

function toKeyString(key) {
  if (typeof key === 'string' && NON_WORD_PATTERN.test(key)) {
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
    return obj.toString();
  }

  if (type === 'date time') {
    return obj.toString();
  }

  if (type === 'date') {
    return obj.toString();
  }

  if (type === 'range') {
    return '<range>';
  }

  if (type === 'time') {
    return obj.toString();
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
  const result = func(n * 10 ** scale) / 10 ** scale;

  return isNaN(result) ? n : result;
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

const WEEKDAY_NAMES = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Concatenates flags for a regular expression.
 *
 * Ensures that default flags are included without duplication, even if
 * user-specified flags overlap with the defaults.
 */
export function buildFlags(flags: string, defaultFlags: string) {

  const unsupportedFlags = flags.replace(SUPPORTED_FLAGS_PATTERN, '');

  if (unsupportedFlags) {
    throw new Error('illegal flags: ' + unsupportedFlags);
  }

  // we don't implement the <x> flag
  if (EXTENDED_FLAG_PATTERN.test(flags)) {
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