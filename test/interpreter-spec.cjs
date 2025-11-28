const { expect } = require('./helpers.js');

const {
  unaryTest,
  evaluate
} = require('feelin');


describe('interpreter', function() {

  describe('cjs', function() {

    it('should evaluate', function() {

      // then
      expect(evaluate('1 < 2')).to.be.true;
    });


    it('should unaryTest', function() {

      // then
      expect(unaryTest('< 2', { '?': 1 })).to.be.true;
    });

  });

});