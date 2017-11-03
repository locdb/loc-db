/**
 * Created by anlausch on 10/6/2017.
 */
const should = require('should');
const setup = require('./../setup.js').createSetup();
const ocrHelper = require('./../../../api/helpers/ocrHelper.js').createOcrHelper();
const fs = require('fs');

describe.only('helpers', function() {
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
                fs.readFile("./../loc-db/test/api/data/ocr_data/ocr_output_v2.xml", function(err,res){
                    if(err){
                        done(err);
                    }
                    ocrHelper.parseXMLString(res,"59f04e71d18ed24f84df3bb1.png", function (err, result) {
                        console.log(result);
                        should.not.exists(err);
                        result.should.be.Array().and.have.lengthOf(48);
                        result[0].should.be.Object();
                        result[0].should.have.property("bibliographicEntryText", "ScHONEBOHM, Friedrich Karl (1983): " +
                            "Die Volksgesetzgebung nach der Hessischen Verfassung. " +
                            "In: AvENARIUS, Hermann (Hrsg.): " +
                            "Festschrift fhr Erwin Stein. Bad Homburg vor der Hohe. S. 378.");
                        result[0].should.have.property("ocrData").which.is.an.Object();
                        result[0].ocrData.should.have.property("coordinates","728 349 2253 474");
                        result[0].ocrData.should.have.property("date","1983");
                        result[0].ocrData.should.have.property("journal","S.");
                        result[0].ocrData.should.have.property("marker","ScHONEBOHM, 1983");
                        result[0].ocrData.should.have.property("title","Die Volksgesetzgebung nach der Hessischen Verfassung. " +
                            "In: AvENARIUS, Hermann (Hrsg.): " +
                            "Festschrift fhr Erwin Stein. Bad Homburg vor der Hohe.");
                        result[0].ocrData.should.have.property("volume","378");
                        result[0].ocrData.authors.should.be.Array().and.have.lengthOf(1);
                        result[0].ocrData.authors[0].should.equal("Friedrich Karl ScHONEBOHM");
                        done();
                    });
                });
            });
        });


    });
});