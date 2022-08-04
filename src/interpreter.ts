import { Tree, SyntaxNodeRef } from '@lezer/common';
import { normalizeContext } from 'lezer-feel';

import { builtins } from './builtins';

import {
  parseParameterNames
} from './utils';

import {
  parseExpressions,
  parseUnaryTests
} from './parser';


export type InterpreterContext = Record<string, any>;

class Interpreter {

  _buildExecutionTree(tree: Tree, input: string) {

    type StackEntry = { args: any[], nodeInput: string };

    const root = { args: [], nodeInput: input };

    const stack: StackEntry[] = [ root ];

    tree.iterate({
      enter(nodeRef) {

        const {
          isError,
          isSkipped
        } = nodeRef.type;

        const {
          from,
          to
        } = nodeRef;

        if (isError) {
          throw new Error(`Statement unparseable at [${from}, ${to}]`);
        }

        if (isSkipped) {
          return false;
        }

        const nodeInput = input.slice(from, to);

        stack.push({
          nodeInput,
          args: []
        });
      },

      leave(nodeRef) {

        if (nodeRef.type.isSkipped) {
          return;
        }

        const {
          nodeInput,
          args
        } = stack.pop();

        const parent = stack[stack.length - 1];

        const expr = evalNode(nodeRef, nodeInput, args);

        parent.args.push(expr);
      }
    });

    return root.args[root.args.length - 1];
  }

  evaluate(expression: string, context: InterpreterContext = {}) {

    const parseTree = parseExpressions(expression, context);

    const root = this._buildExecutionTree(parseTree, expression);

    return {
      parseTree,
      root
    };
  }

  unaryTest(expression: string, context: InterpreterContext = {}) {

    const parseTree = parseUnaryTests(expression, context);

    const root = this._buildExecutionTree(parseTree, expression);

    return {
      parseTree,
      root
    };
  }

}

const interpreter = new Interpreter();

export function unaryTest(expression: string, context: InterpreterContext = {}) {
  const value = context['?'] || null;

  const {
    root
  } = interpreter.unaryTest(expression, context);

  // root = fn(ctx) => test(val)
  const test = root(normalizeContext(context));

  return test(value);
}

export function evaluate(expression: string, context: InterpreterContext = {}) {

  const {
    root
  } = interpreter.evaluate(expression, context);

  // root = [ fn(ctx) ]

  const results = root(normalizeContext(context));

  if (results.length === 1) {
    return results[0];
  } else {
    return results;
  }
}


