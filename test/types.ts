import {
  evaluate,
  unaryTest
} from '..';

import { expect } from 'chai';


describe('types', function() {

  describe('evaluate', function() {

    it('should evaluate', function() {

      // when
      const { value, warnings } = evaluate('hello', {
        hello: 'HELLO'
      });

      // then
      expect(value).to.eql('HELLO');
      expect(warnings).to.eql([]);
    });

  });


  describe('unaryTest', function() {

    it('should test', function() {

      // when
      const { value, warnings } = unaryTest('[10, 20]', {
        '?': 5
      });

      // then
      expect(value).to.be.false;
      expect(warnings).to.be.an('array');
    });

  });

});