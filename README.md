# @bpmn-io/feelin

[![CI](https://github.com/bpmn-io/feelin/actions/workflows/CI.yml/badge.svg)](https://github.com/bpmn-io/feelin/actions/workflows/CI.yml)

> [!NOTE]
> This is a fork of [feelin](https://github.com/nikku/feelin)

A [DMN](https://www.omg.org/spec/DMN/) FEEL parser and interpreter written in JavaScript. [__:arrow_right: Try it out__](https://nikku.github.io/feel-playground).


## Usage

```javascript
import {
  unaryTest,
  evaluate
} from '@bpmn-io/feelin';

unaryTest('1', { '?': 1 }); // { value: true, warnings: [] }
unaryTest('[1..end]', { '?': 1, end: 10 }); // { value: true, warnings: [] }

evaluate("Mike's daughter.name", {
  'Mike\'s daughter.name': 'Lisa'
}); // { value: 'Lisa', warnings: [] }

evaluate('for a in [1, 2, 3] return a * 2'); // { value: [ 2, 4, 6 ], ... }

evaluate('every rate in rates() satisfies rate < 10', {
  rates() {
    return [ 10, 20 ];
  }
}); // { value: false, warnings: [] }
```

To understand `null` conversions due to errors, inspect `warnings` returned:

```javascript
const { value, warnings } = evaluate('x');

console.log(warnings);
// [
//   {
//     message: "Variable 'x' not found",
//     type: 'NO_VARIABLE_FOUND',
//     position: { from: 0, to: 1 },
//   }
// ]
```

## Features

* [x] Recognizes full FEEL grammar
* [x] Context sensitive (incl. names with spaces)
* [x] Recovers on errors
* [x] Temporal types and operations
* [x] Built-in FEEL functions
* [ ] Full [DMN TCK](https://github.com/dmn-tck/tck) compliance (cf. [coverage](./docs/DMN_TCK.md))


## Build and Run

```sh
# build the library and run all tests
npm run all

# spin up for local development
npm run dev

# execute FEEL tests in DMN TCK
npm run tck
```


## Related

* [lezer-feel](https://github.com/nikku/lezer-feel) - FEEL language definition for the [Lezer](https://lezer.codemirror.net/) parser system
* [feel-playground](https://github.com/nikku/feel-playground) - Interactive playground to learn the FEEL language


## License

MIT
