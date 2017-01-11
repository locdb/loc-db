
// The bibliographicResource model

const mongoose = require('mongoose')
       ,Schema = mongoose.Schema
       ,ObjectId = Schema.ObjectId;

const brSchema = new Schema({
    identifiers: [{
        literalValue: String,
        scheme: String
    }],
    type: String,
    title: String,
    subtitle: String,
    edition: String,
    number: Number, // e.g. number of an article in journal
    contributors: [{
        identifiers: [{
            id: String,
            type: String
        }],
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
    }],
    //keywords: [String],
    publicationYear: Number,
    parts: [{
        bibliographicEntryText: String,
        references: String //link to other br
    }], // reference entries
    partOf: String, // link to other br
    cites: [String], // links to other brs
    embodiedAs: [{ // link to ressource embodiment
        type: String, // digital or print
        format: String, // IANA media type
        firstPage: Number,
        lastPage: Number,
        url: String
    }]
});

module.exports = mongoose.model('br', brSchema);