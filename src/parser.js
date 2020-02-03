import {
  parser as grammarParser
} from './grammar/feel-parser';


/**
 * A feel parser for a specific grammar (unary tests / expressions)
 */
class Parser {

  parseExpressions(rawInput, rawContext) {
    return this._parse(rawInput, rawContext, { top: 'Expressions' });
  }

  parseUnaryTests(rawInput, rawContext) {
    return this._parse(rawInput, rawContext, { top: 'UnaryTests' });
  }

  _parse(rawInput, rawContext, parseOptions) {

    const names = this._findNames(rawContext);

    const {
      context: parsedContext,
      input: parsedInput
    } = this._replaceNames(rawInput, rawContext, names);

    const tree = grammarParser.parse(parsedInput, parseOptions);

    return {
      parsedContext,
      parsedInput,
      tree
    };
  }

  _parseName(name) {

    let match;

    const pattern = /([./\-'+*]+)|([^\s./\-'+*]+)/g;

    const tokens = [];

    let lastName = false;

    while ((match = pattern.exec(name))) {

      const [ _, additionalPart, namePart ] = match;

      if (additionalPart) {
        lastName = false;

        if (tokens.length) {
          tokens.push('\\s*');
        }

        tokens.push(additionalPart.replace(/[+*]/g, '\\$&'));
      } else {
        if (tokens.length) {
          if (lastName) {
            tokens.push('\\s+');
          } else {
            tokens.push('\\s*');
          }
        }

        lastName = true;

        tokens.push(namePart);
      }
    }

    return tokens;
  }

  _findNames(context) {

    let uid = 0;

    return Object.keys(context).filter(key => /[\s./\-'+*]/.test(key)).map(name => {

      const replacement = '_' + uid.toString(36);
      const tokens = this._parseName(name);

      const replacer = new RegExp(tokens.join(''), 'g');

      return {
        name,
        replacement,
        replacer
      };
    });
  }

  _replaceNames(input, context, names) {

    for (const { name, replacement, replacer } of names) {

      input = input.replace(replacer, function(match) {

        const placeholder = replacement.padEnd(match.length, '_');

        if (!context[placeholder]) {
          context = {
            ...context,
            [match]: context[name]
          };
        }

        return placeholder;
      });
    }

    return {
      input,
      context
    };
  }

}

const parser = new Parser();

export function parseExpressions(expression, context = {}) {
  return parser.parseExpressions(expression, context);
}

export function parseUnaryTests(expression, context = {}) {
  return parser.parseUnaryTests(expression, context);
}