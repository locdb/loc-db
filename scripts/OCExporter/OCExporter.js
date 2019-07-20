"use strict";

const fs = require('fs');
const pth = require('path');
const async = require('async');
const fh = require('../../api/helpers/fileHelper.js').createFileHelper();
const BibliographicResource = require("./../../api/schema/bibliographicResource");
const BibliographicEntry = require("./../../api/schema/bibliographicEntry");
const ResourceEmbodiment = require("./../../api/schema/resourceEmbodiment");
const Identifier = require("./../../api/schema/identifier");
const enums = require("../../api/schema/enum.json");

const N3 = require('n3');
const N3Util = N3.Util;
const jsonld = require('jsonld');

const INT = "http://www.w3.org/2001/XMLSchema#integer";

const a = "rdf:type";

var OCExporter = function(){
}


OCExporter.prototype.addTriple = function(subject, predicate, object) {
    if (!object) {
        // console.log("No value for " + subject + " / " + predicate);
        return;
    }
    subject = this.expand(subject);
    predicate = this.expand(predicate);
    object = this.expand(object);
    return this.store.addQuad(subject, predicate, object);
};

OCExporter.prototype.expand = function(qname) {
    var uri;
    if (typeof qname.getFullYear === 'function') {
        // years are entered as dates with fixed month=1 and date=1
        if (qname.getMonth() == 0 && qname.getDate() == 1) {
            qname = qname.getFullYear();
        } else {
            qname = qname.toISOString().split('T')[0];
        }
    }
    if(typeof qname == 'number'){
        qname = qname.toString();
    }
    uri = qname;
    try {
        //console.log(typeof(qname));
        if (typeof(qname) == "object") {
            return N3.DataFactory.literal("" + qname);
        }
        var parts = qname.split(":");
        if (prefixes.hasOwnProperty(parts[0])) {
            uri = prefixes[parts[0]] + parts[1];
        }
        // uri = N3Util.expandQName(uri, this.prefixes);
    } catch (_error) {
        console.log(qname)
        throw(_error);
    }
    if (!uri.match(/^https?:/)) {
        return N3.DataFactory.literal(uri);
    }
    // Because the uri is represented within <...>, it cannot
    // itself contain these symbols and we have to escape them,
    // e.g. uri = "http://dx.doi.org/10.1002/(sici)1520-6793(199609)13:6<571::aid-mar3>3.0.co;2-5"
    uri = uri.replace("<", "%3C").replace(">", "%3E");
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
    "literal": "http://www.essepuntato.it/2010/06/literalreification/",
    "fabio": "http://purl.org/spar/fabio/",
    "doco": "http://purl.org/spar/doco/",
    "pro": "http://purl.org/spar/pro/"
};


OCExporter.prototype.store = new N3.Store({prefixes: prefixes});



OCExporter.prototype.result = {};


OCExporter.prototype.typeUri = function(type) {
    for (var key in enums.resourceType) {
        if (enums.resourceType[key] == type) {
            return enums.ocType[key];
        }
    }
};

OCExporter.prototype.clear = function() {
    this.store = new N3.Store({prefixes: prefixes});
};

OCExporter.prototype.addIdentifiers = function(subject, identifiers) {
    var idnum = 1;
    for (var ident of identifiers) {
        ident = new Identifier(ident);
        var ident_id = subject + "_id_" + idnum;
        idnum += 1;
        this.addTriple(subject, "http://purl.org/spar/datacite/hasIdentifier", ident_id);
        this.addTriple(ident_id, "http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue", ident.literalValue);
        this.addTriple(ident_id, "http://purl.org/spar/datacite/usesIdentifierScheme", ident.scheme);
    }

}

