import { Tree, SyntaxNodeRef, SyntaxNode } from '@lezer/common';

import { builtins } from './builtins.js';

import { has } from 'min-dash';

import {
  Range,
  FunctionWrapper,
  FUNCTION_PARAMETER_MISSMATCH,
  equals,
  isArray,
  getType,
  isDuration,
  isDateTime,
  isType,
  isNumber,
  isContext
} from './types.js';

import {
  notImplemented,
  parseParameterNames,
  getFromContext
} from './utils.js';

import {
  parseExpression,
  parseUnaryTests
} from './parser.js';

import { Duration } from 'luxon';


export type WarningType =
  | 'NO_VARIABLE_FOUND'
  | 'NO_CONTEXT_ENTRY_FOUND'
  | 'NO_PROPERTY_FOUND'
  | 'NOT_COMPARABLE'
  | 'INVALID_TYPE'
  | 'NO_FUNCTION_FOUND'
  | 'FUNCTION_INVOCATION_FAILURE';

export type SourceLocation = {
  from: number,
  to: number
};

export type Warning = {
  type: WarningType;
  message: string;
  position: SourceLocation;
  details: {
    template: string,
    values: Record<string, unknown>
  }
};

export type EvaluationResult<T> = {
  value: T;
  warnings: Warning[];
};

/**
 * Context passed to the interpreter as global variables.
 */
export type EvalContext = Record<string, unknown>;

export class SyntaxError extends Error {

  input: string;

  position: SourceLocation;

