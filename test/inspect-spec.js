import { expect } from './helpers.js';

// unit tests for internal modules: exposed as __-prefixed exports on
// the main bundle (marked private, not public API), so domain value
// constructors share class identity with the classes that getType
// checks against
import {
  __formatDetails as formatDetails,
  __formatValue as formatValue,
  date,
  dateAndTime,
  duration,
  time,
  FeelFunction,
  FeelRange
} from 'feelin';


describe('inspect', function() {

  describe('formatValue', function() {

    describe('renders every value type', function() {

      [
        [ 'nil', null, 'null' ],
        [ 'boolean', true, 'true' ],
        [ 'number', 1.5, '1.5' ],
        [ 'string', 'foo', '"foo"' ],
        [ 'list', [ 1, 2 ], '[1, 2]' ],
        [ 'context', { a: 1 }, '{a: 1}' ],
        [ 'date', date('2020-01-01'), 'date("2020-01-01")' ],
        [ 'time', time('12:00:00'), 'time("12:00:00")' ],
        [ 'date time', dateAndTime('2020-01-01T12:00:00'), 'date and time("2020-01-01T12:00:00")' ],
        [ 'duration', duration('P1D'), 'duration("P1D")' ],
        [ 'range', new FeelRange({
          start: 1,
          end: 5,
          'start included': true,
          'end included': true,
          valueType: 'number'
        }), '[1..5]' ],
        [ 'function', new FeelFunction(x => x, [ 'x' ]), 'function(x)' ],
        [ 'function without names', new FeelFunction(x => x, null), 'function' ]
      ].forEach(([ label, value, rendered ]) => {

        it(label, function() {
          expect(formatValue(value)).to.eql(rendered);
        });

      });

    });


    describe('renders graceful fallbacks', function() {

      it('plain JS function', function() {
        expect(formatValue(function foo(a, b) { return a + b; })).to.eql('function');
      });


      it('custom class instance', function() {

        // given
        class Foo {
          constructor() {
            this.a = 1;
          }
        }

        // then
        expect(formatValue(new Foo())).to.eql('{a: 1}');
      });


      it('instance without enumerable entries', function() {
        expect(formatValue(new Map())).to.eql('{}');
      });

    });


    describe('samples and truncates', function() {

      it('truncates long strings', function() {
        expect(formatValue('a'.repeat(100))).to.eql(`"${ 'a'.repeat(20) }…"`);
      });


      it('quotes nested strings', function() {
        expect(formatValue([ 'a', 'b' ])).to.eql('["a", "b"]');
      });


      it('samples long lists', function() {
        expect(formatValue([ 1, 2, 3, 4, 5 ])).to.eql('[1, 2, … 3 more]');
      });


      it('samples large contexts', function() {
        expect(formatValue({ a: 1, b: 2, c: 3, d: 4 })).to.eql('{a: 1, b: 2, … 2 more}');
      });


      it('caps nesting depth', function() {
        expect(formatValue([ [ [ 1, 2 ], [ 3 ] ] ])).to.eql('[[[2 items], [1 items]]]');
      });


      it('renders nested domain values', function() {

        // when
        const rendered = formatValue({
          d: date('2020-01-01'),
          r: new FeelRange({
            start: 1,
            end: 5,
            'start included': true,
            'end included': true,
            valueType: 'number'
          }),
          l: [ 1, 2 ]
        });

        // then
        expect(rendered).to.eql('{d: date("2020-01-01"), r: [1..5], l: [1, 2]}');
      });

    });

  });


  describe('formatDetails', function() {

    it('interpolates values, single-quoted', function() {
      expect(formatDetails('got {item}', { item: 35 })).to.eql("got '35'");
    });


    it('renders strings as double-quoted FEEL literals inside delimiter quotes', function() {
      expect(formatDetails('got {item}', { item: 'foo' })).to.eql('got \'"foo"\'');
    });


    it('interpolates {{key}} inspected, without delimiters', function() {
      expect(formatDetails('\'date({{from}})\' is not valid', { from: 'nope' })).to.eql('\'date("nope")\' is not valid');
      expect(formatDetails('\'date({{from}})\' is not valid', { from: null })).to.eql('\'date(null)\' is not valid');
    });


    it('interpolates {{{key}}} raw, for metadata', function() {
      expect(formatDetails('is of type \'{{{type}}}\'', { type: 'number' })).to.eql('is of type \'number\'');
    });


    it('keeps templates without values as-is', function() {
      expect(formatDetails("Variable 'x' not found", {})).to.eql("Variable 'x' not found");
    });

  });

});
