'use strict';
const SchemaObject = require('schema-object');
const BibliographicEntry = require('./bibliographicEntry.js');
const Identifier = require('./identifier.js');
const Scan = require('./scan');
const AgentRole = require('./agentRole');
const status = require('./enum.json').status;

var bibliographicResource = new SchemaObject({
    identifiers: [{type: Identifier}],
    type: String,
    title: String,
    subtitle: String,
    edition: String,
    number: String, // e.g. number of an article in journal
    contributors: [{type: AgentRole}],
    publicationYear: String,
    status: {type: String, enum: [status.valid, status.external]},
    cites: [{type: String}],
    pages: String,
    partOf: String, // link to other br
    parts: [{type: BibliographicEntry}],
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