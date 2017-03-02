'use strict';
const request = require('ajax-request');
const config = require('./../../config/config.json');
const marc21Helper = require('./../helpers/marc21Helper.js').createMarc21Helper();


var SwbHelper = function(){
};


SwbHelper.prototype.query = function(ppn, callback){
    var url = config.urls.swbUrl + '?query=pica.ppn+%3D+"' 
    + ppn 
    + '"&version=1.1&operation=searchRetrieve&recordSchema=marc21'
    + '&maximumRecords=1&startRecord=1&recordPacking=xml&sortKeys=none'
    +'&x-info-5-mg-requestGroupings=none';
    request({
        url: url,
        method: 'GET',
    }, function(err, res, body) {
          marc21Helper.parseBibliographicResource(body ,function(result){
              callback(result);
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