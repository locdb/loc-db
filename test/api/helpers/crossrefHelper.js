const should = require('should');
const setup = require('./../setup.js').createSetup();
const crossrefHelper = require('./../../../api/helpers/crossrefHelper.js').createCrossrefHelper();
const enums = require('./../../../api/schema/enum.json');

describe('helpers', function() {
    describe('crossrefHelper', function() {
        before(function(done) {
            setup.dropDB(function(err){
                done();
            });
        });
        
        after(function(done) {
            setup.dropDB(function(err){
                done();
            });
        });
        
        describe('query', function(){
            it('should return result for a given query', function(done) {
                this.timeout(5000);
                crossrefHelper.query("Test", function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result.should.have.lengthOf(20);
                    result[1].should.have.property("identifiers");
                    result[1].identifiers.should.be.Array();
                    result[1].identifiers.should.have.lengthOf(3);
                    result[1].identifiers[1].should.have.property("scheme", enums.externalSources.crossref);
                    done();
                });
            });
        });
    });
});