
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
    type: String,
    title: String,
    subtitle: String,
    edition: String,
    status: {type: String, enum: [enums.status.notOcrProcessed, enums.status.ocrProcessed, enums.status.valid]},
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
        }
    }],
    scans:[{
        scanName: String,
        xmlName: String,
        status: {type: String, enum: [enums.status.notOcrProcessed, enums.status.ocrProcessed, enums.status.valid]},
        //pages: String
    }],
    //keywords: [String],
    publicationYear: Number,
    cites: [{
        bibliographicEntryText: String,
        references: String, //link to other br
        scanId: String, // TODO: Save scan name here?
        //xmlName: String, // TODO: Save xml name here?
        coordinates: String, // TODO: Save coordinates here?
        status: {type: String, enum: [enums.status.notOcrProcessed, enums.status.ocrProcessed, enums.status.valid]},
        externalURLs: [String],
        authors: [String],
        title: String,
        date: String,
        marker: String
    }], // reference entries
    partOf: String, // link to other br
    parts: [{
        partId: String,
        pages: String,
        status: {type: String, enum: [enums.status.notOcrProcessed, enums.status.ocrProcessed, enums.status.valid]},
    }], // links to other brs
//    embodiedAs: [{ // link to ressource embodiment
//        type: String, // digital or print
//        format: String, // IANA media type
//        firstPage: Number,
//        lastPage: Number,
//        url: String
//    }]
});

module.exports = mongoose.model('br', brSchema);