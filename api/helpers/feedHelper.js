/**
 * Created by anlausch on 8/18/2017.
 */
'use strict';

const errorlog = require('./../util/logger.js').errorlog;

var FeedHelper = function(){
};


FeedHelper.prototype.query = function(query, callback){

};


/**
 * Factory function
 *
 * @returns {FeedHelper}
 */
function createFeedHelper() {
    return new FeedHelper();
}


module.exports = {
    createFeedHelper : createFeedHelper
};