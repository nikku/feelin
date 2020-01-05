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

  // 10.3.4.6 Sort

  'sort',

  // 10.3.2.6 Context
  'get value',
  'get entries'
];


const builtins = {

  // 10.3.4.1 Conversion functions
  'date': function() {
    throw notImplemented();
  },

  'date and time': function() {
    throw notImplemented();
  },

  'time': function() {
    throw notImplemented();
  },

  'number': function() {
    throw notImplemented();
  },

  'string': fn(function(obj) {
    return String(obj);
  }, [ 'any' ]),

  'duration': function() {
    throw notImplemented();
  },

  'years and months duration': function() {
    throw notImplemented();
  },


  // 10.3.4.2 Boolean function
  'not': fn(function(bool) {
    return !bool;
  }, [ 'any' ]),


  // 10.3.4.3 String functions
  'substring': fn(function(str, start, length) {

    const _start = (start < 0 ? str.length + start : start - 1);

    return (
      arguments.length === 3
        ? str.substring(_start, _start + length)
        : str.substring(_start)
    );
  }, [ 'string', 'number', 'number?' ]),

  'string length': fn(function(str) {
    return str.length;
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

  'replace': fn(function(str, pattern, replacement) {
    return str.replace(new RegExp(pattern), replacement);
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
    return str.split(new RegExp(separator));
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
      arguments.length === 3
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
    throw notImplemented();
  }, [ 'list' ]),

  'distinct values': fn(function(list) {
    throw notImplemented();
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
    throw notImplemented();
  }, 'number'),

  'stddev': listFn(function(numbers) {
    throw notImplemented();
  }, 'number'),

  'mode': listFn(function(numbers) {
    throw notImplemented();
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
    return Math.floor(dividend / divisor);
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


  // 10.3.4.6 Sort

  'sort': function() {
    throw notImplemented();
  },


  // 10.3.2.6 Context
  'get value': fn(function(context, value) {
    return context[value];
  }, [ 'context', 'string' ]),

  'get entries': fn(function(context) {
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

function createArgTester(arg) {
  const optional = arg.endsWith('?');

  const type = optional ? arg.substring(0, arg.length - 1) : arg;

  return function(obj) {

    const objType = typeof obj;

    if (obj === null || objType === 'undefined') {
      return optional;
    }

    if (type === 'list') {
      return Array.isArray(obj);
    }

    if (type === 'context') {
      return objType === 'object';
    }

    if (type !== 'any' && objType !== type) {
      return false;
    }

    return true;
  };
}

function createArgsValidator(argDefinitions) {

  const tests = argDefinitions.map(createArgTester);

  return function(args) {
    return tests.every((test, index) => {
      return test(args[index]);
    });
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

    if (!args.every(tester)) {
      return null;
    }

    return fnDefinition(args);
  };
}

function fn(fnDefinition, argDefinitions) {

  const validArgs = createArgsValidator(argDefinitions);

  return function(...args) {

    if (!validArgs(args)) {
      return null;
    }

    return fnDefinition(...args);
  };
}

function sum(list) {
  return list.reduce((sum, el) => sum === null ? el : sum + el, null);
}

function flatten([x,...xs]) {
  return (
    x !== undefined
      ? [...Array.isArray(x) ? flatten(x) : [x],...flatten(xs)]
      : []
  );
}

function round(n) {

  const integral = Math.trunc(n);

  if (n - integral > .5) {
    return integral + 1;
  } else {
    return integral;
  }
}

function notImplemented() {
  return new Error('not implemented');
}