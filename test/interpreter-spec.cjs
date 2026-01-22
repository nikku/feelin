const { expect } = require('./helpers.js');

const {
  unaryTest,
  evaluate
} = require('feelin');


describe('interpreter', function() {

  describe('cjs', function() {

    it('should evaluate', function() {

      // when
      const { value } = evaluate('1 < 2');

      // then
      expect(value).to.be.true;
    });


    it('should unaryTest', function() {

      // when
      const { value } = unaryTest('< 2', { '?': 1 });

      // then
      expect(value).to.be.true;
    });

  });

});