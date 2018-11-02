const should = require('should');
const setup = require('./../setup.js').createSetup();
const openCitationsHelper = require('./../../../api/helpers/openCitationsHelper.js').createOpenCitationsHelper();

describe.only('helpers', function() {
    describe('openCitationsHelper', function() {
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
        
        describe('queryByTitle', function(){
            it('should return result for a given query', function(done) {
                this.timeout(100000);
                openCitationsHelper.queryByTitle("Circulation Research", function(err,result){
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array().and.have.lengthOf(1);
                    result[0].should.be.ok();
                    result[0].should.have.property("journal_title", "Circulation Research");
                    done();
                });
            });
        });

        describe.only('queryByString', function(){
            it('should return result for a given query', function(done) {
                this.timeout(100000);
                openCitationsHelper.queryByString("Circulation Research", function(err,result){
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array().and.have.lengthOf(1);
                    result[0].should.be.ok();
                    result[0].should.have.property("journal_title", "Circulation Research");
                    done();
                });
            });
        });
    });
});