/**
 * Created by anlausch on 5/23/2017.
 */
'use strict';

const SchemaObject = require('schema-object');
const status = require('./enum.json').status;
const Identifier = require('./identifier.js');

//Create bibliographicEntry schema
var agentRole = new SchemaObject({
    identifiers: [{type: Identifier}],
    roleType: String,
    heldBy:{
        identifiers: [{
            value: String,
            scheme: String
        }],
        nameString: String,
        givenName: String,
        familyName: String
    }
    //next: {type: this}
});

module.exports = agentRole;