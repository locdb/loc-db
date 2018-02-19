/**
 * Created by anlausch on 10/6/2017.
 */
const should = require('should');
const setup = require('./../setup.js').createSetup();
const gviHelper = require('./../../../api/helpers/gviHelper.js').createGVIHelper();
const fs = require('fs');

describe('helpers', function() {
    describe('gviHelper', function() {
        before(function (done) {
            setup.dropDB(function (err) {
                setup.mockGVI();
                done();
            });
        });

        after(function (done) {
            setup.dropDB(function (err) {
                done();
            });
        });

        describe('GVI queryByQueryString', function () {
            it('should return something', function (done) {
                this.timeout(1000000000);
                gviHelper.queryByQueryString("test", function (err, result) {
                    result.should.be.Array().and.have.lengthOf(10);
                    result[0][0].should.have.property("type", "BOOK");
                    should.not.exists(err);
                    done();
                });
            });
        });

    });
});