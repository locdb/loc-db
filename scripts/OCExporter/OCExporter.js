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

/*
  This converts the local id consisting of a 24-digit hexadecimal number in 
  a string into a 48-digital decimal representation (each digit is converted).
  Example: convertLocalId("5bab9d7ec3bd212c24356330")
  = "051110110913071412031113020102120204030506030300"
  Moreover, with base parameter it prefixes it correctly.
*/
OCExporter.prototype.convertLocalId = function(id, base) {
    if (!id) return false;
    var localId = id.split('') // split into digits
                .map(x => parseInt(x, 16)) // convert each digit
                .map(y => ('0' + y).slice(-2)) // fill with a zero if needed
                .join('');
    if (base) {
        localId = "https://w3id.org/oc/corpus/"+ base + "/0130" + localId;
    }
    return localId;
}

OCExporter.prototype.idSuffix = function(type) {
    switch (type) {
        case "volume":
            return "01";
            break;
        case "journal":
            return "02";
            break;
        default:
            console.log("WARNING: Unknown type", type);
            return "TODO";
    };
}

OCExporter.prototype.addIdentifiers = function(subject, identifiers) {
    for (var ident of identifiers) {
        var ident_id = this.convertLocalId(ident._id, "id");
        if (ident_id) {
            this.addTriple(subject, "http://purl.org/spar/datacite/hasIdentifier", ident_id);
            this.addTriple(ident_id, a, "http://purl.org/spar/datacite/ResourceIdentifier");
            this.addTriple(ident_id, "http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue", ident.literalValue);
            this.addTriple(ident_id, "http://purl.org/spar/datacite/usesIdentifierScheme", ident.scheme);
        } else {
            console.log("WARNING: No id found for identifier", ident);
        }
    }
}

