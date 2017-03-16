'use strict';
const SchemaObject = require('schema-object');
const BibliographicEntry = require('./bibliographicEntry.js')
const Identifier = require('./identifier.js')
const Scan = require('./scan').js
const status = require('./enum.json').status

// Switched parts and cites
var bibliographicRessource = new SchemaObject({
    identifiers: [{type: Identifier}],
    type: String,
    title: String,
    subtitle: String,
    edition: String,
    number: Number, // e.g. number of an article in journal
    contributors: [{
        identifiers: [{type: Identifier}],
        roleType: String,
        heldBy:{
            identifiers: [{
                value: String,
                scheme: String
            }],
            nameString: String,
            givenName: String,
            familyName: String
        }
    }],
    //keywords: [String],
    publicationYear: Number,
    scans:[{type: Scan}],
    cites: [{type: BibliographicEntry}], // reference entries
    status: {type: String, enum: [status.notOcrProcessed, status.ocrProcessed, status.valid]},
    pages: String,
    partOf: String, // link to other br
    parts: [{type: String}], // links to other brs
    // TODO: What to do with this?
//    embodiedAs: [{ // link to ressource embodiment
//        type: String, // digital or print
//        format: String, // IANA media type
//        firstPage: Number,
//        lastPage: Number,
//        url: String
//    }]
});

module.exports = bibliographicRessource;