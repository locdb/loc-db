'use strict';
const SchemaObject = require('schema-object');
const BibliographicEntry = require('./bibliographicEntry.js')
const Identifier = require('./identifier.js')
const Scan = require('./scan').js

var bibliographicResource = new SchemaObject({
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
    publicationYear: Number,
    cites: [{type: String}],
    pages: String,
    partOf: String, // link to other br
    parts: [{type: BibliographicEntry}], // links to other brs
    embodiedAs: [{ // link to ressource embodiment
        type: String, // digital or print
        format: String, // IANA media type
        firstPage: Number,
        lastPage: Number,
        url: String,
        scans: [{type: Scan}]
    }]
});

module.exports = bibliographicResource;