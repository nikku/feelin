import {
  is
} from './types';

const names = [

  // 10.3.4.1 Conversion functions
  'date',
  'date and time',
  'time',
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
  'starts with',
  'ends with',
  'split',

  // 10.3.4.4 List functions
  'list contains',
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

  // 10.3.4.10 Context function
  'get value',
  'get entries'
];


const builtins = {

  // 10.3.4.1 Conversion functions
  'date': function() {
    throw notImplemented('date');
  },

  'date and time': fn(function() {
    throw notImplemented('date and time');
  }, [ 'any' ]),

  'time': function() {
    throw notImplemented('time');
  },

  'number': function() {
    throw notImplemented('number');
  },

  'string': fn(function(obj, b) {
    if (arguments.length !== 1) {
      return null;
    }

    return toString(obj);
  }, [ 'any' ]),

  'duration': function() {
    throw notImplemented('duration');
  },

  'years and months duration': function() {
    throw notImplemented('years and months duration');
  },


  // 10.3.4.2 Boolean function
  'not': fn(function(bool) {
    return is(bool, 'Boolean') ? !bool : null;
  }, [ 'any' ]),


  // 10.3.4.3 String functions
  'substring': fn(function(str, start, length) {

    const _start = (start < 0 ? str.length + start : start - 1);

    const arr = Array.from(str);

    return (
      typeof length !== 'undefined'
        ? arr.slice(_start, _start + length)
        : arr.slice(_start)
    ).join('');
  }, [ 'string', 'number', 'number?' ]),

  'string length': fn(function(str) {
    return countSymbols(str);
  }, [ 'string' ]),

  'upper case': fn(function(str) {
    return str.toUpperCase();
  }, [ 'string' ]),

  'lower case': fn(function(str) {
    return str.toLowerCase();
  }, [ 'string' ]),

  'substring before': fn(function(str, match) {

    const index = str.indexOf(match);

    if (index === -1) {
      return '';
    }

    return str.substring(0, index);
  }, [ 'string', 'string' ]),

  'substring after': fn(function(str, match) {

    const index = str.indexOf(match);

    if (index === -1) {
      return '';
    }

    return str.substring(index + match.length);
  }, [ 'string', 'string' ]),

  'replace': fn(function(str, pattern, replacement, flags='') {
    return str.replace(new RegExp(pattern, 'ug' + flags), replacement.replace(/\$0/g, '$$&'));
  }, [ 'string', 'string', 'string' ]),

  'contains': fn(function(str, match) {
    return str.includes(match);
  }, [ 'string', 'string' ]),

  'starts with': fn(function(str, match) {
    return str.startsWith(match);
  }, [ 'string', 'string' ]),

  'ends with': fn(function(str, match) {
    return str.endsWith(match);
  }, [ 'string', 'string' ]),

  'split': fn(function(str, separator) {
    return str.split(new RegExp(separator, 'u'));
  }, [ 'string', 'string' ]),


  // 10.3.4.4 List functions

  'list contains': fn(function(list, element) {
    return list.some(el => matches(el, element));
  }, ['list', 'any?']),

  'count': fn(function(list) {
    return list.length;
  }, [ 'list']),

  'min': listFn(function(list) {
    return list.reduce((min, el) => min === null ? el : Math.min(min, el), null);
  }, 'number'),

  'max': listFn(function(list) {
    return list.reduce((max, el) => max === null ? el : Math.max(max, el), null);
  }, 'number'),

  'sum': listFn(function(list) {
    return sum(list);
  }, 'number'),

  'mean': listFn(function(list) {
    const s = sum(list);

    return s === null ? s : s / list.length;
  }, 'number'),

  'all': listFn(function(list) {

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

  }, 'any?'),

  'any': listFn(function(list) {

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
  }, 'any?'),

  'sublist': fn(function(list, start, length) {

    const _start = (start < 0 ? list.length + start : start - 1);

    return (
      typeof length !== 'undefined'
        ? list.slice(_start, _start + length)
        : list.slice(_start)
    );

  }, [ 'list', 'number', 'number?' ]),

  'append': fn(function(list, ...items) {
    return list.concat(items);
  }, [ 'list', 'any?' ]),

  'concatenate': fn(function(...args) {

    return args.reduce((result, arg) => {
      return result.concat(arg);
    }, []);

  }, [ 'any' ]),

  'insert before': fn(function(list, position, newItem) {
    return list.slice(0, position - 1).concat([ newItem ], list.slice(position - 1));
  }, [ 'list', 'number', 'any?' ]),

  'remove': fn(function(list, position) {
    return list.slice(0, position - 1).concat(list.slice(position));
  }, [ 'list', 'number' ]),

  'reverse': fn(function(list) {
    return list.slice().reverse();
  }, [ 'list' ]),

  'index of': fn(function(list, match) {

    return list.reduce(function(result, element, index) {

      if (matches(element, match)) {
        result.push(index + 1);
      }

      return result;
    }, []);
  }, [ 'list', 'any' ]),

  'union': fn(function(...lists) {
    throw notImplemented('union');
  }, [ 'list' ]),

  'distinct values': fn(function(list) {
    throw notImplemented('distinct values');
  }, [ 'list' ]),

  'flatten': fn(function(list) {
    return flatten(list);
  }, [ 'list' ]),

  'product': listFn(function(numbers) {
    return numbers.reduce((result, n) => {
      return result * n;
    }, 1);
  }, 'number'),

  'median': listFn(function(numbers) {
    throw notImplemented('median');
  }, 'number'),

  'stddev': listFn(function(numbers) {
    throw notImplemented('stddev');
  }, 'number'),

  'mode': listFn(function(numbers) {
    throw notImplemented('mode');
  }, 'number'),


  // 10.3.4.5 Numeric functions
  'decimal': fn(function(n, scale) {

    if (!scale) {
      return round(n);
    }

    const offset = 10 ** scale;

    return round(n * offset) / (offset);
  }, [ 'number', 'number' ]),

  'floor': fn(function(number) {
    return Math.floor(number);
  }, [ 'number' ]),

  'ceiling': fn(function(number) {
    return Math.ceil(number);
  }, [ 'number' ]),

  'abs': fn(function(number) {

    if (typeof number !== 'number') {
      return null;
    }

    return Math.abs(number);
  }, [ 'number' ]),

  'modulo': fn(function(dividend, divisor) {

    const adjust = 1000000000;

    // cf. https://dustinpfister.github.io/2017/09/02/js-whats-wrong-with-modulo/
    //
    // need to round here as using this custom modulo
    // variant is prone to rounding errors
    return Math.round((dividend % divisor + divisor) % divisor * adjust) / adjust;
  }, [ 'number' ]),

  'sqrt': fn(function(number) {

    if (number < 0) {
      return null;
    }

    return Math.sqrt(number);
  }, [ 'number' ]),

  'log': fn(function(number) {
    return Math.log(number);
  }, [ 'number' ]),

  'exp': fn(function(number) {
    return Math.exp(number);
  }, [ 'number' ]),

  'odd': fn(function(number) {
    return number % 2 === 1;
  }, [ 'number' ]),

  'even': fn(function(number) {
    return number % 2 === 0;
  }, [ 'number' ]),


  // 10.3.4.6 Date and time functions

  'is': fn(function() {
    throw notImplemented('is');
  }, [ 'any?' ]),

  // 10.3.4.7 Range Functions

  'before': fn(function() {
    throw notImplemented('before');
  }, [ 'any?' ]),

  'after': fn(function() {
    throw notImplemented('after');
  }, [ 'any?' ]),

  'meets': fn(function() {
    throw notImplemented('meets');
  }, [ 'any?' ]),

  'met by': fn(function() {
    throw notImplemented('met by');
  }, [ 'any?' ]),

  'overlaps': fn(function() {
    throw notImplemented('overlaps');
  }, [ 'any?' ]),

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

  'includes': fn(function() {
    throw notImplemented('includes');
  }, [ 'any?' ]),

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

  'day of year': fn(function() {
    throw notImplemented('day of year');
  }, [ 'any?' ]),

  'day of week': fn(function() {
    throw notImplemented('day of week');
  }, [ 'any?' ]),

  'month of year': fn(function() {
    throw notImplemented('month of year');
  }, [ 'any?' ]),

  'week of year': fn(function() {
    throw notImplemented('week of year');
  }, [ 'any?' ]),


  // 10.3.4.9 Sort

  'sort': function() {
    throw notImplemented('sort');
  },


  // 10.3.4.10 Context function

  'get value': fn(function(context, key) {

    if (arguments.length !== 2) {
      return null;
    }

    if (!context) {
      return null;
    }

    return key in context ? context[key] : null;

  }, [ 'context', 'string' ]),

  'get entries': fn(function(context) {

    if (arguments.length !== 1) {
      return null;
    }

    if (Array.isArray(context)) {
      return null;
    }

    return Object.entries(context).map(([key, value]) => ({ key, value }));
  }, [ 'context' ]),
};

