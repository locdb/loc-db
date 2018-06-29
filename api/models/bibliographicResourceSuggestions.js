'use strict';

const mongoose = require('mongoose')
    ,Schema = mongoose.Schema
    ,ObjectId = Schema.ObjectId;
const brSchema = require('./bibliographicResource').brSchema;

const brSuggestionsSchema = new Schema({
    suggestions: [[brSchema]],
    queryString: {type: String, index: true} //we need an index here
},{ capped: 1908450048 });

// capped collections have a specified byte size
// db.collection.stats on production system returned average size of 4241 bytes per object in collection brs
// in our paper we write that we have around 600000 references, if we prepare 5% of them at once, we end up with 30000 references to prepare,
// for which we have maybe 15 suggestions to store, therefore, we can assume 30000 * 15 * 4241 bytes (1908450000)
// if we devide this by 256 (mongo expects a multiple of this), we end up with 7454882,8125, i.e. 7454883*256= 1908450048
var mongoBrSuggestions = mongoose.model('brSuggestions', brSuggestionsSchema);

module.exports = {
    mongoBrSuggestions: mongoBrSuggestions,
    brSuggestionsSchema: brSuggestionsSchema
};