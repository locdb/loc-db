/**
 * Created by anlausch on 10/6/2017.
 */
const should = require('should');
const fileHelper = require('./../../../api/helpers/fileHelper').createFileHelper();
const setup = require('./../setup.js').createSetup();

describe('helpers', function() {
    describe('fileHelper', function() {
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



        describe('extractZip', function () {
            it('should extract the zip file', function (done) {
                fileHelper.extractZip("./response.zip", "./response", function (err, result) {
                    should.not.exists(err);
                    done();
                });
            });
        });




    });
});