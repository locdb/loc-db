/**
 * Created by anlausch on 10/6/2017.
 */
const should = require('should');
const setup = require('./../setup.js').createSetup();
const ocrHelper = require('./../../../api/helpers/ocrHelper.js').createOcrHelper();

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
                ocrHelper.ocr_fileupload("./../loc-db/test/api/data/ocr_data/02_input.png", function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    done();
                });
            });

            it('should return an xml string for a pdf', function (done) {
                this.timeout(1000000000);
                ocrHelper.ocr_fileupload("./../loc-db/test/api/data/ocr_data/references.pdf", function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    done();
                });
            });
        });


    });
});