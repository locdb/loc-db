/**
 * Created by anlausch on 3/15/2018.
 */
'use strict';

const SchemaObject = require('schema-object');
const Identifier = require('./identifier.js');

//Create bibliographicEntry schema
var responsibleAgent = new SchemaObject({
    identifiers: [{type: Identifier}],
    nameString: String,
    givenName: String,
    familyName: String,
    //relatedAgent: Object
});

module.exports = responsibleAgent;