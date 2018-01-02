'use strict';

const SchemaObject = require('schema-object');
const status = require('./enum.json').status

//Create scan schema --> not present in OCC
var scan = new SchemaObject({
    _id: 'any',
    scanName: String,
    xmlName: String,
    textualPdf: Boolean,
    status: {type: String, enum: [status.notOcrProcessed, status.ocrProcessing, status.ocrProcessed, status.valid]}
});

module.exports = scan;