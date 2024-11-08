import {
  evaluate,
  unaryTest
} from '..';

import { expect } from 'chai';


describe('types', function() {

  describe('evaluate', function() {

    it('should evaluate', function() {

      // when
      const value = evaluate('hello', {
        hello: 'HELLO'
      });

      // then
      expect(value).to.eql('HELLO');
    });

  });


  describe('unaryTest', function() {

    it('should test', function() {

      // when
      const value = unaryTest('[10, 20]', {
        '?': 5
      });

      // then
      expect(value).to.be.true;
    });

  });

});