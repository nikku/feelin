import { expect } from './helpers.js';

import { Temporal } from 'temporal-polyfill';

import {
  evaluate,
  date,
  time,
  dateAndTime,
  duration,
  now,
  today,
  toFeel,
  FeelDate,
  FeelTime,
  FeelDateTime,
  FeelDuration
} from 'feelin';


describe('temporal', function() {

  describe('public API', function() {

    it('should expose temporal factories', function() {
      expect(date).to.be.a('function');
      expect(time).to.be.a('function');
      expect(dateAndTime).to.be.a('function');
      expect(duration).to.be.a('function');
      expect(now).to.be.a('function');
      expect(today).to.be.a('function');
      expect(toFeel).to.be.a('function');
    });


    it('should expose wrapper classes', function() {
      expect(date('2020-04-06')).to.be.an.instanceof(FeelDate);
      expect(time('10:30:00')).to.be.an.instanceof(FeelTime);
      expect(dateAndTime('2020-04-06T10:30:00')).to.be.an.instanceof(FeelDateTime);
      expect(duration('P1D')).to.be.an.instanceof(FeelDuration);
    });


    it('should return wrapper values from evaluate', function() {
      expect(evaluate('date("2020-04-06")').value).to.be.an.instanceof(FeelDate);
      expect(evaluate('time("10:30:00")').value).to.be.an.instanceof(FeelTime);
      expect(evaluate('date and time("2020-04-06T10:30:00")').value).to.be.an.instanceof(FeelDateTime);
      expect(evaluate('duration("P1D")').value).to.be.an.instanceof(FeelDuration);
    });

  });


  describe('unwrap()', function() {

    it('should unwrap a date to Temporal.PlainDate', function() {
      const value = evaluate('date("2020-04-06")').value;

      expect(value.unwrap()).to.be.an.instanceof(Temporal.PlainDate);
      expect(value.unwrap().toString()).to.eql('2020-04-06');
    });


    it('should unwrap a time to Temporal.PlainTime', function() {
      const value = evaluate('time("10:30:00")').value;

      expect(value.unwrap()).to.be.an.instanceof(Temporal.PlainTime);
      expect(value.unwrap().toString()).to.eql('10:30:00');
    });


    it('should unwrap a date and time to Temporal.PlainDateTime', function() {
      const value = evaluate('date and time("2020-04-06T10:30:00")').value;

      expect(value.unwrap()).to.be.an.instanceof(Temporal.PlainDateTime);
      expect(value.unwrap().toString()).to.eql('2020-04-06T10:30:00');
    });


    it('should unwrap a duration to Temporal.Duration', function() {
      const value = evaluate('duration("P1D")').value;

      expect(value.unwrap()).to.be.an.instanceof(Temporal.Duration);
    });

  });


  describe('toFeel()', function() {

    it('should wrap a JS Date as a UTC date and time', function() {
      const value = toFeel(new Date('2020-04-06T10:30:00Z'));

      expect(value).to.be.an.instanceof(FeelDateTime);
      expect(value.toString()).to.eql('2020-04-06T10:30:00Z');
    });


    it('should wrap raw Temporal values', function() {
      expect(toFeel(Temporal.PlainDate.from('2020-04-06'))).to.be.an.instanceof(FeelDate);
      expect(toFeel(Temporal.PlainTime.from('10:30:00'))).to.be.an.instanceof(FeelTime);
      expect(toFeel(Temporal.PlainDateTime.from('2020-04-06T10:30:00'))).to.be.an.instanceof(FeelDateTime);
      expect(toFeel(Temporal.Duration.from('P1D'))).to.be.an.instanceof(FeelDuration);
    });


    it('should pass wrappers through unchanged', function() {
      const wrapped = date('2020-04-06');

      expect(toFeel(wrapped)).to.equal(wrapped);
    });


    it('should leave non-temporal values untouched', function() {
      expect(toFeel(42)).to.eql(42);
      expect(toFeel('foo')).to.eql('foo');
      expect(toFeel(null)).to.eql(null);
    });

  });


  describe('context coercion', function() {

    it('should coerce a JS Date in the context', function() {
      const output = evaluate('a = date and time("2020-04-06T10:30:00Z")', {
        a: new Date('2020-04-06T10:30:00Z')
      });

      expect(output.value).to.be.true;
    });


    it('should coerce a raw Temporal.PlainDate in the context', function() {
      const output = evaluate('a = date("2020-04-06")', {
        a: Temporal.PlainDate.from('2020-04-06')
      });

      expect(output.value).to.be.true;
    });


    it('should coerce a raw Temporal.PlainTime in the context', function() {
      const output = evaluate('a = time("10:30:00")', {
        a: Temporal.PlainTime.from('10:30:00')
      });

      expect(output.value).to.be.true;
    });


    it('should coerce a raw Temporal.Duration in the context', function() {
      const output = evaluate('a = duration("P1D")', {
        a: Temporal.Duration.from('P1D')
      });

      expect(output.value).to.be.true;
    });


    it('should coerce nested context entries', function() {
      const output = evaluate('a.b = date("2020-04-06")', {
        a: { b: Temporal.PlainDate.from('2020-04-06') }
      });

      expect(output.value).to.be.true;
    });


    it('should coerce values inside lists', function() {
      const output = evaluate('a[1] = date("2020-04-06")', {
        a: [ Temporal.PlainDate.from('2020-04-06') ]
      });

      expect(output.value).to.be.true;
    });


    it('should allow property access on coerced values', function() {
      const output = evaluate('a.year', {
        a: Temporal.PlainDate.from('2020-04-06')
      });

      expect(output.value).to.eql(2020);
    });

  });

});