export {
  names,
  builtins
};

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
        return [ obj ];
      }
    }

    if (arr && obj.length === 1) {

      // implicit conversion [ obj ] => obj
      obj = obj[0];
    }

    const objType = typeof obj;

    if (obj === null || objType === 'undefined') {
      return (optional ? obj : FALSE);
    }

    if (type === 'context') {
      return objType === 'object' ? obj : FALSE;
    }

    if (type !== 'any' && objType !== type) {
      return FALSE;
    }

    return obj;
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

function listFn(fnDefinition, type) {

  const tester = createArgTester(type);

  return function(...args) {

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

    return fnDefinition(args);
  };
}

function fn(fnDefinition, argDefinitions) {

  const checkArgs = createArgsValidator(argDefinitions);

  return function(...args) {

    const convertedArgs = checkArgs(args);

    if (!convertedArgs) {
      return null;
    }

    return fnDefinition(...convertedArgs);
  };
}

function sum(list) {
  return list.reduce((sum, el) => sum === null ? el : sum + el, null);
}

function flatten([x,...xs]: any[]) {
  return (
    x !== undefined
      ? [...Array.isArray(x) ? flatten(x) : [x],...flatten(xs)]
      : []
  );
}

function toKeyString(key) {
  if (/\W/.test(key)) {
    return toString(key, true);
  }

  return key;
}

function toDeepString(obj) {
  return toString(obj, true);
}

function toString(obj, wrap:boolean=false) {

  if (obj === null) {
    return 'null';
  }

  if (typeof obj === 'string') {
    return (wrap && '"' || '') + obj + (wrap && '"' || '');
  }

  if (typeof obj === 'boolean' || typeof obj === 'number') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(toDeepString).join(', ') + ']';
  }

  return '{' + Object.entries(obj).map((entry, idx) => {
    return toKeyString(entry[0]) + ': ' + toDeepString(entry[1]);
  }).join(', ') + '}';
}

function countSymbols(str) {

  // cf. https://mathiasbynens.be/notes/javascript-unicode
  return str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '_').length;
}

function round(n) {

  const integral = Math.trunc(n);

  if (n - integral > .5) {
    return integral + 1;
  } else {
    return integral;
  }
}

function notImplemented(fn) {
  return new Error(`not implemented: ${fn}`);
}