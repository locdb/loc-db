'use strict';

const fetch = require('isomorphic-fetch');
const SparqlHttp = require('sparql-http-client');
SparqlHttp.fetch = fetch;
const parseXML = require('xml2js').parseString;
const BibliographicResourceOC = require('./../schema/bibliographicResourceOpenCitations.js');
const BibliographicResource = require('./../schema/bibliographicResource.js');
const Identifier = require('./../schema/identifier');
const logger = require('./../util/logger');
const mongoose = require('mongoose');
const request = require('request');
const config = require('./../../config/config');
const enums = require('./../schema/enum.json');
const cachedRequest = require('cached-request')(request);
const async = require('async');
cachedRequest.setCacheDirectory(config.PATHS.CACHE);
const endpoint = new SparqlHttp({endpointUrl: config.URLS.OPEN_CITATIONS_SPARQL});

var OpenCitationsHelper = function(){
};

OpenCitationsHelper.prototype.queryByQueryString = function(query, callback){
    let self = this;
    let sparqlQuery =
        `
        PREFIX cito:<http://purl.org/spar/cito/>
        PREFIX dcterms:<http://purl.org/dc/terms/>
        PREFIX datacite:<http://purl.org/spar/datacite/>
        PREFIX literal:<http://www.essepuntato.it/2010/06/literalreification/>
        PREFIX biro:<http://purl.org/spar/biro/>
        PREFIX frbr:<http://purl.org/vocab/frbr/core#>
        PREFIX c4o:<http://purl.org/spar/c4o/>
        PREFIX bds:<http://www.bigdata.com/rdf/search#>
        PREFIX fabio:<http://purl.org/spar/fabio/>
        PREFIX pro:<http://purl.org/spar/pro/>
        PREFIX oco:<https://w3id.org/oc/ontology/>
        PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX prism:<http://prismstandard.org/namespaces/basic/2.0/>
        SELECT DISTINCT ?iri ?doi ?short_iri ?short_iri_id ?browser_iri ?title ?subtitle ?year ?type ?short_type ?label ?author ?author_browser_iri 
            (COUNT(distinct ?cites) AS ?out_cits) 
            (COUNT(distinct ?cited_by) AS ?in_cits) 
            (count(?next) as ?tot)   
            Where{
                { { ?lit bds:search '`
        + query +
        `' . 
                ?lit bds:matchAllTerms 'true' . 
                ?lit bds:relevance ?score . 
                ?lit bds:minRelevance '0.2' . 
                ?lit bds:maxRank '300' . 
                {?iri dcterms:title  ?lit } 
                UNION {?iri fabio:hasSubtitle ?lit} }}           
                {              ?iri rdf:type ?type .
                OPTIONAL {?iri cito:cites ?cites .}
                OPTIONAL {?cited_by cito:cites ?iri .}
                BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/corpus/', '', 'i') as ?short_iri) .
                BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/corpus/br/', '', 'i') as ?short_iri_id) .
                BIND(REPLACE(STR(?iri), '/corpus/', '/browser/', 'i') as ?browser_iri) .
                OPTIONAL {?iri dcterms:title ?title .}
                BIND(REPLACE(STR(?type), 'http://purl.org/spar/fabio/', '', 'i') as ?short_type) .
                OPTIONAL {?iri fabio:hasSubtitle ?subtitle .}
                OPTIONAL {?iri prism:publicationDate ?year .}
                OPTIONAL {
                ?iri datacite:hasIdentifier [
                    datacite:usesIdentifierScheme datacite:doi ;
                    literal:hasLiteralValue ?doi                       
                    ]                
                }           
                }{?iri rdfs:label ?label .
                OPTIONAL {
                ?iri pro:isDocumentContextFor ?role . 
                ?role pro:withRole pro:author ; pro:isHeldBy [
                foaf:familyName ?f_name ;
                foaf:givenName ?g_name
                ] . 
                ?role pro:isHeldBy ?author_iri .
                OPTIONAL {
                ?role oco:hasNext* ?next .} 
                BIND(REPLACE(STR(?author_iri), '/corpus/', '/browser/', 'i') as ?author_browser_iri) .
                BIND(CONCAT(?g_name,' ',?f_name) as ?author) .			               }           }   } 
                GROUP BY ?iri ?doi ?short_iri ?short_iri_id ?browser_iri ?title ?subtitle ?year ?type ?short_type ?label ?author ?author_browser_iri ORDER BY DESC(?tot)
`
    endpoint.getQuery(sparqlQuery).then(function (res) {
        return res.text();
    }).then(function (body) {
        self.parseOCResult(body, function(err, result){
            if(err){
                logger.error(err);
                return callback(err, null)
            }
            return callback(null, result);
        });
    }).catch(function (err) {
        return callback(err, null);
    });
};

