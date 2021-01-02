import {
  parser as grammarParser
} from 'lezer-feel';

import { Tree, ParserConfig } from 'lezer';

type NameDefinition = {
  name: string,
  replacement: string,
  replacer: RegExp
};

type ParseContext = Record<string, any>;

type ParseResult = {
  parsedContext: ParseContext
  parsedInput: string
  tree: Tree
};


/**
 * A feel parser for a specific grammar (unary tests / expressions)
 */
class Parser {

  parseExpressions(rawInput: string, rawContext: ParseContext): ParseResult {
    return this._parse(rawInput, rawContext, { top: 'Expressions' });
  }

  parseUnaryTests(rawInput: string, rawContext: ParseContext): ParseResult {
    return this._parse(rawInput, rawContext, { top: 'UnaryTests' });
  }

  _parse(rawInput: string, rawContext: ParseContext, parseConfig: ParserConfig): ParseResult {

    const names = this._findNames(rawContext);

    const {
      context: parsedContext,
      input: parsedInput
    } = this._replaceNames(rawInput, rawContext, names);

    const tree = grammarParser.configure(parseConfig).parse(parsedInput);

    return {
      parsedContext,
      parsedInput,
      tree
    };
  }

  _parseName(name: string) {

    let match;

    const pattern = /([./\-'+*]+)|([^\s./\-'+*]+)/g;

    const tokens = [];

    let lastName = false;

    while ((match = pattern.exec(name))) {

      const [, additionalPart, namePart ] = match;

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

  _findNames(context: ParseContext): NameDefinition[] {

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

  _replaceNames(input: string, context: ParseContext, names: NameDefinition[]) {

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

export function parseExpressions(expression: string, context: ParseContext = {}): ParseResult {
  return parser.parseExpressions(expression, context);
}

export function parseUnaryTests(expression: string, context: ParseContext = {}): ParseResult {
  return parser.parseUnaryTests(expression, context);
}