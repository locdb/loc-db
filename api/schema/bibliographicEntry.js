'use strict';

const SchemaObject = require('schema-object');

//Create bibliographicEntry schema 
var bibliographicEntry = new SchemaObject({
  bibliographicEntryText: String, // the literal text if a bibliographic entry, i.e. "the reference"
  references: String, // the corpus identifier of the br the bibliographic entry references
  coordinates: String
});

module.exports = bibliographicEntry