OpenCitationsHelper.prototype.queryByTitle = function(title, callback){
    let self = this;
    let sparqlQuery =
            `PREFIX cito: <http://purl.org/spar/cito/>
            PREFIX fabio: <http://purl.org/spar/fabio/>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX datacite: <http://purl.org/spar/datacite/>
            PREFIX literal: <http://www.essepuntato.it/2010/06/literalreification/>
            PREFIX biro: <http://purl.org/spar/biro/>
            PREFIX frbr: <http://purl.org/vocab/frbr/core#>
            PREFIX c4o: <http://purl.org/spar/c4o/>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            SELECT ?br ?title ?identifier WHERE {
            ?br rdf:type fabio:Expression;
            dcterms:title ?title;
            dcterms:title"`
            + title +
            `".
            }`;

    endpoint.getQuery(sparqlQuery).then(function (res) {
        return res.text();
    }).then(function (body) {
        self.parseOCResult(body, function(err, result){
            return callback(null, result);
        });
    }).catch(function (err) {
        return callback(err, null);
    });
};

// TODO: This is not efficient; We should use bindings instead of following the links
OpenCitationsHelper.prototype.parseOCResult = function(xmlString, callback){
    var self = this;
    parseXML(xmlString, function (err, result) {
        if(err){
            console.log(err);
            return callback(err, null);
        }
        async.map(result.sparql.results[0].result[0].binding, function(binding, cb){
            if(binding.$.name === 'br' || binding.$.name === "iri"){
                // we found a bibliographic resource; now the tedious work: parsing and traversing the rdf graph
                let identifier = new Identifier({scheme: enums.identifier.ocUri, literalValue: binding.uri[0]});
                let url = identifier.literalValue + ".json";
                return cachedRequest({'url': url}, function(err, res, body) {
                    let jsonObject = JSON.parse(body);
                    self.convertOCType(jsonObject[0]["@type"], function(err,type){
                        if(err){
                            logger.error(err);
                            return cb(err, null);
                        }
                        if(type){
                            // create bibliographic resource in "our" data format
                            let br = new BibliographicResource({type: type});

                            // don't forget to save the oc corpus uri
                            br.pushIdentifierForType(br.type, identifier);

                            // extract title
                            let title = jsonObject[0]["http://purl.org/dc/terms/title"][0]["@value"];
                            br.setTitleForType(br.type, title);

                            // we furthermore extract the identifiers
                            async.map(jsonObject[0]["http://purl.org/spar/datacite/hasIdentifier"], function(id, cb){
                                let url = id["@id"] + ".json";
                                cachedRequest({'url': url}, function(err, res, body) {
                                    let identifierObject = JSON.parse(body);
                                    let scheme = identifierObject[0]["http://purl.org/spar/datacite/usesIdentifierScheme"] ? identifierObject[0]["http://purl.org/spar/datacite/usesIdentifierScheme"] : identifierObject[1]["http://purl.org/spar/datacite/usesIdentifierScheme"];
                                    self.convertOCType([scheme[0]["@id"]], function(err, scheme){
                                        let literalValue = identifierObject[0]["http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue"] ? identifierObject[0]["http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue"][0]["@value"] : identifierObject[1]["http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue"][0]["@value"];
                                        let identifier = new Identifier({scheme: scheme, literalValue: literalValue});
                                        return cb(null, identifier)
                                    });
                                });
                            }, function(err, res){
                                if(err){
                                    logger.error(err);
                                    return callback(err, null)
                                }
                                for(let identifier of res){
                                    br.pushIdentifierForType(br.type, identifier);
                                }
                                return cb(err, br);
                            });
                        }else{
                            return cb(null, null);
                        }
                    });
                });
            }else{
                return cb(null, null);
            }
        }, function(err, result){
           result = result.filter(x => x);
           return callback(err,result);
        });
    });
};

OpenCitationsHelper.prototype.convertOCType = function(ocTypes, callback){
    async.map(ocTypes, function(type, cb){
        switch(type){
            case "http://purl.org/spar/fabio/Journal":
                return cb(null, enums.resourceType.journal);
                break;
            case "http://purl.org/spar/fabio/JournalArticle":
                return cb(null, enums.resourceType.journalArticle);
            case "http://purl.org/spar/datacite/issn":
                return cb(null, enums.identifier.issn);
                break;
            default:
                return cb(null, null);
        }
    }, function(err, result){
        if(err){
            logger.error(err);
            return callback(err, null);
        }
        for(let res of result){
            if(res){
                return callback(null, res);
            }
        }
        return callback(null, null);
    });
};


