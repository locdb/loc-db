'use strict';
const SchemaObject = require('schema-object');
const BibliographicEntry = require('./bibliographicEntry.js');
const Identifier = require('./identifier.js');
const AgentRole = require('./agentRole');
const status = require('./enum.json').status;
const ResourceEmbodiment = require('./resourceEmbodiment');

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
    embodiedAs: [{type: ResourceEmbodiment}]
});

module.exports = bibliographicResource;