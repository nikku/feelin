import { parser } from './parser';

function Evaluator(parser) {

  this.parser = parser;

  this.test = (input, test, context) => {

    context = {
      ...context,
      INPUT: input
    };

    const actualInput = `INPUT in ${test}`;

    return this.eval(actualInput, context);
  };

  this.eval = (input, context) => {

    const tree = parser.parse(input);

    const root = { args: [] };

    const stack = [ root ];

    tree.iterate({
      enter(type, start, end) {

        stack.push({ args: [] });
      },

      leave(type, start, end) {

        const current = stack.pop();

        const parent = stack[stack.length - 1];

        parent.args.push(evalNode(type, input.slice(start, end), current.args, context));

      }
    });

    return root.args[root.args.length - 1];
  };

}


function evalNode(type, input, args, context) {

  switch (type.name) {
    case 'ArithOp':
      switch (input) {
        case '+': return (a, b) => a + b;
        case '-': return (a, b) => a - b;
        case '*': return (a, b) => a * b;
        case '/': return (a, b) => a / b;
        case '**':
        case '^': return (a, b) => a ^ b;
      }

    case 'CompareOp':
      switch (input) {
        case '>': return (b) => (a) => a > b;
        case '>=': return (b) => (a) => a >= b;
        case '<': return (b) => (a) => a < b;
        case '<=': return (b) => (a) => a <= b;
        case '=': return (b) => (a) => a == b;
        case '!=': return (b) => (a) => a != b;
      }

    case 'Name': return getFromContext(input, context);

    case 'and': return null;

    case 'in': return (expr, values) => (Array.isArray(values) ? values : [ values ]).every(valOrFn => compareValOrFn(valOrFn, expr));

    case 'between': return (expr, start, end) => expr >= start && expr >= end;

    case 'Literal': return args[0] === 'null' ? null : args[0];

    case 'NumericLiteral': return input.includes('.') ? parseFloat(input) : parseInt(input);

    case 'BooleanLiteral': return input === 'true' ? true : false;

    case 'StringLiteral': return input.slice(1, -1);

    case 'Comparison':
      // between
      if (args.length === 5) {
        return null;
      }

      const [ a1, fn, b1 ] = args;

      return fn(a1, b1);

    case 'ArithmeticExpression':
      const [ a, op, b ] = args;

      return op(a, b);

    case 'PositiveUnaryTest': return args[0];
    case 'PositiveUnaryTests': return args;

    case 'SimplePositiveUnaryTest':

      if (args.length === 1) {
        return wrapTest(args[0]);
      }

      return args[0](args[1]);

    case 'Interval':
      return new Interval(args[0], args[1], args[3], args[4]);

    case 'Script':
      return args[args.length - 1];
  }
}


function getFromContext(variable, context) {
  return context[variable];
}

function compareValOrFn(valOrFn, expr) {

  if (typeof valOrFn === 'function') {
    return valOrFn(expr);
  }

  return valOrFn == expr;
}

function wrapTest(value) {

  if (typeof value === 'function') {
    return value;
  }

  if (typeof value === 'number') {
    return (a) => a === value ? a : false;
  }

  if (value instanceof Interval) {
    return (a) => value.includes(a);
  }

  throw new Error(`unexpected value: ${value}`);
}

function Interval(start, startValue, endValue, end) {

  this.start = start;
  this.startValue = startValue;

  this.endValue = endValue;
  this.end = end;

  this.includes = (value) => {
    return this.includesFrom(value) && this.includesTo(value);
  };

  this.includesFrom = (value) => {
    [ "(", "]" ].includes(this.start) ? value >= this.start : value > this.start;
  };

  this.includesTo = (value) => {
    [ ")", "[" ].includes(this.end) ? value <= this.end : value < this.end;
  };
}

const evaluator = new Evaluator(parser);

export {
  evaluator
};