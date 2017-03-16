'use strict';

const SchemaObject = require('schema-object');
const status = require('./enum.json').status;

//Create scan schema --> not present in OCC
var part = new SchemaObject({
    partId: String,
    pages: String,
    status: {type: String, enum: [status.notOcrProcessed, status.ocrProcessed, status.valid]},
    //pages: String
});

module.exports = part;