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


const urlBase = {
    "gar": "https://w3id.org/oc/corpus/ar/0130",
    "gbe": "https://w3id.org/oc/corpus/be/0130",
    "gbr": "https://w3id.org/oc/corpus/br/0130",
    "gcr": "https://w3id.org/oc/corpus/cr/0130",
    "gdi": "https://w3id.org/oc/corpus/di/0130",
    "gid": "https://w3id.org/oc/corpus/id/0130",
    "gra": "https://w3id.org/oc/corpus/ra/0130",
    "gre": "https://w3id.org/oc/corpus/re/0130"
};


OCExporter.prototype.store = new N3.Store({prefixes: prefixes});



OCExporter.prototype.result = {};

OCExporter.prototype.mappingIds = {};

// initial values of OpenCitations export IDs
OCExporter.prototype.exportId = {
    ar: 0,
    be: 0,
    br: 0,
    cr: 0,
    di: 0,
    id: 0,
    ra: 0,
    re: 0
};


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
    for (var ident of identifiers) {
        this.exportId.id++;
        var ident_id = urlBase.gid + this.exportId.id;
        if (ident.literalValue && ident.literalValue !== "") {
            ident.literalValue = ident.literalValue.replace(/https?:\/\/(dx\.)?doi.org\//, '');
            var dataciteSchemas = ["ark", "arxiv", "bibcode", "doi",
                "ean13", "eissn", "handle", "infouri", "isbn", "issn",
                "istc", "lissn", "local-resource-identifier-scheme",
                "lsid", "nihmsid", "oci", "pii", "pmcid", "pmid",
                "purl", "sici", "upc", "uri", "url", "urn"];
            if (dataciteSchemas.includes(ident.scheme.toLowerCase())) {
                this.addTriple(ident_id, "http://purl.org/spar/datacite/usesIdentifierScheme", "http://purl.org/spar/datacite/" + ident.scheme.toLowerCase());
                this.addTriple(ident_id, "http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue", ident.literalValue);
            } else {
                var sigel = {
                    "SWB_PPN": "(DE-576)",
                    "GBV_PPN": "(DE-601)",
                    "ZDB_ID": "(DE-600)",
                    "ID_K10PLUS": "(DE-627)",
                    "ID_GVI": "(gvi)",
                    "OLC_PPN": "(olc)",
                    "OCLC_ID": "(oclc)",
                    "LCCN": "(US-DLC)"
                };
                if (sigel[ident.scheme]) {
                    this.addTriple(ident_id, "http://purl.org/spar/datacite/usesIdentifierScheme", "http://purl.org/spar/datacite/local-resource-identifier-scheme");
                    this.addTriple(ident_id, "http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue", sigel[ident.scheme] + ident.literalValue);
                } else {
                    if (!["URL_CROSSREF", "URL_SWB"].includes(ident.scheme)) {
                        //console.log("WARNING: Unhandled identifier scheme", ident.scheme);
                    }
                    continue;
                }
            }
            this.addTriple(subject, "http://purl.org/spar/datacite/hasIdentifier", ident_id);
            this.addTriple(ident_id, a, "http://purl.org/spar/datacite/Identifier");
            this.addTriple(ident_id, "rdfs:label", "identifier 0130" + this.exportId.id + " [id/0130" + this.exportId.id + "]");
        }
    }
}

