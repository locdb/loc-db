const should = require('should');
const setup = require('./../setup.js').createSetup();
const crossrefHelper = require('./../../../api/helpers/crossrefHelper.js').createCrossrefHelper();

describe('helpers', function() {
    describe('crossrefHelper', function() {
        before(function(done) {
            setup.dropDB();
            done();
        });
        
        after(function(done) {
            setup.dropDB();
            done();
        });
        
        describe('query', function(){
            it('should return result for a given query', function(done) {
                this.timeout(5000);
                crossrefHelper.query("Test", function(result){
                    console.log(result);
                    result.should.be.ok();
                    done();
                });
            });
        });
    });
});