function evalNode(node: SyntaxNodeRef, input: string, args: any[]) {

  switch (node.name) {
  case 'ArithOp': return (context) => {

    const nullable = (op) => (a, b) => {

      let left = a(context);
      let right = b(context);

      if (Array.isArray(left) && left.length < 2) {
        left = left[0];
      }

      if (Array.isArray(right) && right.length < 2) {
        right = right[0];
      }

      if (
        typeof left !== 'number' ||
        typeof right !== 'number'
      ) {
        return null;
      }

      return op(left, right);
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

  case 'CompareOp': return tag(() => {

    switch (input) {
    case '>': return (b) => createRange(b, null, false, false);
    case '>=': return (b) => createRange(b, null, true, false);
    case '<': return (b) => createRange(null, b, false, false);
    case '<=': return (b) => createRange(null, b, false, true);
    case '=': return (b) => (a) => compareEquality(a, b);
    case '!=': return (b) => (a) => !compareEquality(a, b);
    }

  }, Test('boolean'));

  case 'Wildcard': return (_context) => true;

  case 'null': return (_context) => {
    return null;
  };

  case 'Disjunction': return tag((context) => {

    const left = args[0](context);
    const right = args[2](context);

    const matrix = [
      [ true, true, true ],
      [ true, false, true ],
      [ true, null, true ],
      [ false, true, true ],
      [ false, false, false ],
      [ false, null, null ],
      [ null, true, true ],
      [ null, false, null ],
      [ null, null, null ],
    ];

    const a = typeof left === 'boolean' ? left : null;
    const b = typeof right === 'boolean' ? right : null;

    return matrix.find(el => el[0] === a && el[1] === b)[2];
  }, Test('boolean'));

  case 'Conjunction': return tag((context) => {
    const left = args[0](context);
    const right = args[2](context);

    const matrix = [
      [ true, true, true ],
      [ true, false, false ],
      [ true, null, null ],
      [ false, true, false ],
      [ false, false, false ],
      [ false, null, false ],
      [ null, true, null ],
      [ null, false, false ],
      [ null, null, null ],
    ];

    const a = typeof left === 'boolean' ? left : null;
    const b = typeof right === 'boolean' ? right : null;

    return matrix.find(el => el[0] === a && el[1] === b)[2];
  }, Test('boolean'));

  case 'Context': return (context) => {

    return args.slice(1, -1).reduce((obj, arg) => {
      const [ key, value ] = arg({
        ...context,
        ...obj
      });

      return {
        ...obj,
        [key]: value
      };
    }, {});
  };

  case 'FunctionBody': return args[0];

  case 'FormalParameters': return args;

  case 'FormalParameter': return args[0];

  case 'ParameterName': return args.join(' ');

  case 'FunctionDefinition': return (context) => {
    const parameterNames = args[2];

    const fnBody = args[4];

    return wrapFunction((...args) => {

      const fnContext = parameterNames.reduce((context, name, idx) => {

        // support positional parameters
        context[name] = args[idx];

        return context;
      }, { ...context });

      return fnBody(fnContext);
    }, parameterNames);
  };

  case 'ContextEntry': return (context) => {

    const key = typeof args[0] === 'function' ? args[0](context) : args[0];

    const value = args[1](context);

    return [ key, value ];
  };

  case 'Key': return args[0];

  case 'Identifier': return input;

  case 'SpecialFunctionName': return (context) => getBuiltin(input, context);

  case 'Name': return args.join(' ');

  case 'VariableName': return (context) => {
    const name = args.join(' ');

    return getBuiltin(name, context) || getFromContext(name, context);
  };

  case 'QualifiedName': return (context) => {
    return args.reduce((context, arg) => arg(context), context);
  };

  case '?': return (context) => getFromContext('?', context);

  // expression
  // expression ".." expression
  case 'IterationContext': return (context) => {

    const a = args[0](context);

    const b = args[1] && args[1](context);

    return b ? createRange(a, b) : a;
  };

  case 'Type': return args[0];

  case 'InExpressions': return (context) => {

    const iterationContexts = args.map(ctx => ctx(context));

    return cartesianProduct(iterationContexts).map(ctx => {
      if (!Array.isArray(ctx)) {
        ctx = [ ctx ];
      }

      return Object.assign({}, context, ...ctx);
    });
  };

  // Name kw<"in"> Expr
  case 'InExpression': return (context) => {
    return extractValue(context, args[0], args[2]);
  };

  case 'InstanceOfExpression': return tag((context) => {

    const a = args[0](context);
    const b = args[3](context);

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

  case 'NumericLiteral': return tag((_context) => input.includes('.') ? parseFloat(input) : parseInt(input), 'number');

  case 'BooleanLiteral': return tag((_context) => input === 'true' ? true : false, 'boolean');

  case 'StringLiteral': return tag((_context) => input.slice(1, -1), 'string');

  case 'PositionalParameters': return (context) => args.map(arg => arg(context));

  case 'NamedParameter': return (context) => {

    const name = args[0];
    const value = args[1](context);

    return [ name, value ];
  };

  case 'NamedParameters': return (context) => args.reduce((args, arg) => {
    const [ name, value ] = arg(context);

    args[name] = value;

    return args;
  }, {});

  case 'DateTimeConstructor': return (context) => {
    return getBuiltin(input, context);
  };

  case 'DateTimeLiteral': return (context) => {

    // AtLiteral
    if (args.length === 1) {
      return args[0](context);
    }

    // FunctionInvocation
    else {
      const wrappedFn = wrapFunction(args[0](context));

      if (!wrappedFn) {
        throw new Error(`Failed to evaluate ${input}: Target is not a function`);
      }

      const contextOrArgs = args[2](context);

      return wrappedFn.invoke(contextOrArgs);
    }

  };

  case 'AtLiteral': return (context) => {

    const wrappedFn = wrapFunction(getBuiltin('@', context));

    if (!wrappedFn) {
      throw new Error(`Failed to evaluate ${input}: Target is not a function`);
    }

    return wrappedFn.invoke([ args[0](context) ]);
  };

  case 'FunctionInvocation': return (context) => {

    const wrappedFn = wrapFunction(args[0](context));

    if (!wrappedFn) {
      throw new Error(`Failed to evaluate ${input}: Target is not a function`);
    }

    const contextOrArgs = args[2](context);

    return wrappedFn.invoke(contextOrArgs);
  };

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

  case 'Parameters': return args.length === 3 ? args[1] : (_context) => [];

  case 'Comparison': return (context) => {

    const operator = args[1];

    // expression !compare kw<"in"> PositiveUnaryTest |
    // expression !compare kw<"in"> !unaryTest "(" PositiveUnaryTests ")"
    if (operator === 'in') {
      return compareIn(args[0](context), (args[3] || args[2])(context));
    }

    // expression !compare kw<"between"> expression kw<"and"> expression
    if (operator === 'between') {

      const start = args[2](context);
      const end = args[4](context);

      if (start === null || end === null) {
        return null;
      }

      return createRange(start, end).includes(args[0](context));
    }

    // expression !compare CompareOp<"=" | "!="> expression |
    // expression !compare CompareOp<Gt | Gte | Lt | Lte> expression |
    const left = args[0](context);
    const right = args[2](context);

    const test = operator()(right);

    return compareValue(test, left);
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

  case 'ArithmeticExpression': return (function() {

    // binary expression (a + b)
    if (args.length === 3) {
      const [ a, op, b ] = args;

      return tag((context) => {
        return op(context)(a, b);
      }, coalecenseTypes(a, b));
    }

    // unary expression (-b)
    if (args.length === 2) {
      const [ op, value ] = args;

      return tag((context) => {

        return op(context)(() => 0, value);
      }, value.type);
    }
  })();

  case 'PositiveUnaryTest': return args[0];

  case 'ParenthesizedExpression': return args[1];

  case 'PathExpression': return (context) => {

    const pathTarget = args[0](context);
    const pathProp = args[1];

    if (Array.isArray(pathTarget)) {
      return pathTarget.map(pathProp);
    } else {
      return pathProp(pathTarget);
    }
  };

  // expression !filter "[" expression "]"
  case 'FilterExpression': return (context) => {

    const target = args[0](context);

    const filterFn = args[2];

    const filterTarget = Array.isArray(target) ? target : [ target ];

    // null[..]
    if (target === null) {
      return null;
    }

    // a[1]
    if (filterFn.type === 'number') {
      const idx = filterFn(context);

      const value = filterTarget[idx < 0 ? filterTarget.length + idx : idx - 1];

      if (typeof value === 'undefined') {
        return null;
      } else {
        return value;
      }
    }

    // a[true]
    if (filterFn.type === 'boolean') {
      if (filterFn(context)) {
        return filterTarget;
      } else {
        return [];
      }
    }

    if (filterFn.type === 'string') {

      const value = filterFn(context);

      return filterTarget.filter(el => el === value);
    }

    // a[test]
    return filterTarget.map(el => {

      const iterationContext = {
        ...context,
        item: el,
        ...el
      };

      let result = filterFn(iterationContext);

      // test is fn(val) => boolean SimpleUnaryTest
      if (typeof result === 'function') {
        result = result(el);
      }

      if (result instanceof Range) {
        result = result.includes(el);
      }

      if (result === true) {
        return el;
      }

      return result;
    }).filter(isTruthy);
  };

  case 'SimplePositiveUnaryTest': return tag((context) => {

    // <Interval>
    if (args.length === 1) {
      return args[0](context);
    }

    // <CompareOp> <Expr>
    return args[0](context)(args[1](context));
  }, 'test');

  case 'List': return (context) => {
    return args.slice(1, -1).map(arg => arg(context));
  };

  case 'Interval': return tag((context) => {

    const left = args[1](context);
    const right = args[2](context);

    const startIncluded = left !== null && args[0] === '[';
    const endIncluded = right !== null && args[3] === ']';

    return createRange(left, right, startIncluded, endIncluded);
  }, Test('boolean'));

  case 'PositiveUnaryTests':
  case 'Expressions': return (context) => {
    return args.map(a => a(context));
  };

  case 'UnaryTests': return (context) => {

    return (value = null) => {

      const negate = args[0] === 'not';

      const tests = negate ? args.slice(2, -1) : args;

      const matches = tests.map(test => test(context)).flat(1).map(test => {

        if (Array.isArray(test)) {
          return test.includes(value);
        }

        if (test === null) {
          return null;
        }

        if (typeof test === 'boolean') {
          return test;
        }

        return compareValue(test, value);
      }).reduce(combineResult, undefined);

      return matches === null ? null : (negate ? !matches : matches);
    };
  };

  default: return node.name;
  }
}

function getBuiltin(name, _context) {
  return builtins[name];
}

function getFromContext(name, context) {
  if (name in context) {
    return context[name];
  }

  return null;
}

function extractValue(context, prop, _target) {

  const target = _target(context);

  if (target && 'map' in target) {
    return target.map(t => (
      { [prop]: t }
    ));
  }

  throw new Error(`Cannot extract ${ prop } from ${ target }`);
}

function compareIn(value, tests) {

  if (!Array.isArray(tests)) {
    tests = [ tests ];
  }

  return tests.some(
    test => compareValue(test, value)
  );
}

function compareValue(test, value) {

  if (typeof test === 'function') {
    return test(value);
  }

  if (test instanceof Range) {
    return test.includes(value);
  }

  return compareEquality(test, value);
}


const chars = Array.from(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
);

function isTyped(type, values) {
  return (
    values.some(e => typeof e === type) &&
    values.every(e => typeof e === type || e === null)
  );
}

function createRange(start, end, startIncluded = true, endIncluded = true) {

  if (isTyped('string', [ start, end ])) {
    return createStringRange(start, end, startIncluded, endIncluded);
  }

  if (isTyped('number', [ start, end ])) {
    return createNumberRange(start, end, startIncluded, endIncluded);
  }

  throw new Error(`unsupported range: ${start}..${end}`);
}

type RangeProps = {
  'start included': boolean,
  'end included': boolean,
  start: string|number|null,
  end: string|number|null,
  map<T>(fn: (val: any) => T): T[],
  includes(val: any): boolean
};


class Range {

  props: RangeProps;

  constructor(props: RangeProps) {
    this.props = props;
  }

  map<T>(fn: (any) => T) : T[] {
    return this.props.map(fn);
  }

  includes(val: any) : boolean {

    if (val === null) {
      return null;
    }

    return this.props.includes(val);
  }

  get start() {
    return this.props.start;
  }

  get 'start included'() {
    return this.props['start included'];
  }

  get end() {
    return this.props.end;
  }

  get 'end included'() {
    return this.props['end included'];
  }

}

function noopMap() {
  return () => {
    throw new Error('unsupported range operation: map');
  };
}

function valuesMap(values) {
  return (fn) => values.map(fn);
}

function valuesIncludes(values) {
  return (value) => values.includes(value);
}

function numberMap(start, end, startIncluded, endIncluded) {

  const direction = start > end ? -1 : 1;

  return (fn) => {

    const result = [];

    for (let i = start;; i += direction) {

      if (i === 0 && !startIncluded) {
        continue;
      }

      if (i === end && !endIncluded) {
        break;
      }

      result.push(fn(i));

      if (i === end) {
        break;
      }
    }

    return result;
  };
}

function includesStart(n, inclusive) {

  if (inclusive) {
    return (value) => n <= value;
  } else {
    return (value) => n < value;
  }
}

function includesEnd(n, inclusive) {

  if (inclusive) {
    return (value) => n >= value;
  } else {
    return (value) => n > value;
  }
}

function anyIncludes(start, end, startIncluded, endIncluded) {

  let tests = [];

  if (start !== null && end !== null) {
    if (start > end) {
      tests = [
        includesStart(end, endIncluded),
        includesEnd(start, startIncluded)
      ];
    } else {
      tests = [
        includesStart(start, startIncluded),
        includesEnd(end, endIncluded)
      ];
    }
  } else

  if (end !== null) {
    tests = [
      includesEnd(end, endIncluded)
    ];
  } else

  if (start !== null) {
    tests = [
      includesStart(start, startIncluded)
    ];
  }

  return (value) => tests.every(t => t(value));
}

function createStringRange(start, end, startIncluded = true, endIncluded = true) {

  if (start !== null && !chars.includes(start)) {
    throw new Error('illegal range start: ' + start);
  }

  if (end !== null && !chars.includes(end)) {
    throw new Error('illegal range end: ' + end);
  }

  let values;

  if (start !== null && end !== null) {

    let startIdx = chars.indexOf(start);
    let endIdx = chars.indexOf(end);

    const direction = startIdx > endIdx ? -1 : 1;

    if (startIncluded === false) {
      startIdx += direction;
    }

    if (endIncluded === false) {
      endIdx -= direction;
    }

    values = chars.slice(startIdx, endIdx + 1);
  }

  const map = values ? valuesMap(values) : noopMap();
  const includes = values ? valuesIncludes(values) : anyIncludes(start, end, startIncluded, endIncluded);

  return new Range({
    start,
    end,
    'start included': startIncluded,
    'end included': endIncluded,
    map,
    includes
  });
}

function createNumberRange(start, end, startIncluded, endIncluded) {
  const map = start !== null && end !== null ? numberMap(start, end, startIncluded, endIncluded) : noopMap();
  const includes = anyIncludes(start, end, startIncluded, endIncluded);

  return new Range({
    start,
    end,
    'start included': startIncluded,
    'end included': endIncluded,
    map,
    includes
  });
}

function cartesianProduct(arrays: any[]) {

  const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
  const cartesian = (a?, b?, ...c) => (b ? cartesian(f(a, b), ...c) : a);

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

type ContextFn<T> = (context: InterpreterContext) => T;
type TaggedFn = {
  type: string
};

function tag<Z, T extends ContextFn<Z>>(fn: T, type: string) : T & TaggedFn {

  return Object.assign(fn, {
    type,
    toString() {
      return `TaggedFunction[${type}] ${Function.prototype.toString.call(fn)}`;
    }
  });
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

function Test(type: string): string {
  return `Test<${type}>`;
}

/**
 * @param {Function} fn
 * @param {string[]} [parameterNames]
 *
 * @return {WrappedFn}
 */
function wrapFunction(fn, parameterNames = null) {

  if (!fn) {
    return null;
  }

  if (fn instanceof WrappedFn) {
    return fn;
  }

  if (fn instanceof Range) {
    return new WrappedFn((value) => fn.includes(value), [ 'value' ]);
  }

  return new WrappedFn(fn, parameterNames || parseParameterNames(fn));
}

function WrappedFn(fn, parameterNames) {

  this.invoke = function(contextOrArgs) {

    let params;

    if (Array.isArray(contextOrArgs)) {
      params = contextOrArgs;
    } else {
      params = parameterNames.map(n => contextOrArgs[n]);
    }

    return fn.call(null, ...params);
  };
}

function isContext(e) {
  return Object.getPrototypeOf(e) === Object.prototype;
}

function isArray(e) {
  return Array.isArray(e);
}

function getType(e) {

  if (e === null || e === undefined) {
    return 'nil';
  }

  if (typeof e === 'boolean') {
    return 'boolean';
  }

  if (typeof e === 'number') {
    return 'number';
  }

  if (typeof e === 'string') {
    return 'string';
  }

  if (isContext(e)) {
    return 'context';
  }

  if (isArray(e)) {
    return 'list';
  }

  if (e instanceof Range) {
    return 'range';
  }

  return 'literal';
}

function compareEquality(a, b) {

  if (
    a === null && b !== null ||
    a !== null && b === null
  ) {
    return false;
  }

  if (isArray(a) && a.length < 2) {
    a = a[0];
  }

  if (isArray(b) && b.length < 2) {
    b = b[0];
  }

  const aType = getType(a);
  const bType = getType(b);

  if (aType !== bType) {
    return null;
  }

  if (aType === 'nil') {
    return true;
  }

  if (aType === 'list') {
    if (a.length !== b.length) {
      return false;
    }

    return a.every(
      (element, idx) => compareEquality(element, b[idx])
    );
  }

  if (aType === 'context') {

    const aEntries = Object.entries(a);
    const bEntries = Object.entries(b);

    if (aEntries.length !== bEntries.length) {
      return false;
    }

    return aEntries.every(
      ([ key, value ]) => key in b && compareEquality(value, b[key])
    );
  }

  if (aType === 'range') {
    return [
      [ a.start, b.start ],
      [ a.end, b.end ],
      [ a['start included'], b['start included'] ],
      [ a['end included'], b['end included'] ]
    ].every(([ a, b ]) => a === b);
  }

  if (a == b) {
    return true;
  }

  return aType === bType ? false : null;
}