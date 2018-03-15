/**
 * Created by anlausch on 5/23/2017.
 */
'use strict';

const SchemaObject = require('schema-object');
const Identifier = require('./identifier.js');
const ResponsibleAgent = require('./responsibleAgent.js');

//Create bibliographicEntry schema
var agentRole = new SchemaObject({
    identifiers: [{type: Identifier}],
    roleType: String,
    heldBy:{type: ResponsibleAgent},
    next: {type: this}
});

module.exports = agentRole;