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

        parent.args.push(evalNode(type, input.slice(start, end), current.args));

      }
    });

    return root.args[root.args.length - 1](context);
  };

}


function evalNode(type, input, args) {

  // console.log(type.name, input, args);

  switch (type.name) {
    case 'ArithOp': return (context) => {
      switch (input) {
        case '+': return (a, b) => a(context) + b(context);
        case '-': return (a, b) => a(context) - b(context);
        case '*': return (a, b) => a(context) * b(context);
        case '/': return (a, b) => a(context) / b(context);
        case '**':
        case '^': return (a, b) => a(context) ^ b(context);
      }
    };

    case 'CompareOp': return (context) => {

      switch (input) {
        case '>': return (b) => (a) => a(context) > b(context);
        case '>=': return (b) => (a) => a(context) >= b(context);
        case '<': return (b) => (a) => a(context) < b(context);
        case '<=': return (b) => (a) => a(context) <= b(context);
        case '=': return (b) => (a) => a(context) == b(context);
        case '!=': return (b) => (a) => a(context) != b(context);
      }
    };

    case 'QualifiedName': return (context) => getFromContext(args.join('.'), context);

    case 'Name': return input;

    case 'and': return null;

    /*
      expression !compare kw<"in"> PositiveUnaryTest |
      expression !compare kw<"in"> !unaryTest "(" PositiveUnaryTests ")"
     */
    case 'in': return (context) => (b) => (a) => {

      const tests = b(context);

      return (Array.isArray(tests) ? tests : [ tests ]).every(test => compareValOrFn(test, a));
    };

    case 'between': return (context) => (expr, start, end) => start(context) <= expr(context) <= end(context);

    case 'NumericLiteral': return (context) => input.includes('.') ? parseFloat(input) : parseInt(input);

    case 'BooleanLiteral': return (context) => input === 'true' ? true : false;

    case 'StringLiteral': return (context) => input.slice(1, -1);

    case 'PositionalParameters': return (context) => args;

    case 'FunctionInvocation': return (context) => args[0](context)(...args[1](context).map(fn => fn(context)));

    case 'IfExpression': return (context) => {
      const [ _if, ifCondition, _then, thenValue, _else, elseValue ] = args;

      if (ifCondition(context)) {
        return thenValue(context);
      } else {
        return elseValue(context);
      }
    };

    case 'Parameters': return args[0];

    case 'Comparison': return (context) => {

      // between
      if (args.length === 5) {
        return null;
      }

      const [ compA, compFn, compB ] = args;

      return compFn(context)(compB)(compA);
    };

    case 'ArithmeticExpression': return (context) => {
      const [ a, op, b ] = args;

      return op(context)(a, b);
    };

    case 'PositiveUnaryTest': return args[0];

    case 'PositiveUnaryTests': return (context) => args.map(a => a(context));

    case 'PathExpression': return (context) => {

      const pathTarget = args[0](context);
      const pathProp = args[1];

      if (Array.isArray(pathTarget)) {
        return pathTarget.map(el => el[pathProp]);
      } else {
        return pathTarget[pathProp];
      }
    };

    case 'FilterExpression': return (context) => {

      const filterTarget = args[0](context);

      return filterTarget.filter(el => {

        const filter = args[1]({
          ...context,
          ...el
        });

        return filter;
      });
    };

    case 'UnaryExpression': return (context) => args[0](context)(() => 0, args[1]);

    case 'SuperSimplePositiveUnaryTest': return (context) => {

      if (args.length === 1) {
        return wrapTest(args[0](context));
      }

      return args[0](context)(args[1]);
    };

    case 'Interval':
      return new Interval(args[0], args[1], args[3], args[4]);

    case 'Script': return (context) => args[args.length - 1](context);
  }
}


function getFromContext(variable, context) {
  return context[variable];
}

function compareValOrFn(valOrFn, expr) {

  if (typeof valOrFn === 'function') {
    return valOrFn(expr);
  }

  return (context) => valOrFn == expr(context);
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