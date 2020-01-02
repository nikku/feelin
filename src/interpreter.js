import {
  parser as expressionParser
} from './parser';

import {
  parser as unaryTestParser
} from './unary-parser';

import { NodeProp } from 'lezer';

function Interpreter() {

  this.injectBuiltins = (context) => {
    return context;
  };

  this.parseName = (name) => {

    let match;

    const pattern = /([./\-'+*]+)|([^\s./\-'+*]+)/g;

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

    return Object.keys(context).filter(key => /[\s./\-'+*]/.test(key)).map(name => {

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
    }

    return {
      input,
      context
    };
  };

  this.parse = (parser, rawInput, rawContext) => {

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

  this.traverse = (tree, input) => {

    const root = { args: [] };

    const stack = [ root ];

    tree.iterate({
      enter(node, start, end) {

        if (node.prop(NodeProp.skipped)) {
          return false;
        }

        const nodeInput = input.slice(start, end);

        stack.push({
          nodeInput,
          args: []
        });
      },

      leave(node, start, end) {

        if (node.prop(NodeProp.skipped)) {
          return;
        }

        const {
          nodeInput,
          args
        } = stack.pop();

        const parent = stack[stack.length - 1];

        const expr = evalNode(node, nodeInput, args);

        parent.args.push(expr);
      }
    });

    return root.args[root.args.length - 1];
  };

  this.evaluate = (expression, context) => {

    const {
      tree,
      context: parsedContext
    } = this.parse(expressionParser, expression, context);

    const root = this.traverse(tree, expression);

    const results = root(parsedContext);

    if (results.length === 1) {
      return results[0];
    } else {
      return results;
    }
  };

  this.unaryTest = (value, expression, context) => {

    context = {
      ...context,
      '?': value
    };

    const {
      tree,
      context: parsedContext
    } = this.parse(unaryTestParser, expression, context);

    const root = this.traverse(tree, expression);

    return root(parsedContext)(value);
  };

}


function evalNode(node, input, args) {

  if (process.env.LOG === 'evalNode') {
    console.log(node.name, input, args);
  }

  switch (node.name) {
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

  case 'CompareOp': return tag((context) => {

    const compare = (fn) => {
      return (b) => (a) => {

        const _a = a(context);
        const _b = b(context);

        return fn(_a, _b) ? (context.__extractLeft ? _a : true) : false;
      };
    };

    switch (input) {
    case '>': return compare((a, b) => a > b);
    case '>=': return compare((a, b) => a >= b);
    case '<': return compare((a, b) => a < b);
    case '<=': return compare((a, b) => a <= b);
    case '=': return compare((a, b) => a == b);
    case '!=': return compare((a, b) => a != b);
    }

  }, Test('boolean'));

  case 'Wildcard': return (context) => true;

  case 'null': return (context) => {
    return null;
  };

  case 'Disjunction': return tag((context) => {

    const a = args[0](context);

    const b = args[2](context);

    const joined = a || b;

    return context.__extractLeft ? joined : !!joined;
  }, Test('boolean'));

  case 'Conjunction': return tag((context) => {

    const a = args[0](context);

    const b = args[2](context);

    const joined = a && b;

    return context.__extractLeft ? joined : !!joined;
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

  case '?': return (context) => getFromContext('?', context);

  case 'Name': return input;

  case 'not': return 'not';
  case 'and':
  case 'in':
  case 'if':
  case 'then':
  case 'else':
  case 'or':
  case 'satisfies':
  case 'for':
  case 'return': return undefined;

  // expression !compare kw<"in"> PositiveUnaryTest |
  // expression !compare kw<"in"> !unaryTest "(" PositiveUnaryTests ")"
  case 'InTester': return (context) => (b) => (a) => {

    const tests = b(context);

    const left = a(context);

    return (Array.isArray(tests) ? tests : [ tests ]).every(
      test => compareValOrFn(test, () => left)
    ) ? (context.__extractLeft ? left : true) : false;
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
      return contexts.every(ctx => isTruthy(_condition(ctx)));
    };

  }, Test('boolean'));

  case 'some': return tag((context) => {
    return (_contexts, _condition) => {
      const contexts = _contexts(context);
      return contexts.some(ctx => isTruthy(_condition(ctx)));
    };
  }, Test('boolean'));

  case 'between': return tag(
    (context) => (expr, start, end) => {

      const left = expr(context);

      const _start = start(context);
      const _end = end(context);

      return Math.min(_start, _end) <= left <= Math.max(_start, _end) ? (context.__extractLeft ? left : true) : false;
    },
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

      if (isTruthy(ifCondition(context))) {
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

  // expression !compare CompareOp<"=" | "!="> expression |
  // expression !compare CompareOp<Gt | Gte | Lt | Lte> expression |
  // expression !compare InTester PositiveUnaryTest |
  // expression !compare kw<"between"> expression kw<"and"> expression |
  // expression !compare InTester !unaryTest "(" PositiveUnaryTests ")"
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

    const partial = [];

    for (const ctx of iterationContexts) {

      partial.push(extractor({
        ...ctx,
        partial
      }));
    }

    return partial;
  };

  case 'UnaryExpression': return (function() {
    const operator = args[0];

    const value = args[1];

    return tag((context) => {

      return operator(context)(() => 0, value);
    }, value.type);
  })();

  case 'ArithmeticExpression': return (function() {

    const [ a, op, b ] = args;

    return tag((context) => {
      return op(context)(a, b);
    }, coalecenseTypes(a, b));
  })();

  case 'PositiveUnaryTest': return args[0];

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

      if (!Array.isArray(filterTarget)) {
        return filterTarget;
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
    return filterTarget.map(el => {

      const iterationContext = {
        ...context,
        item: el,
        ...Object.entries(el).reduce(function(itemScope, [key, value]) {
          itemScope[ 'item.' + key ] = value;

          return itemScope;
        }, {}),
        ...el,
        __extractLeft: true
      };

      return filterFn(iterationContext);
    }).filter(isTruthy);
  };

  case 'SimplePositiveUnaryTest': return tag((context) => {

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

  case 'PositiveUnaryTests':
  case 'Expressions': return (context) => {
    return args.map(a => a(context));
  };

  case 'UnaryTests': return (context) => {

    return (value={}) => {

      const negate = args[0] === 'not';

      const tests = negate ? args.slice(2, -1) : args;

      const matches = tests.map(test => test(context)).map(r => {

        if (Array.isArray(r)) {
          return r.map(r => {

            if (Array.isArray(r)) {
              return r.includes(value);
            }

            if (r === null) {
              return null;
            }

            if (typeof r === 'boolean') {
              return r;
            }

            if (typeof r === 'function') {
              return r(() => value);
            }

            if (typeof r === typeof value) {
              return r === value;
            }

            return null;
          }).reduce(combineResult, undefined);
        }

        if (r === null) {
          return null;
        }

        if (typeof r === 'boolean') {
          return r;
        }

        if (typeof r === 'function') {
          return r(value);
        }

        if (typeof r === typeof value) {
          return r === value;
        }

        return null;
      }).reduce(combineResult, undefined);

      return matches === null ? null : (negate ? !matches : matches);
    };
  };

  default: throw new Error(`unsupported node <${node.name}>`);
  }
}


function getFromContext(variable, context) {

  if (variable in context) {
    return context[variable];
  }

  return null;
}

function compareValOrFn(valOrFn, expr) {

  if (typeof valOrFn === 'function') {
    return valOrFn(expr);
  }

  return (context) => valOrFn == expr(context);
}

function range(size, startAt = 0, direction = 1) {

  const r = [...Array(size).keys()].map(i => i * direction + startAt);

  r.__isRange = true;

  return r;
}

function createRange(start, end) {

  if (typeof start === 'number' && typeof end === 'number') {

    const steps = Math.max(start, end) - Math.min(start, end);

    return range(steps + 1, start, end < start ? -1 : 1);
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
    return `TaggedFunction[${type}] ${Function.prototype.toString.call(fn)}`;
  };

  return fn;
}

function combineResult(result, match) {

  if (!result) {
    return match;
  }

  return result;
}

function isTruthy(obj) {
  return obj !== false && obj !== null;
}

function Test(type) {
  return `Test<${type}>`;
}

function Interval(start, startValue, endValue, end) {

  const exclusiveStart = [ '(', ']' ].includes(start);
  const exclusiveEnd = [ ')', '[' ].includes(end);

  const direction = Math.sign(endValue - startValue);

  const rangeStart = (exclusiveStart ? direction : 0) + startValue;
  const rangeEnd = (exclusiveEnd ? -direction : 0) + endValue;

  const realStart = Math.min(rangeStart, rangeEnd);
  const realEnd = Math.max(rangeStart, rangeEnd);

  this.includes = (value) => {
    console.log(realStart, value, realEnd);

    return realStart <= value && value <= realEnd;
  };
}

const interpreter = new Interpreter();

export {
  interpreter
};