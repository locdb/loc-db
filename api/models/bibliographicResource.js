// The bibliographicResource model
const mongoose = require('mongoose')
       ,Schema = mongoose.Schema
       ,ObjectId = Schema.ObjectId;
const enums = require('./../schema/enum.json');
const mongoosastic = require('mongoosastic');
const config = require('./../../config/config');
const logger = require('./../util/logger.js');


const identifiersSchema = new Schema({
    literalValue: String,
    scheme: String
});

const beSchema = new Schema({
    identifiers: [identifiersSchema],
    bibliographicEntryText: String,
    references: String,
    scanId: String,
    status: {type: String, enum: [enums.status.ocrProcessed, enums.status.valid, enums.status.external]},
    ocrData:{
        coordinates: String,
        authors: [String], // maybe use contributors thingy later
        title: String,
        date: String,
        marker: String,
        comments: String,
        journal: String,
        volume: String
    }
});

const scanSchema = new Schema({
    scanName: String,
    xmlName: String,
    textualPdf: Boolean,
    status: {type: String, enum: [enums.status.notOcrProcessed, enums.status.ocrProcessing, enums.status.ocrProcessed, enums.status.valid]},
});

const resourceEmbodimentSchema = new Schema({ // Resource Embodiment
    identifiers: [identifiersSchema],
    type: {type: String}, // digital or print
    format: String, // IANA media type
    firstPage: Number,
    lastPage: Number,
    url: String,
    scans:[scanSchema]
});

const agentRoleSchema = new Schema({
    identifiers: [identifiersSchema],
    roleType: String,
    heldBy:{
        identifiers: [identifiersSchema],
        nameString: String,
        givenName: String,
        familyName: String
    },
    next: String // This is not necessary for now, as we are using an array
});

const brSchema = new Schema({
    identifiers: [identifiersSchema],
    type: {type: String},
    title: String,
    subtitle: String,
    edition: String,
    number: String, // e.g. number of an article in journal
    contributors: [agentRoleSchema],
    publicationYear: String,
    cites: [String], // reference entries
    partOf: String, // link to other br
    containerTitle: String,
    status: {type: String, enum: [enums.status.external, enums.status.valid]},
    parts: [beSchema], // links to other brs
    embodiedAs: [resourceEmbodimentSchema]
});

// we want to run a single elastic for the beginning. As the model name corresponds to the index name in elastic, we make
// sure that we do not mix up everything by adding the connection name to the index name
brSchema.plugin(mongoosastic,{
    index: mongoose.connection.name + '_br',
    host: config.SEARCHINDEX.HOST,
    port: config.SEARCHINDEX.PORT,
    protocol: config.SEARCHINDEX.PROTOCOL
});

var br = mongoose.model('br', brSchema)
        ,stream = br.synchronize()
        ,count = 0;

stream = br.synchronize();

stream.on('data', function(err, doc){
    count++;
});
stream.on('close', function(){
    logger.log('indexed ' + count + ' documents!');
});
stream.on('error', function(err){
    logger.error(err);
});


module.exports = br;