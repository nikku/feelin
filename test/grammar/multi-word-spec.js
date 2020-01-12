import {
  buildParser
} from 'lezer-generator';


describe('multi-words', function() {

  const grammar = `
    @top[name=Script] {
      AnyName+
    }

    AnyName {
      Identifier | Special
    }

    Special {
      fooBar |
      other
    }

    fooBar { @extend<Identifier, "FOO"> @specialize<Identifier, "BAR"> }

    other { @specialize<Identifier, "OTHER"> }

    @skip { whitespace }

    @tokens {

      whitespace { std.whitespace+ }

      Identifier {
        std.asciiLetter+
      }

    }
  `;

  const parser = buildParser(grammar);


  parse(parser, 'FOO OTHER');

  parse(parser, 'OTHER');

  parse(parser, 'OTHERA');

  parse(parser, 'FOO B');

  parse(parser, 'FOO BAR');

  parse(parser, 'FOO BARA');

});


// helpers /////////////////

function parse(parser, input) {

  it(`should parse <${input}>`, function() {

    const tree = parser.parse(input);

    console.log(treeToString(tree, input));
  });

}

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