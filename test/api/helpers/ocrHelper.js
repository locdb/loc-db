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

        describe('triggerOCRProcessing', function () {
            it('should return something', function (done) {
                this.timeout(5000);
                ocrHelper.queryOcrComponent("./../loc-db/test/api/data/ocr_example_1/0001.png", function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    done();
                });
            });
        });

    });
});