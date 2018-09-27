'use strict';
// The bibliographicResource model
const mongoose = require('mongoose')
    ,Schema = mongoose.Schema
    ,ObjectId = Schema.ObjectId;
const enums = require('./../schema/enum.json');
const mongoosastic = require('mongoosastic');
const config = require('./../../config/config');
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');


const identifiersSchema = new Schema({
    literalValue: String,
    scheme: String
});

const ocrDataSchema = new Schema({
    coordinates: String,
    authors: [String], // maybe use contributors thingy later
    title: String,
    date: String,
    marker: String,
    comments: String,
    journal: String,
    volume: String
});

const beSchema = new Schema({
    identifiers: [identifiersSchema],
    bibliographicEntryText: String,
    references: String,
    scanId: String,
    scanName: String,
    status: {type: String, enum: [enums.status.ocrProcessed, enums.status.valid, enums.status.external]},
    ocrData: ocrDataSchema
});

const scanSchema = new Schema({
    scanName: String,
    xmlName: String,
    textualPdf: Boolean,
    status: {type: String, enum: [enums.status.notOcrProcessed, enums.status.ocrProcessing, enums.status.ocrProcessed, enums.status.valid, enums.status.obsolete]},
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


var responsibleAgentSchema = new Schema({
    identifiers: [identifiersSchema],
    nameString: String,
    givenName: String,
    familyName: String
});


const agentRoleSchema = new Schema({
    identifiers: [identifiersSchema],
    roleType: String,
    heldBy: responsibleAgentSchema//,
    //next: String // This is not necessary for now, as we are using an array
});

var brSchema = new Schema({
    journal_identifiers: [identifiersSchema],
    journalVolume_identifiers: [identifiersSchema],
    journalIssue_identifiers: [identifiersSchema],
    journalArticle_identifiers: [identifiersSchema],
    monograph_identifiers: [identifiersSchema],
    editedBook_identifiers: [identifiersSchema],
    bookSeries_identifiers: [identifiersSchema],
    bookSet_identifiers: [identifiersSchema],
    bookChapter_identifiers: [identifiersSchema],
    bookSection_identifiers: [identifiersSchema],
    bookPart_identifiers: [identifiersSchema],
    bookTrack_identifiers: [identifiersSchema],
    component_identifiers: [identifiersSchema],
    dissertation_identifiers: [identifiersSchema],
    proceedingsArticle_identifiers: [identifiersSchema],
    proceedings_identifiers: [identifiersSchema],
    dataset_identifiers: [identifiersSchema],
    report_identifiers: [identifiersSchema],
    reportSeries_identifiers: [identifiersSchema],
    book_identifiers: [identifiersSchema],
    referenceBook_identifiers: [identifiersSchema],
    referenceEntry_identifiers: [identifiersSchema],
    standard_identifiers: [identifiersSchema],
    standardSeries_identifiers: [identifiersSchema],
    type: {type: String},
    journal_title: String,
    journalVolume_title: String,
    journalIssue_title: String,
    journalArticle_title: String,
    monograph_title: String,
    editedBook_title: String,
    bookSeries_title: String,
    bookSet_title: String,
    bookChapter_title: String,
    bookSection_title: String,
    bookPart_title: String,
    bookTrack_title: String,
    component_title: String,
    report_title: String,
    proceedingsArticle_title: String,
    dissertation_title: String,
    proceedings_title: String,
    dataset_title: String,
    reportSeries_title: String,
    book_title: String,
    referenceBook_title: String,
    referenceEntry_title: String,
    standard_title: String,
    standardSeries_title: String,
    editedBook_subtitle: String,
    report_subtitle: String,
    dissertation_subtitle: String,
    proceedingsArticle_subtitle: String,
    standard_subtitle: String,
    standardSeries_subtitle: String,
    journal_subtitle: String,
    journalArticle_subtitle: String,
    bookSeries_subtitle: String,
    monograph_subtitle: String,
    bookSet_subtitle: String,
    bookPart_subtitle: String,
    bookChapter_subtitle: String,
    bookSection_subtitle: String,
    bookTrack_subtitle: String,
    component_subtitle: String,
    proceedings_subtitle: String,
    dataset_subtitle: String,
    reportSeries_subtitle: String,
    book_subtitle: String,
    referenceBook_subtitle: String,
    referenceEntry_subtitle: String,
    monograph_edition: String,
    editedBook_edition: String,
    dissertation_edition: String,
    proceedings_edition: String,
    report_edition: String,
    book_edition: String,
    referenceBook_edition: String,
    standard_edition: String,
    journalVolume_number: String,
    journalIssue_number: String,
    journalArticle_number: String,
    bookPart_number: String,
    monograph_number: String,
    editedBook_number: String,
    component_number: String,
    bookSet_number: String,
    bookChapter_number: String,
    bookSection_number: String,
    bookTrack_number: String,
    proceedings_number: String,
    report_number: String,
    book_number: String,
    standard_number: String,
    referenceBook_number: String,
    referenceEntry_number: String,
    journal_contributors: [agentRoleSchema],
    report_contributors: [agentRoleSchema],
    journalVolume_contributors: [agentRoleSchema],
    journalIssue_contributors: [agentRoleSchema],
    journalArticle_contributors: [agentRoleSchema],
    monograph_contributors: [agentRoleSchema],
    editedBook_contributors: [agentRoleSchema],
    bookSeries_contributors: [agentRoleSchema],
    proceedingsArticle_contributors: [agentRoleSchema],
    bookSet_contributors: [agentRoleSchema],
    bookChapter_contributors: [agentRoleSchema],
    dataset_contributors: [agentRoleSchema],
    bookTrack_contributors: [agentRoleSchema],
    component_contributors: [agentRoleSchema],
    dissertation_contributors: [agentRoleSchema],
    proceedings_contributors: [agentRoleSchema],
    reportSeries_contributors: [agentRoleSchema],
    book_contributors: [agentRoleSchema],
    referenceBook_contributors: [agentRoleSchema],
    referenceEntry_contributors: [agentRoleSchema],
    standard_contributors: [agentRoleSchema],
    standardSeries_contributors: [agentRoleSchema],
    journalArticle_publicationDate: Date,
    journalIssue_publicationDate: Date,
    journalVolume_publicationDate: Date,
    journal_publicationDate: Date,
    monograph_publicationDate: Date,
    report_publicationDate: Date,
    reportSeries_publicationDate: Date,
    bookChapter_publicationDate: Date,
    bookSeries_publicationDate: Date,
    bookSet_publicationDate: Date,
    editedBook_publicationDate: Date,
    dissertation_publicationDate: Date,
    proceedingsArticle_publicationDate: Date,
    dataset_publicationDate: Date,
    proceedings_publicationDate: Date,
    book_publicationDate: Date,
    referenceBook_publicationDate: Date,
    referenceEntry_publicationDate: Date,
    standard_publicationDate: Date,
    standardSeries_publicationDate: Date,
    bookPart_publicationDate: Date,
    bookSection_publicationDate: Date,
    bookTrack_publicationDate: Date,
    component_publicationDate: Date,
    cites: [String], // reference entries
    partOf: String, // link to other br
    status: {type: String, enum: [enums.status.external, enums.status.valid]},
    parts: [beSchema], // links to other brs
    monograph_embodiedAs: [resourceEmbodimentSchema],
    editedBook_embodiedAs: [resourceEmbodimentSchema],
    bookSeries_embodiedAs: [resourceEmbodimentSchema],
    bookSet_embodiedAs: [resourceEmbodimentSchema],
    bookChapter_embodiedAs: [resourceEmbodimentSchema],
    bookSection_embodiedAs: [resourceEmbodimentSchema],
    bookPart_embodiedAs: [resourceEmbodimentSchema],
    bookTrack_embodiedAs: [resourceEmbodimentSchema],
    component_embodiedAs: [resourceEmbodimentSchema],
    dissertation_embodiedAs: [resourceEmbodimentSchema],
    proceedingsArticle_embodiedAs: [resourceEmbodimentSchema],
    proceedings_embodiedAs: [resourceEmbodimentSchema],
    journal_embodiedAs: [resourceEmbodimentSchema],
    journalVolume_embodiedAs: [resourceEmbodimentSchema],
    journalIssue_embodiedAs: [resourceEmbodimentSchema],
    journalArticle_embodiedAs: [resourceEmbodimentSchema],
    dataset_embodiedAs: [resourceEmbodimentSchema],
    report_embodiedAs: [resourceEmbodimentSchema],
    reportSeries_embodiedAs: [resourceEmbodimentSchema],
    book_embodiedAs: [resourceEmbodimentSchema],
    referenceBook_embodiedAs: [resourceEmbodimentSchema],
    referenceEntry_embodiedAs: [resourceEmbodimentSchema],
    standard_embodiedAs: [resourceEmbodimentSchema],
    standardSeries_embodiedAs:[resourceEmbodimentSchema],
    source: String
});



// we want to run a single elastic for the beginning. As the model name corresponds to the index name in elastic, we make
// sure that we do not mix up everything by adding the connection name to the index name
brSchema.plugin(mongoosastic,{
    index: config.DB.SCHEMA + '_br',
    host: config.SEARCHINDEX.HOST,
    port: config.SEARCHINDEX.PORT,
    protocol: config.SEARCHINDEX.PROTOCOL
});

var mongoBr = mongoose.model('br', brSchema)
    ,stream = mongoBr.synchronize()
    ,count = 0;

brSchema.transformIdentifiers = function(identifiers){
    var literalValues = [];
    for(var identifier of identifiers){
        literalValues.push(identifier.literalValue);
    }
    return literalValues;
};

brSchema.pre('save', function (next) {
    var self = this;
    var br = new BibliographicResource(self)
    var identifiers = brSchema.transformIdentifiers(br.getIdentifiersForType(br.type));
    var title = br.getTitleForType(br.type);
    var number = br.getNumberForType(br.type);
    var edition = br.getEditionForType(br.type);
    var propertyPrefix = br.getPropertyPrefixForType(br.type);

    if(br.type === enums.resourceType.journalIssue){
        var volumeNumber = br.getNumberForType(enums.resourceType.journalVolume);
        var journalTitle = br.getTitleForType(enums.resourceType.journal);
        var journalIdentifiers = brSchema.transformIdentifiers(br.getIdentifiersForType(enums.resourceType.journal));

        mongoBr.where(propertyPrefix.concat("title"), title)
            .where(propertyPrefix.concat("number"), number)
            .where(propertyPrefix.concat("edition"), edition)
            .all(propertyPrefix.concat("identifiers.literalValue"), identifiers)
            .where("journalVolume_number", volumeNumber)
            .where("journal_title", journalTitle)
            .all("journal_identifiers", journalIdentifiers)
            .exec(function (err, docs) {
                if(err){
                    logger.error(err);
                    next();
                }
                if (docs.length !== 0){
                    logger.log('Br exists: ', docs[0]._id);
                    next(new Error("Br already exists."), docs[0]);
                }else{
                    next();
                }
            });
    }else{
        mongoBr.where(propertyPrefix.concat("title"), title)
            .where(propertyPrefix.concat("number"), number)
            .where(propertyPrefix.concat("edition"), edition)
            .all(propertyPrefix.concat("identifiers.literalValue"), identifiers)
            .exec(function (err, docs) {
                if(err){
                    logger.error(err);
                    next();
                }
                if (docs.length !== 0){
                    logger.log('Br exists: ', docs[0]._id);
                    next(new Error("Br already exists."), docs[0]);
                }else{
                    next();
                }
            });
    }
});


stream.on('data', function(err, doc){
    count++;
});
stream.on('close', function(){
    logger.log('indexed ' + count + ' documents!');
});
stream.on('error', function(err){
    logger.error(err);
});


module.exports = {
    mongoBr: mongoBr,
    brSchema: brSchema
};
