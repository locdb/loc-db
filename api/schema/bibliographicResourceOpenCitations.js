'use strict';
const SchemaObject = require('schema-object');
const BibliographicEntry = require('./bibliographicEntry.js');
const Identifier = require('./identifier.js');
const AgentRole = require('./agentRole');
const status = require('./enum.json').status;
const ResourceEmbodiment = require('./resourceEmbodiment');

var bibliographicResourceOpenCitations = new SchemaObject({
    iri: String,
    a: [{type: String, enum: ["document", "article", "..."] }],
    label: String,
    identifier: [{
        id: String,
        iri: String,
        a: {type: String, enum: ["unique_identifier"]},
        type: String,
        label: String
    }],
    title: String,
    subtitle: String,
    date: {
        value: String,
        a: {type: String, enum: ["year"]}
    },
    contributor: [{
        iri: String,
        a: {type: String, enum: ["role"]},
        label: String,
        role_type: {type: String, enum: ["author", "publisher", "editor"]},
        role_of: {
            iri: String,
            a:  {type: String, enum: ["agent"]},
            label: String,
            gname: String,
            fname: String,
            identfier: [{
                id: String,
                iri: String,
                a: {type: String, enum: ["unique_identifier"]},
                type: String,
                label: String
            }],
        },
        next: String,
    }],
    format: [{
        iri: String,
        a: {type: String, enum: ["digital_format", "print"]},
        label: String,
        mime_type: String,
        fpage: String,
        lpage: String,
    }],
    reference: [{
        iri: String,
        a:  {type: String, enum: ["entry"]},
        label: String,
        content: String,
        crossref: String,
    }],
    part_of: {
        iri: String,
        a: { type: String, enum: ["document", "periodical_issue", "periodical_volume", "periodical_journal", "proceedings", "..." ]},
        label: String,
        number: String,
        identifier: [{
            id: String,
            iri: String,
            a: {type: String, enum: ["unique_identifier"]},
            type: String,
            label: String
        }],
        title: String,
        subtitle: String,
        part_of: {
            iri: String,
            a: { type: String, enum: ["document", "periodical_issue", "periodical_volume", "periodical_journal", "proceedings", "..." ]},
            label: String,
            number: String,
            identifier: [{
                id: String,
                iri: String,
                a: {type: String, enum: ["unique_identifier"]},
                type: String,
                label: String
            }],
            title: String,
            subtitle: String,
            part_of: {
                iri: String,
                a: { type: String, enum: ["document", "periodical_issue", "periodical_volume", "periodical_journal", "proceedings", "..." ]},
                label: String,
                number: String,
                identifier: [{
                    id: String,
                    iri: String,
                    a: {type: String, enum: ["unique_identifier"]},
                    type: String,
                    label: String
                }],
                title: String,
                subtitle: String,
            }
        }
    },
    citation: [{
        iri: String,
        a: {
            type: String,
            enum: ["document", "periodical_issue", "periodical_volume", "periodical_journal", "proceedings", "inproceedings", "..."]
        },
        label: String,
        title: String,
        date: {
            value: String,
            a: {type: String, enum: ["year"]}
        },
        format: [{
            iri: String,
            a: {type: String, enum: ["digital_format", "print"]},
            label: String,
            mime_type: String,
            fpage: String,
            lpage: String,
        }],
        part_of: {
            iri: String,
            a: {
                type: String,
                enum: ["document", "periodical_issue", "periodical_volume", "periodical_journal", "proceedings", "..."]
            },
            label: String,
            number: String,
            identifier: [{
                id: String,
                iri: String,
                a: {type: String, enum: ["unique_identifier"]},
                type: String,
                label: String
            }],
            title: String,
            subtitle: String,
            part_of: {
                iri: String,
                a: {
                    type: String,
                    enum: ["document", "periodical_issue", "periodical_volume", "periodical_journal", "proceedings", "..."]
                },
                label: String,
                number: String,
                identifier: [{
                    id: String,
                    iri: String,
                    a: {type: String, enum: ["unique_identifier"]},
                    type: String,
                    label: String
                }],
                title: String,
                subtitle: String,
                part_of: {
                    iri: String,
                    a: {
                        type: String,
                        enum: ["document", "periodical_issue", "periodical_volume", "periodical_journal", "proceedings", "..."]
                    },
                    label: String,
                    number: String,
                    identifier: [{
                        id: String,
                        iri: String,
                        a: {type: String, enum: ["unique_identifier"]},
                        type: String,
                        label: String
                    }],
                    title: String,
                    subtitle: String,
                }
            }
        },
    }],
});



module.exports = bibliographicResourceOpenCitations;