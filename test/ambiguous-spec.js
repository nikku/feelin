import { expect } from 'chai';

import { buildParser } from 'lezer-generator';

const grammar = `
  @top[name=Script] { expression }

  @precedence {
    path,
    qname
  }

  /**
   * a
   * 1
   * [ 1 .. 3 ]
   * [ 1 .. b ]
   * [ a, 1, [ 1, 3 ], [ a, b ] ]
   * (a)
   * ([ 1, (a) ])
   * (a).b
   */
  expression {
    textualExpression |
    boxedExpression
  }

  textualExpression {
    Name |
    Literal |
    Interval |
    PathExpression |
    "(" expression ")"
  }

  boxedExpression {
    List
  }

  PathExpression {
    expression !path "." Name
  }

  /**
   * []
   * [ a, b ]
   * [ [ 1, 2 ], [ c ] ]
   * [ [1 .. a], [ ac, b ] ]
   */
  List {
    "[" ( expression ("," expression)* )? "]"
  }

  /**
   * [1 .. 3]
   * (1 .. 3)
   * ]1 .. a[
   */
  Interval {
    ( "]" | "(" | "[" ) endpoint ".." endpoint ( "]" | ")" | "[" )
  }

  /**
   * a
   * 1
   */
  endpoint {
    QualifiedName |
    Literal
  }

  /*
   * 1
   */
  Literal {
    Number
  }

  QualifiedName {
    Name !qname ("." Name)*
  }

  @skip {
    whitespace
  }

  @tokens {

    whitespace { std.whitespace+ }

    Name { std.asciiLetter ( std.asciiLetter | std.digit )* }

    Number { std.digit+ }

  }
`

const examplePattern = / \* (.*)$/gm;

const examples = [];

let match;

while ((match = examplePattern.exec(grammar))) {
  examples.push(match[1]);
}


const parser = buildParser(grammar);


describe('ambiguous', function() {

  examples.forEach(example => {

    it(`should recognize ${ example }`, function() {

      // when
      const tree = parser.parse(example);

      const serializedTree = treeToString(tree, example);

      console.log(serializedTree);

      // then
      expect(serializedTree).not.to.include('⚠');
    });

  });

});


// helpers //////////////

function treeToString(tree, input) {

  let str = '';

  let indent = 0;

  tree.iterate({
    enter(type, start, end) {
      str += `\n${"  ".repeat(indent)}${type.name} "${input.slice(start, end)}"`;
      indent++;
    },
    leave() {
      indent--;
    }
  });

  return str;
}