OCExporter.prototype.convertFile = function(path, maximum, callback) {
    var brs = JSON.parse(fs.readFileSync(path));
    var count = 0;
    for (var br of brs) {
        if (!br._id) {
          console.log("WARNING: No _id found\n", JSON.stringify(br));
          continue;
        }
        count++;
        this.mappingIds[br._id] = count;
    }
    // any new bibliographic resource has to have an exportId following the
    // others already mapped to any br in the previous loop
    this.exportId.br = Object.keys(this.mappingIds).length;
    count = 0;
    for (var br of brs) {
        // example data for two journal articles
        // if (!["5a2180069052ca4625c5bcb5", "5bab9d7ec3bd212c24356330", "5a21811d9052ca4625c5bd0c", "5c17531db803eb229c526a72"].includes(br._id)) continue;
        count++;
        if (maximum && count > maximum) break;
        var rawBr = br;
        br = new BibliographicResource(br);
        if (!br._id) continue;
        var subj = urlBase.gbr + this.mappingIds[br._id];
        var prefixForType = br.type.toLowerCase().replace(/(_[a-z])/, function(c) {
            return c.replace('_', '').toUpperCase();
        });
        
        this.addTriple(subj, a, this.typeUri(br.type));
        this.addTriple(subj, a, "fabio:Expression");
        this.addTriple(subj, "rdfs:label", "bibliographic resource 0130" + this.exportId.br + " [br/0130" + this.exportId.br + "]");
        // TODO ask if that is okay?
        this.addTriple(subj, "owl:sameAs", "https://locdb.bib.uni-mannheim.de/locdb/bibliographicResources/" + br._id);
        this.addTriple(subj, "dcterms:title", br.getTitleForType(br.type));
        this.addTriple(subj, "http://purl.org/spar/fabio/hasSubtitle", br.getSubtitleForType(br.type));
        this.addTriple(subj, "http://prismstandard.org/namespaces/basic/2.0/edition", br.getEditionForType(br.type));
        this.addTriple(subj, "http://purl.org/spar/fabio/hasSequenceIdentifier", br.getNumberForType(br.type));
        if (br.getPublicationDateForType(br.type)) {
            this.addTriple(subj, "http://prismstandard.org/namespaces/basic/2.0/publicationDate", br.getPublicationDateForType(br.type));
        } else {
            if (!["JOURNAL_ISSUE", "REPORT_SERIES", "EDITED_BOOK", "BOOK_SET", "JOURNAL_VOLUME", "JOURNAL", "BOOK_SERIES"].includes(br.type)) {
                // TODO add missing dates at least for the most important publication types
                console.log("WARNING: no publication date found for", br._id, "of type", br.type);
            }
        }
        this.addTriple(subj, "http://www.w3.org/ns/prov#hadPrimarySource", br.source);
        if (br.partOf) {
            this.addTriple(subj, "http://purl.org/vocab/frbr/core#partOf", urlBase.gbr + this.mappingIds[br.partOf]);
        }

        if (br.type === "JOURNAL_ISSUE") {
            var current = subj;
            if (br.journalVolume_number) {
                this.exportId.br++;
                var volume = urlBase.gbr + this.exportId.br;
                this.addTriple(subj, "http://purl.org/vocab/frbr/core#partOf", volume);
                this.addTriple(volume, a, "fabio:Expression");
                this.addTriple(volume, a, "http://purl.org/spar/fabio/JournalVolume");
                this.addTriple(volume, "rdfs:label", "bibliographic resource 0130" + this.exportId.br + " [br/0130" + this.exportId.br + "]");
                this.addTriple(volume, "http://purl.org/spar/fabio/hasSequenceIdentifier", br.journalVolume_number);
                current = volume;
            }
            this.exportId.br++;
            var journal = urlBase.gbr + this.exportId.br;
            
            this.addTriple(current, "http://purl.org/vocab/frbr/core#partOf", journal);
            this.addTriple(journal, a, "fabio:Expression");
            this.addTriple(journal, a, "http://purl.org/spar/fabio/Journal");
            this.addTriple(journal, "rdfs:label", "bibliographic resource 0130" + this.exportId.br + " [br/0130" + this.exportId.br + "]");
            // the identifiers for a journal issue are only ISSN which
            // should be attached to the journal rather than the issue
            this.addIdentifiers(journal, rawBr[prefixForType + "_identifiers"]);
            if (br.journal_title) {
                this.addTriple(journal, "dcterms:title", br.journal_title);
            } else {
                // TODO fix missing journal names
                console.log("WARNING: Journal name is missing for", br._id)
            }
        } else {
            // add the identifiers for all other types directly to the subject
            this.addIdentifiers(subj, rawBr[prefixForType + "_identifiers"]);
        }
        
        for (var embod of rawBr[prefixForType + "_embodiedAs"]) {
            if (embod.firstPage || embod.lastPage || embod.format || embod.url) {
                this.exportId.re++;
                var embid = urlBase.gre + this.exportId.re;
                this.addTriple(subj, "http://purl.org/vocab/frbr/core#embodiment", embid);
                this.addTriple(embid, a, "fabio:Manifestation");
                this.addTriple(embid, "rdfs:label", "resource embodiment 0130" + this.exportId.re + " [re/0130" + this.exportId.re + "]");
                this.addTriple(embid, "http://prismstandard.org/namespaces/basic/2.0/startingPage", embod.firstPage);
                this.addTriple(embid, "http://prismstandard.org/namespaces/basic/2.0/endingPage", embod.lastPage);
                this.addTriple(embid, "http://purl.org/dc/terms/format", embod.format);
                this.addTriple(embid, "http://www.w3.org/ns/dcat#landingPage", embod.url);
            }
        }

        var citationErrors = 0;
        for (var citation of br.cites) {
            if (this.mappingIds[citation]) {
                this.addTriple(subj, "http://purl.org/spar/cito/cites", urlBase.gbr + this.mappingIds[citation]);
            } else {
                // TODO: why does this happen?
                //console.log("WARNING: citation not found among the bibliographic resources", citation, "cited by", br._id);
                citationErrors++;
            }
        }
        if (citationErrors > 0) {
            //console.log("WARNING:", citationErrors, "citations of", br._id, "not found among the bibliographic resources");
        }

        var referenceErrors = 0;
        var partsWithReferenceError = [];
        for (var part of rawBr.parts) {
            if (part._id) {
                this.exportId.be++;
                var partid = urlBase.gbe + this.exportId.be;
                this.addTriple(subj, "http://purl.org/vocab/frbr/core#part", partid);
                this.addTriple(partid, a, "http://purl.org/spar/biro/BibliographicReference");
                this.addTriple(partid, "rdfs:label", "bibliographic entry 0130" + this.exportId.be + " [be/0130" + this.exportId.be + "]");
                if (part.bibliographicEntryText) {
                    this.addTriple(partid, "http://purl.org/spar/c4o/hasContent", part.bibliographicEntryText);
                } else {
                    delete part.ocrData._id;
                    part.ocrData.authors = part.ocrData.authors.join(', ');
                    var constructedString = Object.values(part.ocrData).filter(x => x.length > 0).join(' ; ');
                    if (constructedString.length > 0) {
                        this.addTriple(partid, "http://purl.org/spar/c4o/hasContent", constructedString);
                    }
                }
                if (part.references) {
                    if (this.mappingIds[part.references]) {
                        this.addTriple(partid, "http://purl.org/spar/biro/references",
                            urlBase.gbr + this.mappingIds[part.references]);
                    } else {
                        // TODO: why does this happen?
                        referenceErrors++;
                        partsWithReferenceError.push(part);
                        //console.log("WARNING: reference not found among the bibliographic resources", part.references, "referenced by", br._id);
                    }
                }
                this.addIdentifiers(partid, part.identifiers);
            } else {
                console.log("WARNING: no id for part", part);
            }
        }
        if (referenceErrors > 0) {
            //console.log("WARNING:", referenceErrors, "references of", br._id, "not found among the bibliographic resources");
            //console.log(JSON.stringify(partsWithReferenceError, null, 2));
        }

        var prev = null;
        if (rawBr[prefixForType + "_contributors"]) {
            for (var contr of rawBr[prefixForType + "_contributors"]) {
                this.exportId.ar++;
                var role = urlBase.gar + this.exportId.ar;
                this.exportId.ra++;
                var agent = urlBase.gra + this.exportId.ra;
                var roleType = "http://purl.org/spar/pro/" + contr.roleType.toLowerCase();
                this.addTriple(subj, "pro:isDocumentContextFor", role);
                this.addTriple(role, a, "http://purl.org/spar/pro/RoleInTime");
                this.addTriple(role, "rdfs:label", "agent role 0130" + this.exportId.ar + " [ar/0130" + this.exportId.ar + "]");
                this.addTriple(role, "http://purl.org/spar/pro/isHeldBy", agent);
                this.addTriple(role, "http://purl.org/spar/pro/withRole", roleType);
                this.addTriple(agent, a, "http://xmlns.com/foaf/0.1/Agent");
                this.addTriple(agent, "rdfs:label", "responsible agent 0130" + this.exportId.ra + " [ra/0130" + this.exportId.ra + "]");
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
                    this.exportId.id++;
                    var agent_id = urlBase.gid + this.exportId.id;
                    ident.literalValue = ident.literalValue.replace(/https?:\/\/orcid.org\//, '');
                    var dataciteSchemas = ["dia", "isni", "jst", "nii",
                        "openid", "orcid", "researcherid", "viaf"];
                    if (dataciteSchemas.includes(ident.scheme.toLowerCase())) {
                        this.addTriple(agent_id, "http://purl.org/spar/datacite/usesIdentifierScheme", "http://purl.org/spar/datacite/" + ident.scheme.toLowerCase());
                        this.addTriple(agent_id, "http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue", ident.literalValue);
                    } else {
                        var sigel = {
                            "GND_ID": "(DE-588)"
                        };
                        if (sigel[ident.scheme]) {
                            this.addTriple(agent_id, "http://purl.org/spar/datacite/usesIdentifierScheme", "http://purl.org/spar/datacite/local-personal-identifier-scheme");
                            this.addTriple(agent_id, "http://www.essepuntato.it/2010/06/literalreification/hasLiteralValue", sigel[ident.scheme] + ident.literalValue);
                        } else {
                            console.log("WARNING: Unhandled identifier scheme", ident.scheme);
                            continue;
                        }
                    }
                    this.addTriple(contr, "http://purl.org/spar/datacite/hasIdentifier", agent_id);
                    this.addTriple(agent_id, a, "http://purl.org/spar/datacite/Identifier");
                    this.addTriple(agent_id, "rdfs:label", "identifier 0130" + this.exportId.id + " [br/0130" + this.exportId.id + "]");
                }
            }
        }
    }
    console.log("This exports used up to the following export IDs", this.exportId);
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
