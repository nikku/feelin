# feelin

[![CI](https://github.com/nikku/feelin/actions/workflows/CI.yml/badge.svg)](https://github.com/nikku/feelin/actions/workflows/CI.yml)

A [DMN](https://www.omg.org/spec/DMN/) FEEL parser and interpreter written in JavaScript. [__:arrow_right: Try it out__](https://nikku.github.io/feel-playground).


## Usage

```javascript
import {
  unaryTest,
  evaluate
} from 'feelin';

unaryTest('1', { '?': 1 }); // true
unaryTest('[1..end]', { '?': 1, end: 10 }); // true

evaluate("Mike's daughter.name", {
  'Mike\'s daughter.name': 'Lisa'
}); // "Lisa"

evaluate('for a in [1, 2, 3] return a * 2'); // [ 2, 4, 6 ]

evaluate('every rate in rates() satisfies rate < 10', {
  rates() {
    return [ 10, 20 ];
  }
}); // false
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
