/**
 * Created by anlausch on 06/12/2018.
 */
const should = require('should');
const setup = require('./../setup.js').createSetup();
const suggestionHelper = require('./../../../api/helpers/suggestionHelper.js').createSuggestionHelper();
const bibliographicResource = require('./../data/bibliographicResourceWithParts.json');
const BibliographicResource = require('./../../../api/schema/bibliographicResource');
const mongoBrSuggestions = require('./../../../api/models/bibliographicResourceSuggestions').mongoBrSuggestions;

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
                    res.should.be.Array().and.have.lengthOf(0);
                    // create query string
                    suggestionHelper.createQueryStringForBE(bibliographicResource.parts[0], function (err, queryString) {
                        should.not.exists(err);
                        // retrieve suggestions by query
                        mongoBrSuggestions.findOne({queryString: queryString}, function (err, sug) {
                            should.not.exists(err);
                            sug.suggestions.should.have.lengthOf(23);
                            done();
                        });
                    });
                });
            });
        });

        describe('rankSuggestions', function() {
            it('should rank the suggestions in an appropriate way', function (done) {
                var suggestionsUnranked = require('./../data/suggestions/suggestionsUnranked.json');
                var suggestionsTransformed = [];
                for(var parentChild of suggestionsUnranked){
                    var parentChildTransformed = [];
                    for(var br of parentChild){
                        parentChildTransformed.push(new BibliographicResource(br));
                    }
                    suggestionsTransformed.push(parentChildTransformed);
                }
                var query = "Modeling groundwater fluctuations by three different evolutionary neural network techniques using hydroclimatic data";
                suggestionHelper.sort(query, suggestionsTransformed, function (err, res) {
                    should.not.exists(err);
                    res.should.be.Array();
                    res.should.have.lengthOf(20);
                    res[0][0].toObject().should.have.property("journalArticle_title", "Modeling groundwater fluctuations by three different evolutionary neural network techniques using hydroclimatic data");
                    done();
                });
            });
        });



    });
});