OCExporter.prototype.convertFile = function(path, maximum, callback) {
    var brs = JSON.parse(fs.readFileSync(path));
    var count = 0;
    for (var br of brs) {
        count++;
        if (maximum && count > maximum) break;
        br = new BibliographicResource(br);
        if (!br._id) {
          console.log("WARNING: No _id found\n", JSON.stringify(br));
          continue;
        }
        var subj = "https://w3id.org/oc/corpus/br/0130-" + br._id;
        this.addTriple(subj, a, this.typeUri(br.type));
        this.addTriple(subj, "dcterms:title", br.getTitleForType(br.type));
        this.addTriple(subj, "http://purl.org/spar/fabio/hasSubtitle", br.getSubtitleForType(br.type));
        this.addTriple(subj, "http://prismstandard.org/namespaces/basic/2.0/edition", br.getEditionForType(br.type));
        this.addTriple(subj, "http://purl.org/spar/fabio/hasSequenceIdentifier", br.getNumberForType(br.type));
        this.addTriple(subj, "http://prismstandard.org/namespaces/basic/2.0/publicationDate", br.getPublicationDateForType(br.type));
        this.addTriple(subj, "http://www.w3.org/ns/prov#hadPrimarySource", br.source);
        if (br.partOf) {
            this.addTriple(subj, "http://purl.org/vocab/frbr/core#partOf", "https://w3id.org/oc/corpus/br/0130-" + br.partOf);
        }

        if (br.type === "JOURNAL_ISSUE") {
            var current = subj;
            if (br.journalVolume_number) {
                var volume = subj + "_volume";
                this.addTriple(subj, "http://purl.org/vocab/frbr/core#partOf", volume);
                this.addTriple(volume, a, "http://purl.org/spar/fabio/JournalVolume");
                this.addTriple(volume, "http://purl.org/spar/fabio/hasSequenceIdentifier", br.journalVolume_number);
                current = volume;
            }
            if (br.journal_title) {
                var journal = subj + "_journal";
                this.addTriple(current, "http://purl.org/vocab/frbr/core#partOf", journal);
                this.addTriple(journal, a, "http://purl.org/spar/fabio/Journal");
                this.addTriple(journal, "dcterms:title", br.journal_title);
            }
        }


        var emb_no = 1;
        for (var embod of br.getResourceEmbodimentsForType(br.type)) {
            embod = new ResourceEmbodiment(embod);
            var embid = subj + "_embodiment_" + emb_no;
            emb_no += 1;
            this.addTriple(subj, "http://purl.org/vocab/frbr/core#embodiment", embid);
            this.addTriple(embid, a, "fabio:Manifestation");
            this.addTriple(embid, "http://prismstandard.org/namespaces/basic/2.0/startingPage", embod.firstPage);
            this.addTriple(embid, "http://prismstandard.org/namespaces/basic/2.0/endingPage", embod.lastPage);
            this.addTriple(embid, "http://purl.org/dc/terms/format", embod.format);
            this.addTriple(embid, "http://www.w3.org/ns/dcat#landingPage", embod.url);

        }

        this.addIdentifiers(subj, br.getIdentifiersForType(br.type));

        for (var citation of br.cites) {
            this.addTriple(subj, "http://purl.org/spar/cito/cites", "https://w3id.org/oc/corpus/br/0130-" + citation);
        }

        for (var part of br.parts) {
            part = new BibliographicEntry(part);
            if (part._id) { // TODO handle these cases properly; what are the cases w/o an _id?
                var partid = part._id + "_entry";
                this.addTriple(subj, "http://purl.org/vocab/frbr/core#part", partid);
                this.addTriple(partid, "http://purl.org/spar/c4o/hasContent", part.bibliographicEntryText);
                this.addTriple(partid, "http://purl.org/spar/biro/references", part.references);
                this.addIdentifiers(partid, part.identifiers);
            }
        }


        var prev = null;
        var contr_nr = 1;
        if(br.getContributorsForType(br.Type)){
            for (var contr of br.getContributorsForType(br.type)) {
                var contr_id = subj + "_contributor_" + contr_nr;
                contr_nr += 1;
                var role = contr_id + "_role";
                var agent = contr_id + "_agent";
                var roleType = "http://purl.org/spar/pro/" + contr.roleType.toLowerCase();
                this.addTriple(subj, "pro:isDocumentContextFor", role);
                this.addTriple(role, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "http://purl.org/spar/pro/RoleInTime");
                this.addTriple(role, "http://www.w3.org/2000/01/rdf-schema#label", "Agent role for: " + contr_id);
                this.addTriple(role, "http://purl.org/spar/pro/isHeldBy", agent);
                this.addTriple(agent, "http://purl.org/spar/pro/withRole", roleType);
                this.addTriple(agent, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "http://xmlns.com/foaf/0.1/Agent");
                this.addTriple(agent, "http://xmlns.com/foaf/0.1/givenName", contr.heldBy.givenName);
                this.addTriple(agent, "http://xmlns.com/foaf/0.1/familyName", contr.heldBy.familyName);
                if (prev != null) {
                    this.addTriple(prev, "https://w3id.org/oc/ontology/hasNext", role);
                    prev = role;
                }
            }
        }
    }
    callback(null);
};

OCExporter.prototype.getNQUADS = function(callback) {
    var writer = new N3.Writer({prefixes: prefixes, format: "N-Quads"});
    writer.addQuads(this.store.getQuads());
    writer.end(function(err, res) {
        if (err) console.log("ERROR in getNQUADS-writer\n", err);
        callback(null, res);
    });
};

OCExporter.prototype.getJSONLD = function(callback) {
    this.getNQUADS(function(err, nquads) {
        if (err) console.log("ERROR in getJSONLD-getNQUADS\n", err);
        jsonld.fromRDF(nquads, {format: 'application/n-quads'}, function(err2, jsonDoc) {
            if (err2) console.log("ERROR in getJSONLD-getNQUADS-fromRDF\n", err2);
            jsonld.compact(jsonDoc, require("./context.json"), function(err3, jsonCompactDoc) {
                if (err3) console.log("ERROR in getJSONLD-getNQUADS-fromRDF-compact\n", err3);
                jsonCompactDoc["@context"] = "https://w3id.org/oc/corpus/context.json";
                callback(null, jsonCompactDoc);
            });
        });
    });
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
