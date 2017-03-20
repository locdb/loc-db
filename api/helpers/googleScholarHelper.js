'use strict';

const scholar = require('google-scholar');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;
const bibliographicEntry = require('./../schema/bibliographicEntry.js');
const enums = require('./../schema/enum.json');


var GoogleScholarHelper = function(){
};


GoogleScholarHelper.prototype.query = function(query, callback){
    scholar.search(query)
    .then(resultsObj => {
        var bes = [];
        for(var res of resultsObj.results){
            var authors = [];
            var externalURLs = [{url: res.url, source: enums.externalSources.gScholar}];
            for (var a of res.authors){
                var author = a.name;
                authors.push(author);
            }
            var be = new bibliographicEntry({title: res.title, authors: authors, externalURLs: externalURLs, status: enums.status.external});
            bes.push(be.toObject());
        }
        console.log(bes);
        callback(null, bes);
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