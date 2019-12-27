## Feelin

A FEEL parser and interpreter written in JavaScript.


## Usage

```javascript
import {
  interpreter
} from 'feelin';

interpreter.test(1, '1'); // true
interpreter.test(1, '[1..end]', { end: 10 }); // true

interpreter.eval('for a in [1, 2, 3] return a * 2'); // [ 2, 4, 6 ]

interpreter.eval('every rate in rates() satisfies rate < 10', {
  rates() {
    return [ 10, 20 ];
  }
}); // false
```


## Resources

* [feel-scala implementation reference](https://github.com/camunda/feel-scala/blob/master/feel-engine/src/main/scala/org/camunda/feel/parser/FeelParser.scala)
* [DMN tck](https://github.com/dmn-tck/tck)