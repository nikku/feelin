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

  'string': function() {
    throw notImplemented();
  },

  'duration': function() {
    throw notImplemented();
  },

  'years and months duration': function() {
    throw notImplemented();
  },


  // 10.3.4.2 Boolean function
  'not': function(bool) {

    if (bool === null) {
      return null;
    }

    return !bool;
  },


  // 10.3.4.3 String functions
  'substring': function() {
    throw notImplemented();
  },

  'string length': function() {
    throw notImplemented();
  },

  'upper case': function() {
    throw notImplemented();
  },

  'lower case': function() {
    throw notImplemented();
  },

  'substring before': function() {
    throw notImplemented();
  },

  'substring after': function() {
    throw notImplemented();
  },

  'replace': function() {
    throw notImplemented();
  },

  'contains': function() {
    throw notImplemented();
  },

  'starts with': function() {
    throw notImplemented();
  },

  'ends with': function() {
    throw notImplemented();
  },

  'split': function() {
    throw notImplemented();
  },


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
  'decimal': function() {
    throw notImplemented();
  },

  'floor': function() {
    throw notImplemented();
  },

  'ceiling': function() {
    throw notImplemented();
  },

  'abs': function(number) {

    if (typeof number !== 'number') {
      return null;
    }

    return Math.abs(number);
  },

  'modulo': function() {
    throw notImplemented();
  },

  'sqrt': function() {
    throw notImplemented();
  },

  'log': function() {
    throw notImplemented();
  },

  'exp': function() {
    throw notImplemented();
  },

  'odd': function() {
    throw notImplemented();
  },

  'even': function() {
    throw notImplemented();
  },


  // 10.3.4.6 Sort

  'sort': function() {
    throw notImplemented();
  },


  // 10.3.2.6 Context
  'get value': function() {
    throw notImplemented();
  },

  'get entries': function() {
    throw notImplemented();
  }
};

export {
  names,
  builtins
};

function matches(a, b) {
  return a === b;
}

function notImplemented() {
  return new Error('not implemented');
}