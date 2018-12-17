/**
 * Created by anlausch on 10/6/2017.
 */
const should = require('should');
const setup = require('./../setup.js').createSetup();
const ocrHelper = require('./../../../api/helpers/ocrHelper.js').createOcrHelper();
const fs = require('fs');
const Scan = require('./../../../api/schema/scan');
const BibliographicResource = require('./../../../api/schema/bibliographicResource');
const mongoBr = require('./../../../api/models/bibliographicResource').mongoBr;
const ResourceEmbodiment = require('./../../../api/schema/resourceEmbodiment');
const mongoose = require('mongoose');
const enums = require('./../../../api/schema/enum');

describe('helpers', function() {
    describe('ocrHelper', function() {
        before(function (done) {
            this.timeout(1000000000);
            setup.dropDB(function (err) {
                done();
            });
        });

        after(function (done) {
            setup.dropDB(function (err) {
                done();
            });
        });

/*        describe('OCR: fileupload', function () {
            it('should return a string for a png', function (done) {
                this.timeout(1000000000);
                ocrHelper.ocrFileUpload("/02_input.png", false, function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.String();
                    done();
                });
            });

            it('should return a string for a pdf', function (done) {
                this.timeout(1000000000);
                ocrHelper.ocrFileUpload("/references.pdf", true, function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.String();
                    done();
                });
            });
        });*/

        describe('parseXMLString', function () {
            it('should return bibliographicEntries given the ocr output', function (done) {
                fs.readFile("./test/api/data/ocr_data/ocrOutput.xml", function(err,res){
                    if(err){
                        done(err);
                    }
                    ocrHelper.parseXMLString(res, function (err, result) {
                        console.log(result);
                        should.not.exists(err);
                        result.should.be.Array().and.have.lengthOf(71);
                        result[0].should.be.Object();
                        result[0].should.have.property("bibliographicEntryText");
                        result[0].should.have.property("ocrData").which.is.an.Object();
                        result[0].ocrData.should.have.property("coordinates");
                        result[0].ocrData.should.have.property("date");
                        result[0].ocrData.should.have.property("journal");
                        result[0].ocrData.should.have.property("marker");
                        result[0].ocrData.should.have.property("title");
                        result[0].ocrData.should.have.property("volume");
                        result[0].ocrData.should.have.property("namer");
                        result[0].ocrData.should.have.property("detector");
                        result[0].ocrData.authors.should.be.Array().and.have.lengthOf(1);
                        done();
                    });
                });
            });
        });

        describe('parseSingleReference', function () {
            it('should return bibliographicEntries given the ocr output', function (done) {
                fs.readFile("./test/api/data/ocr_data/ocrOutputSingleReference.xml", function(err,res){
                    if(err){
                        done(err);
                    }
                    ocrHelper.parseXMLSingleReference(res, function (err, result) {
                        console.log(result);
                        should.not.exists(err);
                        result.should.be.Array().and.have.lengthOf(1);
                        result[0].should.be.Object();
                        result[0].should.have.property("bibliographicEntryText");
                        result[0].should.have.property("ocrData").which.is.an.Object();
                        result[0].ocrData.should.have.property("coordinates");
                        result[0].ocrData.should.have.property("date");
                        result[0].ocrData.should.have.property("journal");
                        result[0].ocrData.should.have.property("marker");
                        result[0].ocrData.should.have.property("title");
                        result[0].ocrData.should.have.property("volume");
                        result[0].ocrData.should.have.property("namer");
                        result[0].ocrData.should.have.property("detector");
                        //result[0].ocrData.authors.should.be.Array().and.have.lengthOf(0);
                        done();
                    });
                });
            });
        });

        describe('triggerOCRProcessing', function () {

            it('should return a string token or an xml', function (done) {
                setup.mockOCRFileUpload();
                this.timeout(1000000000);
                let scan = new Scan({
                    _id: mongoose.Types.ObjectId(),
                    scanName: "./../loc-db/test/api/data/ocr_data/references.pdf",
                    status: enums.status.notOCRProcessed,
                    textualPdf: true
                });

                let br = new BibliographicResource({
                    type: enums.resourceType.journalArticle,
                    journalArticle_title: "test",
                    journalArticle_embodiedAs: [new ResourceEmbodiment({
                        type: enums.embodimentType.digital,
                        scans: [scan],
                        firstPage: 4,
                        lastPage: 8,
                    })]
                });

                new mongoBr(br).save(function(err, res){
                    br._id = res._id;
                    ocrHelper.triggerOcrProcessing(scan, scan._id, br, function (err, res) {
                        should.not.exists(err);
                        // either we receive a string token or xml
                        res.should.be.String();
                        done();
                    });
                });
            });
        });

        describe('getReferenceExtractionResults', function () {
            it('should return 202', function (done) {
                var token = "6f534816-249d-4869-8b2c-f08b34c100ad";
                setup.mockOCRGetResults(token);
                ocrHelper.getReferenceExtractionResults(token, function (err, result) {
                    should.not.exists(err);
                    result.should.be.Array().and.have.lengthOf(2);
                    result[1].should.be.Number().and.equal(202);
                    result[0].should.be.String().and.equal("In Processing!");
                    done();
                });
            });

            it('should return 200', function (done) {
                var token = "6f534816-249d-4869-8b2c-f08b34c100ad";
                setup.mockOCRGetResultsProcessingFinished(token);
                ocrHelper.getReferenceExtractionResults(token, function (err, result) {
                    should.not.exists(err);
                    result.should.be.Array().and.have.lengthOf(2);
                    result[1].should.be.Number().and.equal(200);
                    result[0].should.be.String().and.startWith("<LOCDBViewResults>");
                    done();
                });
            });
        });



    });
});