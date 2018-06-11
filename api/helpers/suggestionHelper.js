'use strict';
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');
const stringSimilarity = require('string-similarity');

var SuggestionHelper = function(){
};


SuggestionHelper.prototype.sort= function(query, suggestions, callback){
    var self = this;
    self.computeSimilarities(query, suggestions, function(err, suggestionsScored){
        if(err){
           logger.error(err);
           return callback(err, null);
        }
        var suggestionsSorted = suggestionsScored.sort(self.compare);
        var suggestionsFinal = [];
        for(var parentChild of suggestionsSorted){
            var parentChildFinal = [];
            for(var brScored of parentChild){
                parentChildFinal.push(brScored.br);
            }
            suggestionsFinal.push(parentChildFinal);
        }
        return callback(null, suggestionsFinal);
    });
};


SuggestionHelper.prototype.compare = function(parentChildA,parentChildB){

    function getMaxScore(parentChild){
        var scores = [];
        for(var brScore of parentChild){
            scores.push(brScore.score);
        }
        return Math.max.apply(Math, scores);;

    };

    var scoreA = getMaxScore(parentChildA);
    var scoreB = getMaxScore(parentChildB);

    if(scoreA == scoreB)
        return 0;
    if(scoreA > scoreB)
        return -1;
    else
        return -1;
};



SuggestionHelper.prototype.computeSimilarities = function(query, suggestions, callback){
    var suggestionsScored = [];
    for(var parentChild of suggestions) {
        var parentChildScored = [];
        for (var br of parentChild) {
            if(Object.keys(br).length !== 0) {
                var firstAuthor = br.getContributorsForType(br.type) &&  br.getContributorsForType(br.type)[0]
                && br.getContributorsForType(br.type)[0].heldBy && br.getContributorsForType(br.type)[0].heldBy.familyName ? br.getContributorsForType(br.type)[0].heldBy.familyName : '';

                var fullYear =  br.getPublicationDateForType(br.type) ?  br.getPublicationDateForType(br.type).getFullYear() : '';

                var stringRepresentation = [br.getTitleForType(br.type), br.getSubtitleForType(br.type),
                    firstAuthor, fullYear,
                    br.getNumberForType(br.type)].join(' ');

                parentChildScored.push({
                    score: stringSimilarity.compareTwoStrings(stringRepresentation, query),
                    br: br
                });
            }
        }
        suggestionsScored.push(parentChildScored);

    }
    return callback(null, suggestionsScored);

};



/**
 * Factory function
 *
 * @returns {SuggestionHelper}
 */
function createSuggestionHelper() {
    return new SuggestionHelper();
}


module.exports = {
    createSuggestionHelper : createSuggestionHelper
};