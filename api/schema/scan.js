'use strict';

const SchemaObject = require('schema-object');
const status = require('./enum.json').status

//Create scan schema --> not present in OCC
var scan = new SchemaObject({
    scanName: String,
    xmlName: String,
    status: {type: String, enum: [status.notOcrProcessed, status.ocrProcessed, status.valid]},
    pages: String
});

module.exports = scan;