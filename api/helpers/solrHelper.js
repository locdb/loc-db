'use strict';
const SolrClient = require('solr-client');
const config = require('./../../config/config.js');
const marc21Helper = require('./../helpers/marc21Helper.js').createMarc21Helper();
const enums = require('./../schema/enum.json');
const logger = require('./../util/logger');
const async = require('async');
const Identifier = require('./../schema/identifier');


var SolrHelper = function(){
};



/**
 * Retrieves the top 5 records from gvi for a given query
 * @param query
 * @param callback
 */
SolrHelper.prototype.queryGVIByQueryString = function(query, callback){
    // Create client
    var client = SolrClient.createClient({
        host: config.GVI.HOST,
        port: config.GVI.PORT,
        core: config.GVI.CORE,
    });

    //if(query.indexOf('\"') < 0){
    //    logger.log("No quotation marks");
    //    query =query.replace(":","");
    //}
    query = encodeURIComponent(query);
    // Lucene query
    // add start=0?
    var q = client.createQuery()
        .q({allfields: query})
        .rows(10);

    client.search(q,function(err,result){
        if (err) {
            logger.error(err);
            return callback(err, null);
        }
        if (result.response) {
            logger.log(result.response);
            if (result.response.docs.length == 0) {
                return callback(null, []);
            } else {
                var xmlDocs = [];
                var additionalInformation = [];
                for (var doc of result.response.docs) {
                    xmlDocs.push(doc.fullrecord);
                    additionalInformation.push(doc.id);

                }
                async.map(xmlDocs,
                    function(xmlDoc, callback){
                        return marc21Helper.parseBibliographicResource(xmlDoc, 'marcxml', function (err, result) {
                            if (err) {
                                logger.error(err);
                                return callback(err, null);
                            }
                            return callback(null, result);
                        });
                    },
                    function(err, results) {
                        if (err) {
                            logger.error(err);
                            return callback(err, null);
                        }

                        for(var i=0; i < results.length; i++){
                            for(var j=0; j < results[i].length; j++) {
                                results[i][j].pushIdentifierForType(results[i][j].type, new Identifier({
                                    literalValue: additionalInformation[i],
                                    scheme: enums.identifier.gviId
                                }));
                            }
                        }
                        return callback(null, results);
                });
            }
        } else {
            return callback(null, []);
        }
    });
};



/**
 * Retrieves the top 5 records from k10plus zentral for a given query
 * @param query
 * @param callback
 */
SolrHelper.prototype.queryK10plusByQueryString = function(query, callback){
    // Create client
    var client = SolrClient.createClient({
        host: config.K10plus.HOST,
        port: config.K10plus.PORT,
        core: config.K10plus.CORE,
        path: config.K10plus.PATH
    });

    //if(query.indexOf('\"') < 0){
    //    query =query.replace(":","");
    //}
    query = encodeURIComponent(query);



    // Lucene query
    // add start=0?
    //var q = client.createQuery()
    //    .q({allfields: query})
    //    .dismax()
    //    .rows(10);

    //logger.log(q);
    var q = "q=allfields:"+query;
    logger.log(q);

    client.get("select", q, function(err,result){
    //client.search(q,function(err,result) {
        if (err) {
            logger.error(err);
            return callback(err, null);
        }
        //return callback(null, result);
        if (result.response) {
            if (result.response.docs.length == 0) {
                return callback(null, []);
            } else {
                var marcDocs = [];
                var additionalInformation = [];
                for (var doc of result.response.docs) {
                    marcDocs.push(doc.fullrecord);
                    additionalInformation.push(doc.id);

                }
                //return callback(null, xmlDocs);
                async.map(marcDocs,
                    function (marcDoc, callback) {
                        marcDoc = marcDoc.replace(/#29;/g, "\u001d");
                        marcDoc = marcDoc.replace(/#30;/g, "\u001e");
                        marcDoc = marcDoc.replace(/#31;/g, "\u001f");
                        return marc21Helper.parseBibliographicResource(marcDoc, 'marc', function (err, result) {
                            if (err) {
                                logger.log(err);
                                return callback(err, null);
                            }
                            return callback(null, result);
                        });
                    },
                    function (err, results) {
                        if (err) {
                            logger.log(err);
                            return callback(err, null);
                        }
                        for (var i = 0; i < results.length; i++) {
                            for (var j = 0; j < results[i].length; j++) {
                                results[i][j].pushIdentifierForType(results[i][j].type, new Identifier({
                                    literalValue: additionalInformation[i],
                                    scheme: enums.identifier.k10plusId
                                }));
                            }
                        }
                        return callback(null, results);
                    });
            }
        } else {
            return callback(null, []);
        }
    });
};


/**
 * Factory function
 *
 * @returns {SwbHelper}
 */
function createSolrHelper() {
    return new SolrHelper();
}


module.exports = {
    createSolrHelper : createSolrHelper
};