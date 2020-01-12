import {
  buildParser
} from 'lezer-generator';


describe('number', function() {

  const grammar = `
    @precedence {
      add @left
    }

    @top[name=Script] {
      Expression+
    }

    Expression {
      Number |
      ArithmeticExpression
    }

    ArithmeticExpression {
      Expression !add Minus Expression
    }

    Minus[name=ArithOp] {
      @specialize<minus, "-">
    }

    Number {
      number
    }

    @skip {
      whitespace
    }

    @tokens {
      whitespace {
        std.whitespace+
      }

      ArithOp<Term> {
        Term
      }

      minus {
        "-"
      }

      number {
        minus? std.digit+
      }
    }
  `;

  const parser = buildParser(grammar);


  it('should parser -1', function() {

    const input = '-1';

    const tree = parser.parse(input);

    console.log(treeToString(tree, input));
  });


  it('should parser 1-1', function() {

    const input = '1-1';

    const tree = parser.parse(input);

    console.log(treeToString(tree, input));
  });

});


// helpers /////////////////

function treeToString(tree, input) {

  let str = '';

  let indent = 0;

  tree.iterate({
    enter(type, start, end) {
      str += `\n${'  '.repeat(indent)}${type.name} "${input.slice(start, end)}"`;
      indent++;
    },
    leave() {
      indent--;
    }
  });

  return str;
}