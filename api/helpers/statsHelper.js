'use strict';
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');
const enums = require('./../schema/enum.json');
const mongoBrSuggestions = require('./../models/bibliographicResourceSuggestions').mongoBrSuggestions;
const mongoBr= require('./../models/bibliographicResource').mongoBr;

var StatsHelper = function(){
};

StatsHelper.prototype.groupBy = function(collection, property) {
    var i = 0, val, index,
        values = [], result = [];
    for (; i < collection.length; i++) {
        val = collection[i][property];
        index = values.indexOf(val);
        if (index > -1)
            result[index].push(collection[i]);
        else {
            values.push(val);
            result.push([collection[i]]);
        }
    }
    return result;
};

StatsHelper.prototype.brStats = function(callback){
    var self = this;
    var stats = {};
    mongoBr.find({},{},function(err,docs){
        if(err){
            logger.error(err);
            return callback(err, null);
        }
        stats.total = docs.length;
        var typeGroups = self.groupBy(docs, "type");
        var identifiers = [];
        for(var br of docs){
            var helper = new BibliographicResource(br);
            var helperTypes = helper.getAllTypesOfThis();
            for(var t of helperTypes){
                var identifiers = identifiers.concat(helper.getIdentifiersForType(t));
            }
        }
        var identifierGroups = self.groupBy(identifiers, "scheme");
        stats.types = {};
        stats.identifiers = {};
        stats.identifiers.total = identifiers.length;
        for(var tg of typeGroups){
            stats.types[tg[0].type] = tg.length;
        }
        for(var ig of identifierGroups){
            stats.identifiers[ig[0].scheme] = ig.length;
        }
        return callback(null, stats);
    });
};

StatsHelper.prototype.logStats = function(callback){
    var self = this;
    var stats = {};
    logger.query({limit: 10},function(err, results){
        return callback(null, results);
    });

    // read log
    // filter log according to old stats script
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