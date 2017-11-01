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
                this.timeout(1000000000);
                crossrefHelper.query("The association between social capital and juvenile crime: The role of individual and structural factors.", function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result.should.have.lengthOf(20);
                    result[0].should.have.property("embodiedAs").which.is.Array();
                    result[0].embodiedAs[0].should.have.property("firstPage");
                    result[1].should.have.property("identifiers");
                    result[0].should.have.property("title", "The Association between Social Capital and Juvenile Crime");
                    result[1].identifiers.should.be.Array();
                    result[1].identifiers.should.have.lengthOf(3);
                    result[1].identifiers[1].should.have.property("scheme", enums.externalSources.crossref);
                    done();
                });
            });
        });

        describe('queryReferences', function(){
            it('should return result for a given query', function(done) {
                this.timeout(1000000000);
                crossrefHelper.queryReferences(null, "", function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result.should.have.lengthOf(5);
                    result[0].should.have.property("identifiers");
                    result[0].identifiers.should.be.Array();
                    result[0].identifiers.should.have.lengthOf(4);
                    result[0].identifiers[1].should.have.property("scheme", enums.externalSources.crossref);
                    result[0].should.have.property("parts");
                    result[0].parts.should.be.Array;
                    result[0].parts.should.have.lengthOf(58);
                    result[0].parts[0].should.have.property("identifiers");
                    result[0].parts[0].identifiers.should.be.Array;
                    result[0].parts[0].identifiers.should.have.lengthOf(1);
                    result[0].parts[0].identifiers[0].should.have.property("scheme", enums.identifier.doi);
                    done();
                });
            });

            it('should return result for a given doi', function(done) {
                this.timeout(1000000000);
                crossrefHelper.queryReferences("10.1007/s11617-006-0056-1", null, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result.should.have.lengthOf(1);
                    result[0].should.have.property("identifiers");
                    result[0].identifiers.should.be.Array();
                    result[0].identifiers.should.have.lengthOf(4);
                    result[0].identifiers[1].should.have.property("scheme", enums.externalSources.crossref);
                    result[0].should.have.property("parts");
                    result[0].parts.should.be.Array;
                    result[0].parts.should.have.lengthOf(25);
                    result[0].parts[0].should.have.property("identifiers");
                    result[0].parts[0].identifiers.should.be.Array;
                    result[0].parts[0].identifiers.should.have.lengthOf(1);
                    result[0].parts[0].identifiers[0].should.have.property("scheme", enums.identifier.doi);
                    done();
                });
            });
        });

        describe('queryByDOI', function(){

            it('should return result for a given doi', function(done) {
                this.timeout(1000000000);
                crossrefHelper.queryByDOI("10.1007/s11617-006-0056-1", function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result[0].should.have.property("identifiers");
                    result[0].identifiers.should.be.Array();
                    result[0].identifiers.should.have.lengthOf(4);
                    result[0].identifiers[1].should.have.property("scheme", enums.externalSources.crossref);
                    result[0].should.have.property("parts");
                    result[0].parts.should.be.Array;
                    result[0].parts.should.have.lengthOf(25);
                    result[0].parts[0].should.have.property("identifiers");
                    result[0].parts[0].identifiers.should.be.Array;
                    result[0].parts[0].identifiers.should.have.lengthOf(1);
                    result[0].parts[0].identifiers[0].should.have.property("scheme", enums.identifier.doi);
                    done();
                });
            });
        });

        describe('queryChapterMetaData', function(){

            it('should return result for a given doi', function(done) {
                this.timeout(1000000000);
                crossrefHelper.queryChapterMetaData("Modelling and analysis in arms control", 51,95, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result.should.have.lengthOf(1);
                    result[0].should.have.property("identifiers");
                    result[0].identifiers.should.be.Array();
                    result[0].identifiers[1].should.have.property("scheme", enums.externalSources.crossref);
                    result[0].should.have.property("title", "Arms Control: Lessons Learned and the Future");
                    done();
                });
            });
        });
    });

});