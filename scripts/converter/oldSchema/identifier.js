'use strict';

const SchemaObject = require('schema-object');

//Create bibliographicEntry schema 
var identifier = new SchemaObject({
    literalValue: String,
    scheme: String
});

module.exports = identifier;