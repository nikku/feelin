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

    case 'null': return (context) => {
      return null;
    };

    case 'Disjunction': return (context) => {

      const a = args[0](context);

      const b = args[2](context);

      return !!(a || b);
    };

    case 'Conjunction': return (context) => {

      const a = args[0](context);

      const b = args[2](context);

      return !!(a && b);
    };

    case 'Context': return (context) => {

      return args.map(entry => entry(context)).reduce((obj, [key, value]) => {
        obj[key] = value;

        return obj;
      }, {});
    };

    case 'ContextEntry': return (context) => {

      const key = typeof args[0] === 'function' ? args[0](context) : args[0];

      const value = args[1](context);

      return [ key, value ];
    };

    case 'Key': return args[0];

    case 'QualifiedName': return (context) => getFromContext(args.join('.'), context);

    case 'Name': return input;

    case 'and': return null;

    /*
      expression !compare kw<"in"> PositiveUnaryTest |
      expression !compare kw<"in"> !unaryTest "(" PositiveUnaryTests ")"
     */
    case 'InTester': return (context) => (b) => (a) => {

      const tests = b(context);

      return (Array.isArray(tests) ? tests : [ tests ]).every(test => compareValOrFn(test, a));
    };

    case 'InExtractor': return (context) => {

      return (prop, _target) => {

        const target = _target(context);

        if (!Array.isArray(target)) {
          throw new Error('<a> in <b> must target <b> : Collection');
        }

        return target.map(t => (
          { [prop]: t }
        ));

      };

    };

    // expression
    // expression ".." expression
    case 'IterationContext': return (context) => {

      const a = args[0](context);

      const b = args[1] && args[1](context);

      if (!b) {
        return a;
      }

      return createRange(a, b);
    };

    case 'Type': return args[0];

    case 'InExpressions': return (context) => {

      const iterationContexts = args.map(ctx => ctx(context));

      return cartesianProduct(iterationContexts)
        .map(ctx => Array.isArray(ctx) ? Object.assign({}, ...ctx) : ctx);
    };

    case 'InExpression': return (context) => {

      const [ prop, extractor, target ] = args;

      return extractor(context)(prop, target);
    };

    case 'InstanceOf': return (context) => {

      const a = args[0](context);
      const b = args[1](context);

      return a instanceof b;
    };

    case 'every': return (context) => {
      return (_contexts, _condition) => {
        const contexts = _contexts(context);
        return contexts.every(ctx => _condition(ctx));
      };

    };

    case 'some': return (context) => {
      return (_contexts, _condition) => {
        const contexts = _contexts(context);
        return contexts.some(ctx => _condition(ctx));
      };
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

      const [ compA, compFn, compB, _compareAnd, compC ] = args;

      // between
      if (args.length === 5) {
        return compFn(context)(compA, compB, compC);
      }

      return compFn(context)(compB)(compA);
    };

    case 'QuantifiedExpression': return (context) => {

      const testFn = args[0](context);

      const contexts = args[1];

      const condition = args[3];

      return testFn(contexts, condition);
    };

    // DMN 1.2 - 10.3.2.14
    // kw<"for"> commaSep1<InExpression<IterationContext>> kw<"return"> expression
    case 'ForExpression': return (context) => {
      const extractor = args[args.length - 1];

      const iterationContexts = args[1](context);

      return iterationContexts.map(
        ctx => extractor(ctx)
      );
    };

    case 'UnaryExpression': return (context) => {
      const operator = args[0](context);
      return operator(() => 0, args[1]);
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

    case 'SuperSimplePositiveUnaryTest': return (context) => {

      if (args.length === 1) {
        return wrapTest(args[0](context));
      }

      return args[0](context)(args[1]);
    };

    case 'List': return (context) => {
      return args.map(arg => arg(context));
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

function range(size, startAt = 0) {
  const r = [...Array(size).keys()].map(i => i + startAt);

  r.__isRange = true;

  return r;
}

function createRange(start, end) {

  if (typeof start === 'number' && typeof end === 'number') {

    const steps = end - start;

    return range(steps + 1, start);
  }

  throw new Error('unsupported range');
}

function cartesianProduct(arrays) {

  const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
  const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

  return cartesian(...arrays);
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