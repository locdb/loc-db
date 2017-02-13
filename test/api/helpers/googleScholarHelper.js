const should = require('should');
const setup = require('./../setup.js').createSetup();
const googleScholarHelper = require('./../../../api/helpers/googleScholarHelper.js').createGoogleScholarHelper();

describe('helpers', function() {
    describe('googleScholarHelper', function() {
        before(function(done) {
            setup.dropDB();
            done();
        });
        
        after(function(done) {
            setup.dropDB();
            done();
        });
        
        describe('parseFile', function(){
            it('should return result for a given query', function(done) {
                googleScholarHelper.query("Test", function(result){
                    console.log(result);
                    result.should.be.ok();
//                    result.should.have.property("title", "Der soziologische Blick :");
//                    result.should.have.property("subtitle", "vergangene Positionen und gegenwärtige Perspektiven /");
//                    result.should.have.property("publicationYear", 2002);
//                    result.should.have.property("contributors");
//                    result.should.have.property("identifiers");
//                    result.contributors.should.be.Array();
//                    result.contributors.should.have.length(1);
//                    result.contributors[0].should.have.property("roleType", "Publisher")
//                    result.identifiers.should.be.Array();
//                    result.contributors.should.have.length(1)
                    done();
                });
                
            });
        });
    });
});