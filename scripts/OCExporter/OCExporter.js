"use strict";

const fs = require('fs');
const pth = require('path');
const async = require('async');
const fh = require('../../api/helpers/fileHelper.js').createFileHelper();

const N3 = require('n3');
const N3Util = N3.Util;
const jsonld = require('jsonld');

const INT = "http://www.w3.org/2001/XMLSchema#integer";

const a = "rdf:type";

var OCExporter = function(){
}


OCExporter.prototype.addTriple = function(subject, predicate, object) {
    subject = this.expand(subject);
    predicate = this.expand(predicate);
    object = this.expand(object);
    return this.writer.addQuad(subject, predicate, object);
};

OCExporter.prototype.expand = function(qname) {
    var uri;
    uri = qname;
    try {
        var parts = qname.split(":");
        if (prefixes.hasOwnProperty(parts[0])) {
            uri = prefixes[parts[0]] + parts[1];
        }
        // uri = N3Util.expandQName(uri, this.prefixes);
    } catch (_error) {
        throw(_error);
    }
    if (uri.indexOf(":") == -1) {
        return N3.DataFactory.literal(uri);
    }
    return N3.DataFactory.namedNode(uri);
};

OCExporter.prototype.literal = function(literal, langOrType) {
    var res;
    if (langOrType == null) {
        langOrType = null;
    }
    res = '"' + literal + '"';
    if (langOrType === null) {
        return res;
    }
    if (langOrType.length === 2) {
        return res += "@" + langOrType;
    } else {
        return res += "^^<" + langOrType + ">";
    }
};

const prefixes = {
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "owl": "http://www.w3.org/2002/07/owl#",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "dcterms": "http://purl.org/dc/terms/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "dbp": "http://dbpedia.org/property/",
    "dbo": "http://dbpedia.org/ontology/",
    "dbpedia": "http://dbpedia.org/resource/",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "jl": "http://data.judaicalink.org/ontology/",
    "datacite": "http://purl.org/spar/datacite/",
    "literal": "http://www.essepuntato.it/2010/06/literalreification/"
};


OCExporter.prototype.writer = new N3.Writer({prefixes: prefixes, format: 'N-Quads'});




OCExporter.prototype.result = {};


OCExporter.prototype.getJSONLD = function(nquads, callback) {

    jsonld.fromRDF(nquads, {format: 'application/n-quads'}, function(err, doc) {
           jsonld.compact(doc, require("./context.json"), function(err, doc) {
               doc["@context"] = "https://w3id.org/oc/corpus/context.json";
               callback(null, doc);
           });
        });

}

OCExporter.prototype.parseFile = function(path, callback) {
    var brs = JSON.parse(fs.readFileSync(path));
    console.log(brs.length);

    var count = 0;
    var result = []
    for (var br of brs) {
        var oc = {}
        result.push(oc)
        count++;
        console.log(count + " " + JSON.stringify(oc));
        if (count > 10) {
            break;
        }
    }

    callback(result);
};




/**
 * Factory function
 *
 * @returns {OCExporter}
 */
function createOCExporter() {
    return new OCExporter();
}


module.exports = {
    createOCExporter : createOCExporter
};
