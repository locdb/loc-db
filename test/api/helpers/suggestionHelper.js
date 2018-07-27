/**
 * Created by anlausch on 06/12/2018.
 */
const should = require('should');
const setup = require('./../setup.js').createSetup();
const suggestionHelper = require('./../../../api/helpers/suggestionHelper.js').createSuggestionHelper();
const bibliographicResource = require('./../data/bibliographicResourceWithParts.json');

describe('helpers', function() {
    describe('suggestionHelper', function() {

        before(function (done) {
            setup.dropDB(function (err) {
                setup.mockGVISuggestions();
                setup.mockK10PlusSuggestions();
                done();
            });
        });

        after(function (done) {
            setup.dropDB(function (err) {
                done();
            });
        });

        describe('precalculateSuggestions', function() {
            it('Should precalculate suggestions for a given br', function (done) {
                this.timeout(1000000);
                suggestionHelper.precalculateExternalSuggestions(bibliographicResource, function (err, res) {
                    should.not.exists(err);
                    res.should.be.Array().and.have.lengthOf(2);
                    res[0].suggestions.should.be.Array().and.have.lengthOf(10);
                    done();
                });
            });
        });



    });
});