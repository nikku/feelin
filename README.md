## Feelin

[![Build Status](https://travis-ci.com/nikku/feelin.svg?branch=master)](https://travis-ci.com/nikku/feelin)

A FEEL parser and interpreter written in JavaScript.


## Usage

```javascript
import {
  unaryTest,
  evaluate
} from 'feelin';

unaryTest(1, '1'); // true
unaryTest(1, '[1..end]', { end: 10 }); // true

evaluate("Mike's dauther.name", {
  "Mike's dauther.name": "Lisa"
}); // "Lisa"

evaluate('for a in [1, 2, 3] return a * 2'); // [ 2, 4, 6 ]

evaluate('every rate in rates() satisfies rate < 10', {
  rates() {
    return [ 10, 20 ];
  }
}); // false
```


## Features

* [x] Support basic FEEL operations
* [x] Support names with spaces
* [x] Recover on errors
* [ ] Provides built-in functions
* [ ] Passes all FEEL tests in the [DMN TCK](https://github.com/dmn-tck/tck)


## Related

Other open source FEEL interpreters:

* [feel-scala](https://github.com/camunda/feel-scala)
* [js-feel](https://github.com/EdgeVerve/feel)


Standards related resources:

* [dmn-tck](https://github.com/dmn-tck/tck)
* [DMN 1.2 Specification](https://www.omg.org/spec/DMN/1.2/PDF)


## License

MIT
