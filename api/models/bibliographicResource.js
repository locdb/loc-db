
// The bibliographicResource model

const mongoose = require('mongoose')
       ,Schema = mongoose.Schema
       ,ObjectId = Schema.ObjectId;

const brSchema = new Schema({
    type: String,
    title: String,
    subTitle: String,
    identifier: [{
        id: String,
        type: String
    }],
    responsibleAgents: [{
        roleType: String,
        firstName: String,
        lastName: String
    }],
    keywords: [String],
    publicationYear: String,
    parts: [String],
    partOf: String,
    cites: [String],
    embodiedAs: [{
        type: String,
        format: String,
        firstPage: Number,
        lastPage: Number,
        url: String
    }]
});

module.exports = mongoose.model('br', brSchema);