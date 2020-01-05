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

  'list contains': function() {
    throw notImplemented();
  },

  'count': function() {
    throw notImplemented();
  },

  'min': function() {
    throw notImplemented();
  },

  'max': function() {
    throw notImplemented();
  },

  'sum': function() {
    throw notImplemented();
  },

  'mean': function() {
    throw notImplemented();
  },

  'all': function() {
    throw notImplemented();
  },

  'any': function() {
    throw notImplemented();
  },

  'sublist': function() {
    throw notImplemented();
  },

  'append': function() {
    throw notImplemented();
  },

  'concatenate': function() {
    throw notImplemented();
  },

  'insert before': function() {
    throw notImplemented();
  },

  'remove': function() {
    throw notImplemented();
  },

  'reverse': function() {
    throw notImplemented();
  },

  'index of': function(list, match) {

    return list.reduce(function(result, element, index) {

      if (matches(element, match)) {
        result.push(index + 1);;
      }

      return result;
    }, []);
  },

  'union': function() {
    throw notImplemented();
  },

  'distinct values': function() {
    throw notImplemented();
  },

  'flatten': function() {
    throw notImplemented();
  },

  'product': function() {
    throw notImplemented();
  },

  'median': function() {
    throw notImplemented();
  },

  'stddev': function() {
    throw notImplemented();
  },

  'mode': function() {
    throw notImplemented();
  },


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

function createArgsValidator(argDefinitions) {

  const tests = argDefinitions.map(arg => {

    const optional = arg.endsWith('?');

    const type = optional ? arg.substring(0, arg.length - 1) : arg;

    return function(obj) {

      const objType = typeof obj;

      if (obj === null || objType === 'undefined') {
        return optional;
      }

      if (type === 'context') {
        return objType === 'object';
      }

      if (type !== 'any' && objType !== type) {
        return false;
      }

      return true;
    };
  });

  return function(args) {
    return tests.every((test, index) => {
      return test(args[index]);
    });
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