/**
 * Created by anlausch on 10/6/2017.
 */
const should = require('should');
const setup = require('./../setup.js').createSetup();
const ocrHelper = require('./../../../api/helpers/ocrHelper.js').createOcrHelper();
const fs = require('fs');

describe('helpers', function() {
    describe('ocrHelper', function() {
        before(function (done) {
            setup.dropDB(function (err) {
                done();
            });
        });

        after(function (done) {
            setup.dropDB(function (err) {
                done();
            });
        });

        /*describe('triggerOCRProcessing', function () {
            it('should return something', function (done) {
                this.timeout(1000000000);
                ocrHelper.queryOcrComponent("./../loc-db/test/api/data/ocr_data/02_input.png", function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    done();
                });
            });
        });*/

        describe('OCR: fileupload', function () {
            it('should return an xml string for a png', function (done) {
                this.timeout(1000000000);
                ocrHelper.ocr_fileupload("./../loc-db/test/api/data/ocr_data/02_input.png", false, function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    done();
                });
            });

            it('should return an xml string for a pdf', function (done) {
                this.timeout(1000000000);
                ocrHelper.ocr_fileupload("./../loc-db/test/api/data/ocr_data/references.pdf", true, function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    done();
                });
            });
        });

        describe('parseXMLString', function () {
            it('should return bibliographicEntries given the ocr output', function (done) {
                fs.readFile("./../loc-db/test/api/data/ocr_data/ocrOutput.xml", function(err,res){
                    if(err){
                        done(err);
                    }
                    ocrHelper.parseXMLString(res,"59f04e71d18ed24f84df3bb1.png", function (err, result) {
                        console.log(result);
                        should.not.exists(err);
                        result.should.be.Array().and.have.lengthOf(20);
                        result[0].should.be.Object();
                        result[0].should.have.property("bibliographicEntryText", "Elonheimo H, Sourander A, Niemeli S and Helenrus H (2010)" +
                            " Generic and crime type specific correlates of youth crimme. A Finnish population-based study. " +
                            "Social Psychiatry and Physiatric Epidemiology 00 (accessed 18 April 2011).");
                        result[0].should.have.property("ocrData").which.is.an.Object();
                        result[0].ocrData.should.have.property("coordinates");
                        result[0].ocrData.should.have.property("date");
                        result[0].ocrData.should.have.property("journal");
                        result[0].ocrData.should.have.property("marker");
                        result[0].ocrData.should.have.property("title");
                        result[0].ocrData.should.have.property("volume");
                        result[0].ocrData.authors.should.be.Array().and.have.lengthOf(1);
                        result[0].ocrData.authors[0].should.equal("H Elonheimo");
                        done();
                    });
                });
            });
        });


    });
});