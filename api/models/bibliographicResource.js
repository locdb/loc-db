
// The bibliographicResource model
const mongoose = require('mongoose')
       ,Schema = mongoose.Schema
       ,ObjectId = Schema.ObjectId;
const enums = require('./../schema/enum.json');

const brSchema = new Schema({
    identifiers: [{
        literalValue: String,
        scheme: String
    }],
    type: {type: String},
    title: String,
    subtitle: String,
    edition: String,
    number: Number, // e.g. number of an article in journal
    contributors: [{
        identifiers: [{
            literalValue: String,
            scheme: String
        }],
        roleType: String,
        heldBy:{
            identifiers: [{
                literalValue: String,
                scheme: String
            }],
            nameString: String,
            givenName: String,
            familyName: String
        },
        next: String // This is not necessary for now, as we are using an array
    }],
    publicationYear: Number,
    cites: [String], // reference entries
    partOf: String, // link to other br
    parts: [{
        identifiers: [{
            literalValue: String,
            scheme: String
        }],
        bibliographicEntryText: String,
        references: String, //link to other br
        scanId: String,
        status: {type: String, enum: [enums.status.ocrProcessed, enums.status.valid, enums.status.external]},
        coordinates: String,
        authors: [String], // maybe use contributors thingy later
        title: String,
        date: String,
        marker: String
    }], // links to other brs
    embodiedAs: [{ // Resource Embodiment
        identifiers: [{
            literalValue: String,
            scheme: String
        }],
        type: {type: String}, // digital or print
        format: String, // IANA media type
        firstPage: Number,
        lastPage: Number,
        url: String,
        scans:[{
            scanName: String,
            xmlName: String,
            status: {type: String, enum: [enums.status.notOcrProcessed, enums.status.ocrProcessed, enums.status.valid]},
        }]
    }]
});

module.exports = mongoose.model('br', brSchema);