OCExporter.prototype.convertFile = function(path, maximum, callback) {
    var brs = JSON.parse(fs.readFileSync(path));
    var count = 0;
    for (var br of brs) {
        // example data for two journal articles
        // if (!["5a2180069052ca4625c5bcb5", "5bab9d7ec3bd212c24356330", "5a21811d9052ca4625c5bd0c", "5c17531db803eb229c526a72"].includes(br._id)) continue;
        count++;
        if (maximum && count > maximum) break;
        var rawBr = br;
        br = new BibliographicResource(br);
        if (!br._id) {
          console.log("WARNING: No _id found\n", JSON.stringify(br));
          continue;
        }
        var subj = this.convertLocalId(br._id, "br");
        var prefixForType = br.type.toLowerCase().replace(/(_[a-z])/, function(c) {
            return c.replace('_', '').toUpperCase();
        });
        
        this.addTriple(subj, a, this.typeUri(br.type));
        this.addTriple(subj, "dcterms:title", br.getTitleForType(br.type));
        this.addTriple(subj, "http://purl.org/spar/fabio/hasSubtitle", br.getSubtitleForType(br.type));
        this.addTriple(subj, "http://prismstandard.org/namespaces/basic/2.0/edition", br.getEditionForType(br.type));
        this.addTriple(subj, "http://purl.org/spar/fabio/hasSequenceIdentifier", br.getNumberForType(br.type));
        this.addTriple(subj, "http://prismstandard.org/namespaces/basic/2.0/publicationDate", br.getPublicationDateForType(br.type));
        this.addTriple(subj, "http://www.w3.org/ns/prov#hadPrimarySource", br.source);
        if (br.partOf) {
            this.addTriple(subj, "http://purl.org/vocab/frbr/core#partOf", this.convertLocalId(br.partOf, "br"));
        }

        if (br.type === "JOURNAL_ISSUE") {
            var current = subj;
            if (br.journalVolume_number) {
                var volume = subj + this.idSuffix("volume");
                this.addTriple(subj, "http://purl.org/vocab/frbr/core#partOf", volume);
                this.addTriple(volume, a, "http://purl.org/spar/fabio/JournalVolume");
                this.addTriple(volume, "http://purl.org/spar/fabio/hasSequenceIdentifier", br.journalVolume_number);
                current = volume;
            }
            if (br.journal_title) {
                var journal = subj + this.idSuffix("journal");
                this.addTriple(current, "http://purl.org/vocab/frbr/core#partOf", journal);
                this.addTriple(journal, a, "http://purl.org/spar/fabio/Journal");
                this.addTriple(journal, "dcterms:title", br.journal_title);
            }
        }
        
        for (var embod of rawBr[prefixForType + "_embodiedAs"]) {
            var embid = this.convertLocalId(embod._id, "re");
            this.addTriple(subj, "http://purl.org/vocab/frbr/core#embodiment", embid);
            this.addTriple(embid, a, "fabio:Manifestation");
            this.addTriple(embid, "http://prismstandard.org/namespaces/basic/2.0/startingPage", embod.firstPage);
            this.addTriple(embid, "http://prismstandard.org/namespaces/basic/2.0/endingPage", embod.lastPage);
            this.addTriple(embid, "http://purl.org/dc/terms/format", embod.format);
            this.addTriple(embid, "http://www.w3.org/ns/dcat#landingPage", embod.url);
        }

        this.addIdentifiers(subj, rawBr[prefixForType + "_identifiers"]);

        for (var citation of br.cites) {
            this.addTriple(subj, "http://purl.org/spar/cito/cites", this.convertLocalId(citation, "br"));
        }

        for (var part of rawBr.parts) {
            if (part._id) {
                var partid = this.convertLocalId(part._id, "be");
                this.addTriple(subj, "http://purl.org/vocab/frbr/core#part", partid);
                this.addTriple(partid, "http://purl.org/spar/c4o/hasContent", part.bibliographicEntryText);
                if (part.references) {
                    this.addTriple(partid, "http://purl.org/spar/biro/references",
                        this.convertLocalId(part.references, "br"));
                }
                this.addIdentifiers(partid, part.identifiers);
            } else {
                console.log("WARNING: no id for part", part);
            }
        }

        var prev = null;
        if (rawBr[prefixForType + "_contributors"]) {
            for (var contr of rawBr[prefixForType + "_contributors"]) {
                var role = this.convertLocalId(contr._id, "ar");
                var agent = this.convertLocalId(contr.heldBy._id, "ra");
                var roleType = "http://purl.org/spar/pro/" + contr.roleType.toLowerCase();
                this.addTriple(subj, "pro:isDocumentContextFor", role);
                this.addTriple(role, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "http://purl.org/spar/pro/RoleInTime");
                this.addTriple(role, "http://www.w3.org/2000/01/rdf-schema#label", "agent role 0130" + this.convertLocalId(contr._id));
                this.addTriple(role, "http://purl.org/spar/pro/isHeldBy", agent);
                this.addTriple(agent, "http://purl.org/spar/pro/withRole", roleType);
                this.addTriple(agent, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "http://xmlns.com/foaf/0.1/Agent");
                this.addTriple(agent, "http://xmlns.com/foaf/0.1/givenName", contr.heldBy.givenName);
                this.addTriple(agent, "http://xmlns.com/foaf/0.1/familyName", contr.heldBy.familyName);
                if (!contr.heldBy.familyName) {
                    this.addTriple(agent, "http://xmlns.com/foaf/0.1/name", contr.heldBy.nameString);
                }
                if (prev !== null) {
                    this.addTriple(prev, "https://w3id.org/oc/ontology/hasNext", role);
                }
                prev = role;
                for (let contrIdentifier of contr.identifiers) {
                    let agent_id = contrIdentifier._id;
                    this.addTriple(contr, "http://purl.org/spar/datacite/hasIdentifier", agent_id);
                    this.addTriple(agent_id, a, "http://purl.org/spar/datacite/AgentIdentifier");
                    this.addTriple(agent_id, "http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue", ident.literalValue);
                    this.addTriple(agent_id, "http://purl.org/spar/datacite/usesIdentifierScheme", ident.scheme);
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
