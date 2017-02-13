'use strict';

const crossref = require('crossref');


var CrossrefHelper = function(){
};


CrossrefHelper.prototype.query = function(query, callback){
    crossref.works({query: query }, (err, objs, nextOpts, done) => {
        if (err) {
            return console.log(err);
        }
        callback(objs);
    });
    
};


/**
 * Factory function
 *
 * @returns {CrossrefHelper}
*/
function createCrossrefHelper() {
    return new CrossrefHelper();
}


module.exports = {
        createCrossrefHelper : createCrossrefHelper
};