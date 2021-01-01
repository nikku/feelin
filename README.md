## Feelin

[![Build Status](https://img.shields.io/github/workflow/status/nikku/feelin/CI)](https://github.com/nikku/feelin/actions?query=workflow%3ACI)

A FEEL parser and interpreter written in JavaScript. [__:arrow_right: Try it out__](https://nikku.github.io/feel-playground).


## Usage

```javascript
import {
  unaryTest,
  evaluate
} from 'feelin';

unaryTest('1', { '?': 1 }); // true
unaryTest('[1..end]', { '?': 1, end: 10 }); // true

evaluate("Mike's dauther.name", {
  'Mike\'s dauther.name': 'Lisa'
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
* [x] Supports names with spaces
* [x] Recovers on errors
* [ ] Provides built-in functions
* [ ] Passes all FEEL tests in the [DMN TCK](https://github.com/dmn-tck/tck)


## Related

Feel language support:

* [lezer-feel](https://github.com/nikku/lezer-feel)

Other open source FEEL interpreters:

* [feel-scala](https://github.com/camunda/feel-scala)
* [js-feel](https://github.com/EdgeVerve/feel)

Standards related resources:

* [dmn-tck](https://github.com/dmn-tck/tck)
* [DMN 1.2 Specification](https://www.omg.org/spec/DMN/1.2/PDF)


## License

MIT
