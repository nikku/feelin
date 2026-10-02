# Warnings

## Overview

feelin emits warnings when an expression cannot be evaluated to a value. Warnings are returned alongside the (null) result and describe what went wrong, where, and what was expected.

## Design Principles

1. **Always include the function name** — for builtins this is the FEEL function name (e.g. `date`, `sum`); for user-provided JS functions it is derived from the parameter names (e.g. `function(a, b)`).
2. **For parameter errors, show the expected signature** — the specific overload being matched, so the user can see what was expected vs. what was provided.
3. **For semantic errors, show the function name and the specific issue** — e.g. `function 'date' — '"nope"' is not a valid date`.
4. **Include the actual type when it differs from expected** — `got '"x"' (type 'string')`.
5. **Use consistent formatting** — `function '<name>(<params>)' — <specific message>`.
6. **Wrap values (FEEL, types) in `''`** — clearly distinguishable from error text

## Message Format

### Arity Mismatch (too many/few arguments)

```
function 'date' expects (year: number, month: number, day: number) or (from: string|date|date time), got [1, 2, … 4 more]
```

For varargs:
```
function 'sum' expects at least 1 argument, got 0
```

### Parameter Type Mismatch (single type)

```
function 'date(year, month, day)' — parameter 'year' expects type 'number', got '"aoo"' (type 'string')
```

### Parameter Type Mismatch (union type)

```
function 'date(from)' — parameter 'from' expects type 'string|date|date time', got '[]' (type 'list')
```

### Parameter Type Mismatch (list members)

```
function 'string join(list, delimiter)' — parameter 'list' expects members of type 'string', but member '1' is of type 'number'
```

### Parameter Type Mismatch (varargs members)

```
function 'sum(...list)' — parameter 'list' expects members of type 'number', but member '"x"' is of type 'string'
```

### Semantic Validation Failure (builtin body rejects well-typed input)

```
function 'date(from)' — '"nope"' is not a valid date
function 'abs(n)' — '"x"' is not a number or duration
function 'modulo(dividend, divisor)' — '0' is not a valid divisor
function 'sqrt(number)' — '-3' is negative
function 'context(...entries)' — 'null' key is not allowed
function 'context(...entries)' — duplicate key '"a"'
function 'context put(context, keys, value, key)' — '1' is not a string key
function 'list replace(list, position, newItem, match)' — '"x"' is not a valid position or match function
```

### Non-Function Call

```
cannot invoke '123' (type 'number') — not a function
cannot invoke '{a: 1}' (type 'context') — not a function
```

## Value Rendering

Warning messages render values as FEEL literals where possible:

| Type | Rendering | Example |
|---|---|---|
| `null` | `null` | `got 'null'` |
| `boolean` | `true` / `false` | `got 'true'` |
| `number` | plain number | `got '42'` |
| `string` | double-quoted, truncated at 20 chars | `got '"hello world"'` |
| `list` | sampled, max 3 items | `got '[1, 2, … 5 more]'` |
| `context` | sampled, max 3 entries | `got '{a: 1, b: 2}'` |
| `date` | `date("...")` | `got 'date("2020-01-01")'` |
| `time` | `time("...")` | `got 'time("10:30:00")'` |
| `date time` | `date and time("...")` | `got 'date and time("2020-01-01T10:30:00")'` |
| `duration` | `duration("...")` | `got 'duration("P1D")'` |
| `range` | `[start..end]` | `got '[1..10]'` |
| `function` | `function(param1, param2)` | `got 'function(a, b)'` |

## Implementation

### For Implementors

#### Adding a new builtin function

Use `fn()` for single-signature functions, `overloads()` for multi-signature functions, and `listFn()` for varargs functions. Pass the function name as the last argument:

```typescript
// Single signature
'myFn': fn(function(a, b) {
  // ...
}, [ 'string', 'number' ], [ 'a', 'b' ], 'myFn'),

// Overloads
'myFn': overloads(function(a, b) {
  // ...
}, [
  { args: [ 'string', 'number' ], params: [ 'a', 'b' ] },
  { args: [ 'number' ], params: [ 'a' ] }
], 'myFn'),

// Varargs
'myFn': listFn(function(...items) {
  // ...
}, 'string', [ '...items' ], 'myFn'),
```

#### Error messages in builtin bodies

Return `invalidArguments()` with a template that describes the specific error. The function name is automatically prepended by the `FeelFunction` wrapper:

```typescript
if (!valid) {
  return invalidArguments('{value} is not a valid thing', { value });
}
```

This produces: `function 'myFn(a, b)' — '"x"' is not a valid thing`

#### Parameter type mismatches

These are handled automatically by the signature validation system. No manual checking is needed — just declare the correct types in the signature.

### For Users

#### Reading warnings

```javascript
const { value, warnings } = evaluate('date("nope")');

console.log(warnings);
// [
//   {
//     type: 'INVALID_ARGUMENTS',
//     message: 'function \'date(from)\' — "nope" is not a valid date',
//     position: { from: 0, to: 13 },
//     details: {
//       template: '{{from}} is not a valid date',
//       values: { from: 'nope' }
//     }
//   }
// ]
```

#### Warning types

| Type | Meaning |
|---|---|
| `NO_VARIABLE_FOUND` | Variable not found in context |
| `NO_CONTEXT_ENTRY_FOUND` | Key not found in context |
| `NO_PROPERTY_FOUND` | Property not found on non-context value |
| `NOT_COMPARABLE` | Values cannot be compared |
| `INVALID_TYPE` | Operation not valid for operand types |
| `INVALID_ARGUMENTS` | Function arguments failed validation |
| `NO_FUNCTION_FOUND` | Attempted to call a non-function |
| `FUNCTION_INVOCATION_FAILURE` | Arguments do not match function signature |
| `UNSUPPORTED` | Feature not supported |