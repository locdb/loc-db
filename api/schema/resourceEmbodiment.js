/**
 * Created by anlausch on 1/11/2017.
 */
'use strict';

const SchemaObject = require('schema-object');
const Identifier = require('./identifier.js');
const Scan = require('./Scan.js');

//Create bibliographicEntry schema
var resourceEmbodiment = new SchemaObject({ // link to resource embodiment
    type: String, // digital or print
    format: String, // IANA media type
    firstPage: Number,
    lastPage: Number,
    url: String,
    scans: [{type: Scan}]
});

module.exports = resourceEmbodiment;