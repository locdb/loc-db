'use strict';

const fetch = require('isomorphic-fetch');
const SparqlHttp = require('sparql-http-client');
SparqlHttp.fetch = fetch;
const parseXML = require('xml2js').parseString;

var OpenCitationsHelper = function(){
};


OpenCitationsHelper.prototype.query = function(title, callback){
    var endpoint = new SparqlHttp({endpointUrl: 'http://w3id.org/oc/sparql'});
    //title = title.toLowerCase();
    
    //    var queryString = 
    //        `PREFIX cito: <http://purl.org/spar/cito/>
    //        PREFIX fabio: <http://purl.org/spar/fabio/>
    //        PREFIX dcterms: <http://purl.org/dc/terms/>
    //        PREFIX datacite: <http://purl.org/spar/datacite/>
    //        PREFIX literal: <http://www.essepuntato.it/2010/06/literalreification/>
    //        PREFIX biro: <http://purl.org/spar/biro/>
    //        PREFIX frbr: <http://purl.org/vocab/frbr/core#>
    //        PREFIX c4o: <http://purl.org/spar/c4o/>
    //        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    //        SELECT ?br ?title WHERE {
    //        ?br rdf:type fabio:Expression;
    //        dcterms:title ?title.
    //        FILTER (CONTAINS(LCASE(?title), "`
    //        + title +
    //        `"))
    //        }`;
    var queryString = 
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

    endpoint.getQuery(queryString).then(function (res) {
        return res.text();
    }).then(function (body) {
        console.log(body);
        parseXML(body, function (err, result) {
            if(err){
                console.log(err);
                return;
            }
            callback(result);
        });
        
    }).catch(function (err) {
        console.error(err);
    });
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