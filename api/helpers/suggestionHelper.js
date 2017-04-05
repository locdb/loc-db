/**
 * Created by anlausch on 4/5/2017.
 */
'use strict';

var SuggestionHelper = function(){
};

// What to do with this?
SuggestionHelper.prototype.damerauLevenshtein = function(string1, string2, callback){
    console.log("Not implemented");
}



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