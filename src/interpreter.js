import { parser } from './parser';

function Interpreter(parser) {

  this.parser = parser;

  this.unaryTest = (input, test, context) => {

    context = {
      ...context,
      __INPUT: input
    };

    return this.evaluate(`__INPUT in (${test})`, context);
  };

  this.injectBuiltins = (context) => {
    return context;
  };

  this.parseName = (name) => {

    let match;

    const pattern = /([.\/\-'+*]+)|([^\s.\/\-'+*]+)/g;

    const tokens = [];

    let lastName = false;

    while ((match = pattern.exec(name))) {

      const [ _, additionalPart, namePart ] = match;

      if (additionalPart) {
        lastName = false;

        if (tokens.length) {
          tokens.push('\\s*');
        }

        tokens.push(additionalPart.replace(/[+*]/g, '\\$&'));
      } else {
        if (tokens.length) {
          if (lastName) {
            tokens.push('\\s+');
          } else {
            tokens.push('\\s*');
          }
        }

        lastName = true;

        tokens.push(namePart);
      }
    }

    return tokens;
  };

  this.findNames = (context) => {

    let uid = 0;

    return Object.keys(context).filter(key => /[\s.\/\-'+*]/.test(key)).map(name => {

      const replacement = '_' + uid.toString(36);
      const tokens = this.parseName(name);

      const replacer = new RegExp(tokens.join(''), 'g');

      return {
        name,
        replacement,
        replacer
      };
    });

  };

  this.replaceNames = (input, context, names) => {

    for (const { name, replacement, replacer } of names) {

      input = input.replace(replacer, function(match) {

        const placeholder = replacement.padEnd(match.length, '_');

        if (!context[placeholder]) {
          context = {
            ...context,
            [match]: context[name]
          };
        }

        return placeholder;
      });
    };

    return {
      input,
      context
    };
  };

  this.parse = (rawInput, rawContext) => {

    const injectedContext = this.injectBuiltins(rawContext);

    const names = this.findNames(injectedContext);

    const {
      context,
      input
    } = this.replaceNames(rawInput, injectedContext, names);

    const tree = parser.parse(input);

    return {
      context,
      input,
      tree
    };
  };

  this.evaluate = (input, context) => {

    const {
      tree,
      context: parsedContext
    } = this.parse(input, context);

    const root = { args: [] };

    const stack = [ root ];

    tree.iterate({
      enter(type, start, end) {
        const nodeInput = input.slice(start, end);

        stack.push({
          nodeKey: `${type.name}-${nodeInput}`,
          nodeInput,
          args: []
        });
      },

      leave(type, start, end) {

        const {
          nodeKey,
          nodeInput,
          args
        } = stack.pop();

        const parent = stack[stack.length - 1];

        const expr = evalNode(type, nodeInput, args);

        parent.args.push(expr);
      }
    });

    return root.args[root.args.length - 1](parsedContext);
  };

}


