'use strict';
const request = require('ajax-request');
const config = require('./../../config/config.js');
const marc21Helper = require('./../helpers/marc21Helper.js').createMarc21Helper();
const enums = require('./../schema/enum.json');
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');

var GVIHelper = function(){
};



/**
 * Retrieves the top 5 records from gvi for a given query
 * @param query
 * @param callback
 */
GVIHelper.prototype.queryByQueryString = function(query, callback){
/*    var url = config.URLS.SWB
        + '?query=pica.all%3D"'
        + query
        + '"&version=1.1&operation=searchRetrieve&recordSchema=marc21'
        + '&maximumRecords=5&recordPacking=xml';
    request({
        url: url,
        method: 'GET',
    }, function (err, res, body) {
        if (err) {
            logger.log(err);
            return callback(err, null);
        }

        return marc21Helper.parseBibliographicResources(body, function (err, result) {
            if (err) {
                logger.error(err);
                return callback(err, null);
            }
            for (var parentChild of result) {
                for (var br of parentChild) {
                    var type = br.type;
                    var ppn = "";
                    for (var identifier of br.getIdentifiersForType(type)) {
                        br.status = enums.status.external;
                        if (identifier.scheme === enums.identifier.swb_ppn) {
                            ppn = identifier.literalValue;
                            br.pushIdentifierForType(type, {
                                scheme: enums.externalSources.swb,
                                literalValue: "http://swb.bsz-bw.de/DB=2.1/PPNSET?PPN=" + ppn
                            });
                        }
                    }
                }
            }
            return callback(null, result);
        });
    });*/
};

/**
 * Factory function
 *
 * @returns {SwbHelper}
 */
function createGVIHelper() {
    return new GVIHelper();
}


module.exports = {
    createGVIHelper : createGVIHelper
};