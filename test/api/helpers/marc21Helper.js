const should = require('should');
const setup = require('./../setup.js').createSetup();
const marc21Helper = require('./../../../api/helpers/marc21Helper.js').createMarc21Helper();
const fs = require('fs')
const enums = require('./../../../api/schema/enum.json')

describe('helpers', function() {
    var marc21XML;
    describe('marc21Helper', function() {
        before(function(done) {
            setup.dropDB(function(err){
                fs.readFile('./test/api/data/marc21SWB.xml',"utf-8", function read(err, data) {
                    if (err) {
                        throw err;
                    }
                    marc21XML = data;
                    done();
                });
            });
        });
        
        after(function(done) {
            setup.dropDB(function(err){
                done();
            });
        });
        
        describe('parseBibliographicResource', function(){
            it('should return a parsed bibliographic resource', function(done) {
                marc21Helper.parseBibliographicResource(marc21XML, function(result){
                    result.should.be.ok();
                    result.should.have.property("title", "Der soziologische Blick :");
                    result.should.have.property("subtitle", "vergangene Positionen und gegenwärtige Perspektiven /");
                    result.should.have.property("publicationYear", 2002);
                    result.should.have.property("contributors");
                    result.should.have.property("identifiers");
                    result.contributors.should.be.Array();
                    result.contributors.should.have.length(1);
                    result.contributors[0].should.have.property("roleType", enums.roleType.publisher)
                    result.identifiers.should.be.Array();
                    result.contributors.should.have.length(1)
                    done();
                });
            });
        });
    });
});