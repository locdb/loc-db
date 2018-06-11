'use strict';
const request = require('ajax-request');
const config = require('./../../config/config.js');
const marc21Helper = require('./../helpers/marc21Helper.js').createMarc21Helper();
const enums = require('./../schema/enum.json');
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');


var SwbHelper = function(){
};


SwbHelper.prototype.query = function(ppn, resourceType, callback){
    if(resourceType === enums.resourceType.journal){
        var url = config.URLS.ZDB + '?version=1.1&operation=searchRetrieve&query=idn%3D'
                + ppn
                + '&recordSchema=MARC21-xml&maximumRecords=1';
    }else{
        var url = config.URLS.SWB + '?query=pica.ppn+%3D+"'
            + ppn
            + '"&version=1.1&operation=searchRetrieve&recordSchema=marc21'
            + '&maximumRecords=1&startRecord=1&recordPacking=xml&sortKeys=none'
            +'&x-info-5-mg-requestGroupings=none';
    }
    request({
        url: url,
        method: 'GET',
    }, function(err, res, body) {
          marc21Helper.parseBibliographicResource(body, 'marcxml', function(err, result){
              if(err){
                  logger.error(err);
                  return callback(err, null);
              }
              return callback(null, result);
          });
    });
};

SwbHelper.prototype.queryOLC = function(ppn, callback){
    var url = config.URLS.OLCSSGSOZ + '?query=pica.ppn+%3D+"'
        + ppn + '"&maximumRecords=1';
    request({
        url: url,
        method: 'GET',
    }, function(err, res, body) {
        marc21Helper.parseBibliographicResource(body, 'marcxml', function(err, result){
            if(err){
                logger.error(err);
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
        + '?query=pica.tit+Any+"'
        + title
        + '"&version=1.1&operation=searchRetrieve&recordSchema=marc21'
        + '&maximumRecords=5&startRecord=2&recordPacking=xml&sortKeys=none'
        +'&x-info-5-mg-requestGroupings=none';
    request({
        url: url,
        method: 'GET',
    }, function(err, res, body) {
        if(err){
            logger.log(err);
            return callback(err, null);
        }

        marc21Helper.parseBibliographicResources(body, function(err, result){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            var brs = [];
            for(var res of result){
                var br = new BibliographicResource(res);
                br = br.toObject();
                // TODO: Maybe add ppn here?
                if(br.identifiers){
                    br.identifiers.push({scheme: enums.identifier.swbUrl, literalValue: ""});
                }else{
                    br.identifiers = [{scheme: enums.identifier.swbUrl, literalValue: ""}];
                }
                br.status = enums.status.external;
                brs.push(br);
            }
            return callback(null, brs);
        });
    });
};

/**
 * Retrieves the top 5 records from swb for a given query
 * @param query
 * @param callback
 */
SwbHelper.prototype.queryByQueryString = function(query, callback){
    var url = config.URLS.SWB
        + '?query=pica.all%3D'
        + query
        + '&version=1.1&operation=searchRetrieve&recordSchema=marc21'
        + '&maximumRecords=5&recordPacking=xml';
    request({
        url: url,
        method: 'GET',
    }, function(err, res, body) {
        if(err){
            logger.log(err);
            return callback(err, null);
        }

        return marc21Helper.parseBibliographicResources(body, function(err, result){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            for(var parentChild of result){
                for(var br of parentChild){
                    var type = br.type;
                    var ppn = "";
                    for(var identifier of br.getIdentifiersForType(type)){
                        br.status = enums.status.external;
                        if(identifier.scheme === enums.identifier.swbPpn){
                            ppn = identifier.literalValue;
                            br.pushIdentifierForType(type, {scheme: enums.identifier.swbUrl, literalValue: "http://swb.bsz-bw.de/DB=2.1/PPNSET?PPN=" + ppn});
                        }
                    }
                }
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