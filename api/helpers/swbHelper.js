'use strict';
const request = require('ajax-request');
const config = require('./../../config/config.js');
const marc21Helper = require('./../helpers/marc21Helper.js').createMarc21Helper();


var SwbHelper = function(){
};


SwbHelper.prototype.query = function(ppn, callback){
    var url = config.URLS.SWB + '?query=pica.ppn+%3D+"'
    + ppn 
    + '"&version=1.1&operation=searchRetrieve&recordSchema=marc21'
    + '&maximumRecords=1&startRecord=1&recordPacking=xml&sortKeys=none'
    +'&x-info-5-mg-requestGroupings=none';
    request({
        url: url,
        method: 'GET',
    }, function(err, res, body) {
          marc21Helper.parseBibliographicResource(body ,function(err, result){
              if(err){
                  errorlog.error(err);
                  return callback(err, null);
              }
              return callback(null, result);
          });
    });
};

/**
 * Retrieves the top 10 records from swb for a given title query
 * @param title
 * @param callback
 */
SwbHelper.prototype.queryByTitle = function(title, callback){
    var url = config.URLS.SWB
        + '?query=pica.tit+%3D+"'
        + title
        + '"&version=1.1&operation=searchRetrieve&recordSchema=marc21'
        + '&maximumRecords=10&startRecord=2&recordPacking=xml&sortKeys=none'
        +'&x-info-5-mg-requestGroupings=none';
    request({
        url: url,
        method: 'GET',
    }, function(err, res, body) {
        if(err){
            errorlog.log(err);
            return callback(err, null);
        }

        marc21Helper.parseBibliographicResources(body ,function(err, result){
            if(err){
                errorlog.error(err);
                return callback(err, null);
            }
            return callback(null, result);
        });
    });
};

/**
 * Factory function
 *
 * @returns {SwbHelper}
*/
function createSwbHelper() {
    return new SwbHelper();
}


module.exports = {
        createSwbHelper : createSwbHelper
};