function evalNode(type, input, args) {

  if (process.env.LOG === 'evalNode') {
    console.log(type.name, input, args);
  }

  switch (type.name) {
    case 'ArithOp': return (context) => {

      const nullable = (op) => (a, b) => {

        const _a = a(context);
        const _b = b(context);

        return _a === null || _b === null ? null : op(_a, _b);
      };

      switch (input) {
        case '+': return nullable((a, b) => a + b);
        case '-': return nullable((a, b) => a - b);
        case '*': return nullable((a, b) => a * b);
        case '/': return nullable((a, b) => !b ? null : a / b);
        case '**':
        case '^': return nullable((a, b) => a ** b);
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

    case 'Disjunction': return tag((context) => {

      const a = args[0](context);

      const b = args[2](context);

      return !!(a || b);
    }, Test('boolean'));

    case 'Conjunction': return tag((context) => {

      const a = args[0](context);

      const b = args[2](context);

      return !!(a && b);
    }, Test('boolean'));

    case 'Context': return (context) => {

      return args.slice(1, -1).map(entry => entry(context)).reduce((obj, [key, value]) => {
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

    case 'InstanceOf': return tag((context) => {

      const a = args[0](context);
      const b = args[1](context);

      return a instanceof b;
    }, Test('boolean'));

    case 'every': return tag((context) => {
      return (_contexts, _condition) => {
        const contexts = _contexts(context);
        return contexts.every(ctx => _condition(ctx));
      };

    }, Test('boolean'));

    case 'some': return tag((context) => {
      return (_contexts, _condition) => {
        const contexts = _contexts(context);
        return contexts.some(ctx => _condition(ctx));
      };
    }, Test('boolean'));

    case 'between': return tag(
      (context) => (expr, start, end) => start(context) <= expr(context) <= end(context),
      'boolean'
    );

    case 'NumericLiteral': return tag((context) => input.includes('.') ? parseFloat(input) : parseInt(input), 'number');

    case 'BooleanLiteral': return tag((context) => input === 'true' ? true : false, 'boolean');

    case 'StringLiteral': return tag((context) => input.slice(1, -1), 'string');

    case 'PositionalParameters': return (context) => args;

    case 'FunctionInvocation': return (context) => args[0](context)(...args[1](context).map(fn => fn(context)));

    case 'IfExpression': return (function() {

      const ifCondition = args[1];

      const thenValue = args[3];
      const elseValue = args[5];

      const type = coalecenseTypes(thenValue, elseValue);

      return tag((context) => {

        if (ifCondition(context)) {
          return thenValue(context);
        } else {
          return elseValue ? elseValue(context) : null;
        }
      }, type);

    })();

    case 'Parameters': return args.length === 3 ? args[1] : (context) => [];

    case '(': return '(';
    case ')': return ')';
    case '[': return '[';
    case ']': return ']';
    case '{': return '{';
    case '}': return '}';

    /**
     * expression !compare CompareOp<"=" | "!="> expression |
     * expression !compare CompareOp<Gt | Gte | Lt | Lte> expression |
     * expression !compare InTester PositiveUnaryTest |
     * expression !compare kw<"between"> expression kw<"and"> expression |
     * expression !compare InTester !unaryTest "(" PositiveUnaryTests ")"
     */
    case 'Comparison': return (context) => {

      if (args.length === 5) {

        // expression !compare InTester !unaryTest "(" PositiveUnaryTests ")"
        if (args[2] === '(') {
          return args[1](context)(args[3])(args[0]);
        }

        // expression !compare kw<"between"> expression kw<"and"> expression
        return args[1](context)(args[0], args[2], args[4]);
      }

      return args[1](context)(args[2])(args[0]);
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

    case 'PositiveUnaryTests': return (context) => {
      return args.map(a => a(context));
    };

    case 'ParenthesizedExpression': return args[1];

    case 'PathExpression': return (context) => {

      const pathTarget = args[0](context);
      const pathProp = args[1];

      if (Array.isArray(pathTarget)) {
        return pathTarget.map(el => el[pathProp]);
      } else {
        return pathTarget[pathProp];
      }
    };

    // expression !filter "[" expression "]"
    case 'FilterExpression': return (context) => {

      const filterTarget = args[0](context);

      const filterFn = args[2];

      // a[1]
      if (filterFn.type === 'number') {
        const idx = filterFn(context);

        if (!filterTarget) {
          return null;
        }

        if (idx < 0) {
          return filterTarget[filterTarget.length + idx] || null;
        } else {
          return filterTarget[idx - 1] || null;
        }
      }

      // a[true]
      if (filterFn.type === 'boolean') {
        if (filterFn(context)) {
          return filterTarget;
        } else {
          return Array.isArray(filterTarget) ? [] : null;
        }
      }

      // a[test]
      return filterTarget.filter(el => {

        const filter = filterFn({
          ...context,
          ...el
        });

        return filter;
      });
    };

    case 'SuperSimplePositiveUnaryTest': return tag((context) => {

      if (args.length === 1) {
        return args[0](context);
      }

      return args[0](context)(args[1]);
    }, 'test');

    case 'List': return (context) => {
      return args.slice(1, -1).map(arg => arg(context));
    };

    case 'Interval': return (context) => {

      const interval = new Interval(args[0], args[1](context), args[2](context), args[3]);

      return (a) => {
        return interval.includes(a(context));
      };
    };

    case 'Script': return (function() {

      const root = args[args.length - 1];

      return tag((context) => root(context), root.type);
    })();
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


function coalecenseTypes(a, b) {

  if (!b) {
    return a.type;
  }

  if (a.type === b.type) {
    return a.type;
  }

  return 'any';
}

function tag(fn, type) {

  fn.type = type;

  fn.toString = function() {
    return `TaggedFunction[${type}] ${Function.prototype.toString.call(fn)}`
  };

  return fn;
}

function Test(type) {
  return `Test<${type}>`;
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
    return [ '(', ']' ].includes(this.start) ? value > this.startValue : value >= this.startValue;
  };

  this.includesTo = (value) => {
    return [ ')', '[' ].includes(this.end) ? value < this.endValue : value <= this.endValue;
  };
}

const interpreter = new Interpreter(parser);

export {
  interpreter
};