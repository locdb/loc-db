'use strict';
const SchemaObject = require('schema-object');
const BibliographicEntry = require('./bibliographicEntry.js')
const Identifier = require('./identifier.js')
const Scan = require('./scan').js

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
    parts: [{type: BibliographicEntry}], // reference entries
    partOf: String, // link to other br
    cites: [{type: String}], // links to other brs
    embodiedAs: [{ // link to ressource embodiment
        type: String, // digital or print
        format: String, // IANA media type
        firstPage: Number,
        lastPage: Number,
        url: String
    }]
});

module.exports = bibliographicRessource;