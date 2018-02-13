'use strict';
const SolrClient = require('solr-client');
const config = require('./../../config/config.js');
const marc21Helper = require('./../helpers/marc21Helper.js').createMarc21Helper();
const enums = require('./../schema/enum.json');
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');
const async = require('async');

var GVIHelper = function(){
};



/**
 * Retrieves the top 5 records from gvi for a given query
 * @param query
 * @param callback
 */
GVIHelper.prototype.queryByQueryString = function(query, callback){
    // Create client
    var client = SolrClient.createClient({
        host: config.GVI.HOST,
        port: config.GVI.PORT,
        core: config.GVI.CORE,
    });

    // Lucene query
    // add start=0?
    var q = client.createQuery()
        .q({allfields: query})
        .rows(5);

    client.search(q,function(err,result){
        if (err) {
            logger.log(err);
            return callback(err, null);
        }
        if (result.response) {
            if (result.response.docs.length == 0) {
                return callback(null, []);
            } else {
                var xmlDocs = [];
                for (var doc of result.response.docs) {
                    xmlDocs.push(doc.fullrecord);
                }
                async.map(xmlDocs,
                    function(xmlDoc, callback){
                        return marc21Helper.parseBibliographicResource(xmlDoc, function (err, result) {
                            if (err) {
                                logger.log(err);
                                return callback(err, null);
                            }
                            return callback(null, result);
                        });
                    },
                    function(err, results) {
                        if (err) {
                            logger.log(err);
                            return callback(err, null);
                        }
                        return callback(null, results);
                });
            }
        } else {
            return callback(null, []);
        }
    });
/*    var client = new SolrNode({
        host: config.GVI.HOST,
        port: config.GVI.PORT,
        protocol: config.GVI.PROTOCOL,
        core: config.GVI.CORE
        //rootPath: config.GVI.ROOTPATH
    });



    // TODO: Do we want to have a structured query?
    // From GVI solr schema.xml:
    // <!-- Vereinfachte SuchFelder für minimalistische Anwendungen -->
    // <!-- Alle Textfelder ohne Normdaten  fehlertolerant aufgearbeitet. -->
    // <field name="allfields"               type="text_fuzzy" />
    var q = client.query().q({allfields: query}).rows(5);

    return client.search(q, function (err, result) {
        if (err) {
            logger.log(err);
            return callback(err, null);
        }
        if (result.response) {
            if (result.response.docs.length == 0) {
                return callback(null, []);
            } else {
                var xmlDocs = [];
                for (var doc of result.response.docs) {
                    xmlDocs.push(doc.fullrecord);
                }
                return marc21Helper.extractData(xmlDocs, null, function (err, result) {
                    if (err) {
                        logger.log(err);
                        return callback(err, null);
                    }
                    return callback(null, result);
                });
            }
        } else {
            return callback(null, []);
        }
    });*/
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