OpenCitationsHelper.prototype.convertInternalBR2OC = function(br, callback){
    var self = this;
    // conversion for access to helper functions
    var br = new BibliographicResource(br);

    if(br.partOf && br.partOf != ""){
        // The resource is a child resource; we can directly map it to a single br
        self._convertInternalBR2OCSimple(br, null, function(err, child){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            return callback(null, [child]);
        });
    }else{
        // The resource is a container resource; we have to create 1-3 brs out of it
        // the most lower level resource is the one associated with the type
        self._convertInternalBR2OCSimple(br, null, function(err, lowest){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            // at this point in time, at most 2 levels are left to convert
            // we should now collect the types and guess the order
            var types = br.getAllTypesOfThis();

            var index = types.indexOf(lowest.type);
            if (index > -1) {
                types.splice(index, 1);
            }
            // if the types array is now of length 0, we are done
            // else we have to specify the order of the two types correctly
            // important: we need artificial identifiers
            if(types.length === 0){
                return callback(null, [lowest]);
            }else {
                async.map(types, function (type, cb) {
                        self._convertInternalBR2OCSimple(br, type, function (err, br) {
                            if (err) {
                                logger.error(err);
                                return cb(err, null);
                            }
                            return cb(null, br);
                        });
                    },
                    function (err, brs) {
                        if (err) {
                            logger.error(err);
                            return callback(err, null);
                        }
                        // create artificial ids for all of them
                        for(var br of brs){
                            br._id = mongoose.Types.ObjectId();
                        }
                        if (brs.length === 1) {
                            // create artificial ids for all of
                            lowest.partOf = brs[0]._id;
                            return callback(null, [lowest, brs[0]]);
                        } else if (brs.length === 2) {
                            // decide the order!!!!
                            var container1 = br.getContainerTypeForType(brs[0].type);
                            var container2 = br.getContainerTypeForType(brs[1].type);
                            if (container1[0] === brs[1].type) {
                                // types 1 is the parent
                                brs[0].partOf = brs[1]._id;
                                lowest.partOf = brs[0]._id;
                                return callback(null, [lowest, brs[0], brs[1]]);
                            } else if (container2[0] === brs[0].type) {
                                // types 0 is the parent
                                brs[1].partOf = brs[0]._id;
                                lowest.partOf = brs[1]._id;
                                return callback(null, [lowest, brs[1], brs[0]]);
                            } else if (container1.length > 1 && container1[1] === brs[1].type) {
                                // types 1 is the parent
                                brs[0].partOf = brs[1]._id;
                                lowest.partOf = brs[0]._id;
                                return callback(null, [lowest, brs[0], brs[1]]);
                            } else if (container2.length > 1 && container2[1] === brs[0].type) {
                                // types 0 is the parent
                                brs[1].partOf = brs[0]._id;
                                lowest.partOf = brs[1]._id;
                                return callback(null, [lowest, brs[1], brs[0]]);
                            } else if (container1.length > 2 && container1[2] === brs[1].type) {
                                // types 1 is the parent
                                brs[0].partOf = brs[1]._id;
                                lowest.partOf = brs[0]._id;
                                return callback(null, [lowest, brs[0], brs[1]]);
                            } else if (container2.length > 2 && container2[2] === brs[0].type) {
                                // types 0 is the parent
                                brs[1].partOf = brs[0]._id;
                                lowest.partOf = brs[1]._id;
                                return callback(null, [lowest, brs[1], brs[0]]);
                            } else {
                                // arbitrary order
                                logger.error("Problems deciding order of types: " + types);
                                // types 1 is the parent
                                brs[0].partOf = brs[1]._id;
                                lowest.partOf = brs[0]._id;
                                return callback(null, [lowest, brs[0], brs[1]]);
                            }

                        }else{
                            return callback(new Error("Problem with conversion."), null);
                        }
                    }
                );
            }
        });
    }
};


OpenCitationsHelper.prototype._convertInternalBR2OCSimple = function(br, type, callback){
    var types = br.getAllTypes();
    if(!type || types.indexOf(type) === -1){
        var ocBr = new BibliographicResourceOC({
            identifiers: br.getIdentifiersForType(br.type),
            type: br.type,
            title: br.getTitleForType(br.type),
            subtitle: br.getSubtitleForType(br.type),
            edition: br.getEditionForType(br.type),
            number: br.getNumberForType(br.type),
            contributors: br.getContributorsForType(br.type),
            publicationDate: br.getPublicationDateForType(br.type),
            status: br.status,
            cites: br.cites,
            partOf: br.partOf,
            parts: br.parts,
            embodiedAs: br.getResourceEmbodimentsForType(br.type),
        });
    }else{
        var ocBr = new BibliographicResourceOC({
            identifiers: br.getIdentifiersForType(type),
            type: type,
            title: br.getTitleForType(type),
            subtitle: br.getSubtitleForType(type),
            edition: br.getEditionForType(type),
            number: br.getNumberForType(type),
            contributors: br.getContributorsForType(type),
            publicationDate: br.getPublicationDateForType(type),
            embodiedAs: br.getResourceEmbodimentsForType(type),
        });
    }

    return callback(null, ocBr);
};


/**
 * Factory function
 *
 * @returns {OpenCitationsHelper}
*/
function createOpenCitationsHelper() {
    return new OpenCitationsHelper();
}


module.exports = {
        createOpenCitationsHelper : createOpenCitationsHelper
};