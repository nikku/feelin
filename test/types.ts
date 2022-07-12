import {
  evaluate,
  unaryTest
} from '..';

import { expect } from 'chai';


describe('types', () => {

  describe('evaluate', () => {

    it('should evaluate', () => {

      // when
      const value = evaluate('hello', {
        hello: 'HELLO'
      });

      // then
      expect(value).to.eql('HELLO');
    });

  });


  describe('unaryTest', () => {

    it('should test', () => {

      // when
      const value = unaryTest('[10, 20]', {
        '?': 5
      });

      // then
      expect(value).to.be.true;
    });

  });

});