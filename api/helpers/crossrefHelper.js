'use strict';

const crossref = require('crossref');


var CrossrefHelper = function(){
};


CrossrefHelper.prototype.query = function(query, callback){
    var test = "Test";
    callback(test);
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