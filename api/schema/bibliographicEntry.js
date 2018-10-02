'use strict';

const SchemaObject = require('schema-object');
const status = require('./enum.json').status;
const Identifier = require('./identifier.js');

//Create bibliographicEntry schema 
var bibliographicEntry = new SchemaObject({
    identifiers: [{type: Identifier}],
    bibliographicEntryText: String, // the literal text if a bibliographic entry, i.e. "the reference"
    references: String, // the corpus identifier of the br the bibliographic entry references
    ocrData: {
        coordinates: String,
        authors: [String],
        title: String,
        date: String,
        marker: String,
        comments: String,
        journal: String,
        volume: String,
        namer: String,
        detector: String
    },
    scanId: String,
    scanName: String,
    status: {type: String, enum: [status.ocrProcessed, status.valid, status.external, status.obsolete]},
});

module.exports = bibliographicEntry;