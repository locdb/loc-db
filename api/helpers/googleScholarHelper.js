'use strict';

const scholar = require('google-scholar');


var GoogleScholarHelper = function(){
};


GoogleScholarHelper.prototype.query = function(query, callback){
    scholar.search(query)
    .then(resultsObj => {
        callback(resultsObj);
    });
    
};


/**
 * Factory function
 *
 * @returns {GoogleScholarHelper}
*/
function createGoogleScholarHelper() {
    return new GoogleScholarHelper();
}


module.exports = {
        createGoogleScholarHelper : createGoogleScholarHelper
};