'use strict';

const SchemaObject = require('schema-object');

//Create bibliographicEntry schema 
var feedEntry = new SchemaObject({
    title: String,
    description: String,
    summary: String,
    link: String,
    origlink: String,
    permalink: String,
    date: String,
    pubdate: String,
    author: String,
    guid: String,
    comments: String,
    image: {
        url: String,
        title: String
    },
    categories: [String],
    source: {
        url: String,
        title: String
    },
    enclosures: [{
        url: String,
        type: String,
        length: String
    }],
    meta: {
        title: String,
        description: String,
        link: String,
        xmlurl: String,
        date: String,
        pubdate: String,
        author: String,
        language: String,
        image:{
            url: String,
            title: String,
        },
        favicon: String,
        copyright: String,
        generator: String,
        categories: [String]
    }

});

module.exports = feedEntry;