'use strict';
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');
const enums = require('./../schema/enum.json');
const mongoBrSuggestions = require('./../models/bibliographicResourceSuggestions').mongoBrSuggestions;
const mongoBr= require('./../models/bibliographicResource').mongoBr;

var StatsHelper = function(){
};


StatsHelper.prototype.brStats = function(callback){
    var stats = {};
    mongoBr.find({},{},function(err,docs){
        if(err){
            logger.error(err);
            return callback(err, null);
        }
        stats.count = docs.length;
        return callback(null, stats);
    });
};


/**
 * Factory function
 *
 * @returns {StatsHelper}
 */
function createStatsHelper() {
    return new StatsHelper();
}


module.exports = {
    createStatsHelper : createStatsHelper
};