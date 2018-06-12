'use strict';

const mongoose = require('mongoose')
    ,Schema = mongoose.Schema
    ,ObjectId = Schema.ObjectId;
const brSchema = require('./bibliographicResource').brSchema;

const brSuggestionsSchema = new Schema({
    suggestions: [[brSchema]],
    queryString: String
});


var mongoBrSuggestions = mongoose.model('brSuggestions', brSuggestionsSchema);

module.exports = {
    mongoBrSuggestions: mongoBrSuggestions,
    brSuggestionsSchema: brSuggestionsSchema
};