  constructor(
      message: string,
      details: {
        input: string,
        position: SourceLocation
      }
  ) {
    super(message);

    Object.assign(this, details);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDetails(template: string, values: Record<string, any>) {

  return Object.keys(values).reduce((message, key) => {
    return message.replace(`{${key}}`, `'${ formatValue(values[key]) }'`);
  }, template);
}

class InterpreterContext {
  warnings: Warning[] = [];

  addWarning(node: Node, type: WarningType, details: { template: string, values: Record<string, unknown> }): void {

    this.warnings.push({
      type,
      message: formatDetails(details.template, details.values),
      details,
      position: node.position
    });
  }

  getWarnings(): Warning[] {
    return this.warnings;
  }

}

type Node = {
  name: string,
  input: string,
  position: SourceLocation
};

type StackEntry = {
  args: unknown[],
  node: Node
};

class Interpreter {

  _buildExecutionTree(tree: Tree, input: string, interpreterContext: InterpreterContext) {

    const root = {
      args: [],
      node: {
        name: '__ROOT',
        input,
        position: {
          from: 0,
          to: input.length
        }
      }
    };

    const stack: StackEntry[] = [ root ];

    tree.iterate({
      enter(nodeRef) {

        const {
          isError,
          isSkipped
        } = nodeRef.type;

        if (isError) {
          throw lintError(input, nodeRef);
        }

        if (isSkipped) {
          return false;
        }

        const {
          from,
          to,
          name
        } = nodeRef;

        stack.push({
          args: [],
          node: {
            name,
            input: input.slice(from, to),
            position: {
              from,
              to
            }
          }
        });
      },

      leave(nodeRef) {

        if (nodeRef.type.isSkipped) {
          return;
        }

        const {
          node,
          args
        } = stack.pop();

        const parent = stack[stack.length - 1];

        const expr = evalNode(node, args, interpreterContext);

        parent.args.push(expr);
      }
    });

    return {
      root: root.args[root.args.length - 1]
    };
  }

  evaluate(
      expression: string,
      evalContext: EvalContext,
      dialect: string | undefined,
      interpreterContext: InterpreterContext
  ) {

    const parseTree = parseExpression(expression, evalContext, dialect);

    const { root } = this._buildExecutionTree(parseTree, expression, interpreterContext);

    return {
      parseTree,
      root
    };
  }

  unaryTest(
      expression: string,
      evalContext: EvalContext,
      dialect: string | undefined,
      interpreterContext: InterpreterContext
  ) {

    const parseTree = parseUnaryTests(expression, evalContext, dialect);

    const { root } = this._buildExecutionTree(parseTree, expression, interpreterContext);

    return {
      parseTree,
      root
    };
  }

}

const interpreter = new Interpreter();

export function unaryTest(
    expression: string,
    evalContext: EvalContext = {},
    dialect?: string
) : EvaluationResult<boolean | null> {

  const interpreterContext = new InterpreterContext();

  const value = evalContext['?'] !== undefined ? evalContext['?'] : null;

  const {
    root
  } = interpreter.unaryTest(expression, evalContext, dialect, interpreterContext);

  // root = fn(ctx) => test(val)
  const test = root(evalContext);

  const testResult = test(value);

  return {
    value: testResult,
    warnings: interpreterContext.getWarnings()
  };
}

export function evaluate(
    expression: string,
    evalContext: EvalContext = {},
    dialect?: string
): EvaluationResult<unknown> {

  const interpreterContext = new InterpreterContext();

  const {
    root
  } = interpreter.evaluate(expression, evalContext, dialect, interpreterContext);

  // root = Expression :: fn(ctx)

  const result = root(evalContext);

  return {
    value: result,
    warnings: interpreterContext.getWarnings()
  };
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalNode(node: Node, args: any[], interpreterContext: InterpreterContext) {

  switch (node.name) {
  case 'ArithOp': return (context) => {

    const nullable = (op, opName, types = [ 'number' ]) => (a, b) => {

      const left = a(context);
      const right = b(context);

      if (isArray(left) || isArray(right)) {
        interpreterContext.addWarning(node, 'INVALID_TYPE', {
          template: `Can't ${opName} {right} to {left}`,
          values: {
            left,
            right
          }
        });

        return null;
      }

      const leftType = getType(left);
      const rightType = getType(right);

      const temporal = [ 'date', 'time', 'date time', 'duration' ];

      if (temporal.includes(leftType)) {
        if (!temporal.includes(rightType)) {
          interpreterContext.addWarning(node, 'INVALID_TYPE', {
            template: `Can't ${opName} {right} to {left}`,
            values: {
              left,
              right
            }
          });

          return null;
        }
      } else if (leftType !== rightType || !types.includes(leftType)) {
        interpreterContext.addWarning(node, 'INVALID_TYPE', {
          template: `Can't ${opName} {right} to {left}`,
          values: {
            left,
            right
          }
        });

        return null;
      }

      return op(left, right);
    };

    switch (node.input) {
    case '+': return nullable((a, b) => {

      // flip these as luxon operations with durations aren't commutative
      if (isDuration(a) && !isDuration(b)) {
        const tmp = a;
        a = b;
        b = tmp;
      }

      if (isType(a, 'time') && isDuration(b)) {
        return a.plus(b).set({
          year: 1900,
          month: 1,
          day: 1
        });
      } else if (isDateTime(a) && isDateTime(b)) {
        return null;
      } else if (isDateTime(a) && isDuration(b)) {
        return a.plus(b);
      } else if (isDuration(a) && isDuration(b)) {
        return a.plus(b);
      }

      return a + b;
    }, 'add', [ 'string', 'number', 'date', 'time', 'duration', 'date time' ]);
    case '-': return nullable((a, b) => {
      if (isType(a, 'time') && isDuration(b)) {
        return a.minus(b).set({
          year: 1900,
          month: 1,
          day: 1
        });
      } else if (isDateTime(a) && isDateTime(b)) {
        return a.diff(b);
      } else if (isDateTime(a) && isDuration(b)) {
        return a.minus(b);
      } else if (isDuration(a) && isDuration(b)) {
        return a.minus(b);
      }

      return a - b;
    }, 'subtract', [ 'number', 'date', 'time', 'duration', 'date time' ]);
    case '*': return nullable((a, b) => a * b, 'multiply', [ 'number' ]);
    case '/': return nullable((a, b) => !b ? null : a / b, 'divide', [ 'number' ]);
    case '**':
    case '^': return nullable((a, b) => a ** b, 'exponentiate', [ 'number' ]);
    }
  };

  case 'CompareOp': return tag(() => {

    switch (node.input) {
    case '>': return (b) => createRange(b, null, false, false);
    case '>=': return (b) => createRange(b, null, true, false);
    case '<': return (b) => createRange(null, b, false, false);
    case '<=': return (b) => createRange(null, b, false, true);
    case '=': return (b) => (a) => equals(a, b);
    case '!=': return (b) => (a) => !equals(a, b);
    }

  }, Test('boolean'));

  case 'BacktickIdentifier': return node.input.replace(/`/g, '');

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

  case 'Identifier': return node.input;

  case 'SpecialFunctionName': return (context) => getBuiltin(node.input, context);

  // preserve spaces in name, but compact multiple
  // spaces into one (token)
  case 'Name': return node.input.replace(/\s{2,}/g, ' ');

  case 'VariableName': return (context, local = false) => {
    const name = args.join(' ');

    const contextValue = getFromContext(name, context);

    if (typeof contextValue !== 'undefined') {
      return contextValue;
    }

    const builtin = getBuiltin(name, context);

    if (builtin) {
      return builtin;
    }

    if (local) {

      if (isContext(context)) {
        interpreterContext.addWarning(node, 'NO_CONTEXT_ENTRY_FOUND', {
          template: `Key '${name}' not found in {target}`,
          values: {
            target: context
          }
        });
      } else {
        interpreterContext.addWarning(node, 'NO_PROPERTY_FOUND', {
          template: `Property '${name}' not found in {target}`,
          values: {
            target: context
          }
        });
      }
    } else {
      interpreterContext.addWarning(node, 'NO_VARIABLE_FOUND', {
        template: `Variable '${name}' not found`,
        values: {}
      });
    }

    return null;
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

  // (x in [ [1,2], [3,4] ]), (y in x)
  case 'InExpressions': return (context) => {

    // we build up evaluation contexts from left to right,
    // ending up with the cartesian product over all available contexts
    //
    // previous context is provided to later context providers
    // producing <null> as a context during evaluation causes the
    // whole result to turn <null>

    type Context = EvalContext;
    type MaybeContext = (Context | null);
    type ContextsProducer = (context: Context) => (MaybeContext[] | null);

    const isValidContexts = (
        contexts: MaybeContext[] | null
    ) => {
      if (contexts === null || contexts.some(arr => getType(arr) === 'nil')) {
        return false;
      }

      return true;
    };

    const join = (
        aContexts: EvalContext[],
        bContextProducer: ContextsProducer
    ) => {

      return [].concat(...aContexts.map(aContext => {

        const bContexts = bContextProducer({ ...context, ...aContext });

        if (!isValidContexts(bContexts)) {
          return null;
        }

        return bContexts.map(bContext => {
          return { ...aContext, ...bContext };
        });
      }));
    };

    const cartesian = (
        aContexts: MaybeContext[],
        bContextProducer?: ContextsProducer,
        ...otherContextProducers: ContextsProducer[]
    ) : (MaybeContext[] | null) => {

      if (!isValidContexts(aContexts)) {
        return null;
      }

      if (!bContextProducer) {
        return aContexts;
      }

      return cartesian(join(aContexts, bContextProducer), ...otherContextProducers);
    };

    const cartesianProduct = (contextProducers: ContextsProducer[]) => {

      const [ aContextProducer, ...otherContextProducers ] = contextProducers;

      const aContexts = aContextProducer(context);

      return cartesian(aContexts, ...otherContextProducers);
    };

    const product = cartesianProduct(args);

    return product && product.map(p => {
      return { ...context, ...p };
    });
  };

  // Name kw<"in"> Expr
  case 'InExpression': return (context) => {
    return extractValue(context, args[0], args[2]);
  };

  case 'SpecialType': throw notImplemented('SpecialType');

  case 'InstanceOfExpression': return tag((context) => {

    const a = args[0](context);
    const b = args[3](context);

    return a instanceof b;
  }, Test('boolean'));

  case 'every': return tag((context) => {
    return (_contexts, _condition) => {
      const contexts = _contexts(context);

      if (getType(contexts) !== 'list') {
        return contexts;
      }

      return contexts.every(ctx => isTruthy(_condition(ctx)));
    };

  }, Test('boolean'));

  case 'some': return tag((context) => {
    return (_contexts, _condition) => {
      const contexts = _contexts(context);

      if (getType(contexts) !== 'list') {
        return contexts;
      }

      return contexts.some(ctx => isTruthy(_condition(ctx)));
    };
  }, Test('boolean'));

  case 'NumericLiteral': return tag((_context) => node.input.includes('.') ? parseFloat(node.input) : parseInt(node.input), 'number');

  case 'BooleanLiteral': return tag((_context) => node.input === 'true' ? true : false, 'boolean');

  case 'StringLiteral': return tag((_context) => parseString(node.input), 'string');

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
    return getBuiltin(node.input, context);
  };

  case 'DateTimeLiteral': return (context) => {

    // AtLiteral
    if (args.length === 1) {
      return args[0](context);
    }

    // FunctionInvocation
    else {
      const target = args[0](context);
      const wrappedFn = wrapFunction(target);

      if (!wrappedFn) {
        interpreterContext.addWarning(node, 'NO_FUNCTION_FOUND', {
          template: 'Cannot invoke {target}',
          values: {
            target
          }
        });

        return null;
      }

      const contextOrArgs = args[2](context);

      const result = wrappedFn.invoke(contextOrArgs);

      if (result === FUNCTION_PARAMETER_MISSMATCH) {
        interpreterContext.addWarning(node, 'FUNCTION_INVOCATION_FAILURE', {
          template: 'Cannot invoke {target} with parameters {params}',
          values: {
            target: wrappedFn,
            params: contextOrArgs
          }
        });

        return null;
      }

      return result;
    }

  };

  case 'AtLiteral': return (context) => {

    const wrappedFn = wrapFunction(getBuiltin('@', context));

    if (!wrappedFn) {
      interpreterContext.addWarning(node, 'NO_FUNCTION_FOUND', {
        template: "Cannot invoke '@'",
        values: {}
      });

      return null;
    }

    return wrappedFn.invoke([ args[0](context) ]);
  };

  case 'FunctionInvocation': return (context) => {

    const target = args[0](context);

    const wrappedFn = wrapFunction(target);

    if (!wrappedFn) {
      interpreterContext.addWarning(node, 'NO_FUNCTION_FOUND', {
        template: 'Cannot invoke {target}',
        values: {
          target
        }
      });

      return null;
    }

    const contextOrArgs = args[2](context);

    const result = wrappedFn.invoke(contextOrArgs);

    if (result === FUNCTION_PARAMETER_MISSMATCH) {
      interpreterContext.addWarning(node, 'FUNCTION_INVOCATION_FAILURE', {
        template: 'Cannot invoke {target} with parameters {params}',
        values: {
          target: wrappedFn,
          params: contextOrArgs
        }
      });

      return null;
    }

    return result;
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

    if (getType(iterationContexts) !== 'list') {
      return iterationContexts;
    }

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

  case 'PositiveUnaryTest': return (context) => {

    // ensure that we strictly compare boolean values
    // with the implicit context value, if we match a unary test
    if (args[0].type === 'boolean' && has(context, '?')) {
      return args[0](context) === context['?'];
    }

    return args[0](context);
  };

  case 'ParenthesizedExpression': return args[1];

  case 'PathExpression': return (context) => {

    const pathTarget = args[0](context);
    const pathProp = args[1];

    if (isArray(pathTarget)) {
      return pathTarget.map(value => pathProp(value, true));
    } else {
      return pathProp(pathTarget, true);
    }
  };

  // expression !filter "[" expression "]"
  case 'FilterExpression': return (context) => {

    const target = args[0](context);

    const filterFn = args[2];

    const filterTarget = isArray(target) ? target : [ target ];

    // null[..]
    if (target === null) {
      return null;
    }

    // a[variable=number]
    if (typeof filterFn.type === 'undefined') {
      try {
        const value = filterFn(context);

        if (isNumber(value)) {
          filterFn.type = 'number';
        }
      } catch (_err) {

        // ignore
      }
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

  case 'Expression': return (context) => {
    return args[0](context);
  };

  case 'UnaryTests': return (context) => {

    return (value = null) => {

      const negate = args[0] === 'not';

      const tests = negate ? args.slice(2, -1) : args;

      const matches = tests.map(test => test(context)).flat(1).map(test => {

        if (isArray(test)) {
          return test.includes(value);
        }

        if (typeof test === 'boolean') {
          return test;
        }

        return compareValue(test, value);
      }).some(v => v === true);

      return matches === null ? null : (negate ? !matches : matches);
    };
  };

  default: return node.name;
  }
}

function getBuiltin(name, _context) {
  return getFromContext(name, builtins);
}

function extractValue(context, prop, _target) {

  const target = _target(context);

  if ([ 'list', 'range' ].includes(getType(target))) {
    return target.map(t => (
      { [prop]: t }
    ));
  }

  return null;
}

function compareIn(value, tests) {

  if (!isArray(tests)) {

    if (getType(tests) === 'nil') {
      return null;
    }

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

  return equals(test, value);
}


const chars = Array.from(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
);

function isTyped(type, values) {
  return (
    values.some(e => getType(e) === type) &&
    values.every(e => e === null || getType(e) === type)
  );
}

const nullRange = new Range({
  start: null,
  end: null,
  'start included': false,
  'end included': false,
  map() {
    return [];
  },
  includes() {
    return null;
  }
});

function createRange(start, end, startIncluded = true, endIncluded = true) : Range {

  if (isTyped('string', [ start, end ])) {
    return createStringRange(start, end, startIncluded, endIncluded);
  }

  if (isTyped('number', [ start, end ])) {
    return createNumberRange(start, end, startIncluded, endIncluded);
  }

  if (isTyped('duration', [ start, end ])) {
    return createDurationRange(start, end, startIncluded, endIncluded);
  }

  if (isTyped('time', [ start, end ])) {
    return createDateTimeRange(start, end, startIncluded, endIncluded);
  }

  if (isTyped('date time', [ start, end ])) {
    return createDateTimeRange(start, end, startIncluded, endIncluded);
  }

  if (isTyped('date', [ start, end ])) {
    return createDateTimeRange(start, end, startIncluded, endIncluded);
  }

  if (start === null && end === null) {
    return nullRange;
  }

  throw new Error(`unsupported range: ${start}..${end}`);
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

function anyIncludes(start, end, startIncluded, endIncluded, conversion = (v) => v) {

  let tests = [];

  if (start === null && end === null) {
    return () => null;
  }

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
  } else if (end !== null) {
    tests = [
      includesEnd(end, endIncluded)
    ];
  } else if (start !== null) {
    tests = [
      includesStart(start, startIncluded)
    ];
  }

  return (value) => value === null ? null : tests.every(t => t(conversion(value)));
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

/**
 * @param {Duration} start
 * @param {Duration} end
 * @param {boolean} startIncluded
 * @param {boolean} endIncluded
 */
function createDurationRange(start, end, startIncluded, endIncluded) {

  const toMillis = (d) => d ? Duration.fromDurationLike(d).toMillis() : null;

  const map = noopMap();
  const includes = anyIncludes(toMillis(start), toMillis(end), startIncluded, endIncluded, toMillis);

  return new Range({
    start,
    end,
    'start included': startIncluded,
    'end included': endIncluded,
    map,
    includes
  });

}


function createDateTimeRange(start, end, startIncluded, endIncluded) {
  const map = noopMap();
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
 * @return {FunctionWrapper}
 */
function wrapFunction(fn, parameterNames = null) {

  if (!fn) {
    return null;
  }

  if (fn instanceof FunctionWrapper) {
    return fn;
  }

  if (fn instanceof Range) {
    return new FunctionWrapper((value) => fn.includes(value), [ 'value' ]);
  }

  if (typeof fn !== 'function') {
    return null;
  }

  return new FunctionWrapper(fn, parameterNames || parseParameterNames(fn));
}

function parseString(str: string) {

  if (str.startsWith('"')) {
    str = str.slice(1);
  }

  if (str.endsWith('"')) {
    str = str.slice(0, -1);
  }

  return str.replace(/(\\")|(\\\\)|(\\n)|(\\r)|(\\t)|(\\u[a-fA-F0-9]{5,6})|((?:\\u[a-fA-F0-9]{1,4})+)/ig, function(substring: string, ...groups: any[]) {

    const [
      quotes,
      backslash,
      newline,
      carriageReturn,
      tab,
      codePoint,
      charCodes
    ] = groups;

    if (quotes) {
      return '"';
    }

    if (newline) {
      return '\n';
    }

    if (carriageReturn) {
      return '\r';
    }

    if (tab) {
      return '\t';
    }

    if (backslash) {
      return '\\';
    }

    const escapePattern = /\\u([a-fA-F0-9]+)/ig;

    if (codePoint) {
      const codePointMatch = escapePattern.exec(codePoint);

      return String.fromCodePoint(parseInt(codePointMatch[1], 16));
    }

    if (charCodes) {
      const chars = [];

      let charCodeMatch;

      while ((charCodeMatch = escapePattern.exec(substring)) !== null) {
        chars.push(parseInt(charCodeMatch[1], 16));
      }

      return String.fromCharCode(...chars);
    }

    throw new Error('illegal match');
  });
}


type LintError = {
  message: string
};

function lintErrorDetails(errorNodeRef: SyntaxNodeRef) : {
  message: string,
  position: SourceLocation
} {

  const node = errorNodeRef.node;
  const parent = node.parent;

  const {
    from,
    to
  } = node;

  if (node.from !== node.to) {
    return {
      message: `Unrecognized token in <${parent.name}>`,
      position: {
        from,
        to
      }
    };
  }

  const next = findNext(node);

  if (next) {
    return {
      message: `Unrecognized token <${next.name}> in <${parent.name}>`,
      position: {
        from: next.from,
        to: next.to
      }
    };
  } else {
    const unfinished = parent.enterUnfinishedNodesBefore(errorNodeRef.to);

    return {
      message: `Incomplete <${ (unfinished || parent).name }>`,
      position: {
        from,
        to
      }
    };
  }
}

function lintError(input: string, errorNodeRef: SyntaxNodeRef): LintError {

  const {
    message,
    position
  } = lintErrorDetails(errorNodeRef);

  return new SyntaxError(
    message,
    {
      input: input.slice(position.from, position.to),
      position
    }
  );
}

function findNext(nodeRef: SyntaxNodeRef) : SyntaxNode | null {

  const node = nodeRef.node;

  let next, parent = node;

  do {
    next = parent.nextSibling;

    if (next) {
      return next;
    }

    parent = parent.parent;
  } while (parent);

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatValue(value: any) {
  const type = getType(value);

  if (type === 'string') {
    return `"${ String(value) }"`;
  }

  if (type === 'list') {
    return `[${value.length} items]`;
  }

  if (type === 'context') {
    return '{...}';
  }

  if (type === 'function') {

    const parameterNames = value.parameterNames;

    if (parameterNames) {
      return `function(${ parameterNames.join(', ') })`;
    }

    return 'function';
  }

  if (type === 'nil') {
    return 'null';
  }

  return String(value);
};