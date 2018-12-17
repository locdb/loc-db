'use strict';
// The bibliographicResource model
const mongoose = require('mongoose')
       ,Schema = mongoose.Schema
       ,ObjectId = Schema.ObjectId;
const enums = require('./../schema/enum.json');
const mongoosastic = require('./../../custom_modules/mongoosastic');
const config = require('./../../config/config');
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');


const identifiersSchema = new Schema({
    literalValue: { type: String, trim: true },
    scheme: { type: String, trim: true }
});

const ocrDataSchema = new Schema({
    coordinates: { type: String, trim: true },
    authors: [String], // maybe use contributors thingy later
    title: { type: String, trim: true },
    date: { type: String, trim: true },
    marker: { type: String, trim: true },
    comments: { type: String, trim: true },
    journal: { type: String, trim: true },
    volume: { type: String, trim: true },
    namer: { type: String, trim: true },
    detector: { type: String, trim: true }
});

const beSchema = new Schema({
    identifiers: [identifiersSchema],
    bibliographicEntryText: { type: String, trim: true },
    references: { type: String, trim: true },
    scanId: { type: String, trim: true },
    scanName: { type: String, trim: true },
    status: {type: String, enum: [enums.status.ocrProcessed, enums.status.valid, enums.status.external, enums.status.obsolete]},
    ocrData: ocrDataSchema
});

const scanSchema = new Schema({
    scanName: { type: String, trim: true },
    xmlName: { type: String, trim: true },
    textualPdf: Boolean,
    status: {type: String, enum: [enums.status.notOcrProcessed, enums.status.ocrProcessing, enums.status.ocrProcessed, enums.status.valid, enums.status.obsolete]},
});

const resourceEmbodimentSchema = new Schema({ // Resource Embodiment
    identifiers: [identifiersSchema],
    type: {type: String}, // digital or print
    format: { type: String, trim: true }, // IANA media type
    firstPage: Number,
    lastPage: Number,
    url: { type: String, trim: true },
    scans:[scanSchema]
});


var responsibleAgentSchema = new Schema({
    identifiers: [identifiersSchema],
    nameString: { type: String, trim: true },
    givenName: { type: String, trim: true },
    familyName: { type: String, trim: true }
});


const agentRoleSchema = new Schema({
    identifiers: [identifiersSchema],
    roleType: { type: String, trim: true },
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
    journal_title: { type: String, trim: true },
    journalVolume_title: { type: String, trim: true },
    journalIssue_title: { type: String, trim: true },
    journalArticle_title: { type: String, trim: true },
    monograph_title: { type: String, trim: true },
    editedBook_title: { type: String, trim: true },
    bookSeries_title: { type: String, trim: true },
    bookSet_title: { type: String, trim: true },
    bookChapter_title: { type: String, trim: true },
    bookSection_title: { type: String, trim: true },
    bookPart_title: { type: String, trim: true },
    bookTrack_title: { type: String, trim: true },
    component_title: { type: String, trim: true },
    report_title: { type: String, trim: true },
    proceedingsArticle_title: { type: String, trim: true },
    dissertation_title: { type: String, trim: true },
    proceedings_title: { type: String, trim: true },
    dataset_title: { type: String, trim: true },
    reportSeries_title: { type: String, trim: true },
    book_title: { type: String, trim: true },
    referenceBook_title: { type: String, trim: true },
    referenceEntry_title: { type: String, trim: true },
    standard_title: { type: String, trim: true },
    standardSeries_title: { type: String, trim: true },
    editedBook_subtitle: { type: String, trim: true },
    report_subtitle: { type: String, trim: true },
    dissertation_subtitle: { type: String, trim: true },
    proceedingsArticle_subtitle: { type: String, trim: true },
    standard_subtitle: { type: String, trim: true },
    standardSeries_subtitle: { type: String, trim: true },
    journal_subtitle: { type: String, trim: true },
    journalArticle_subtitle: { type: String, trim: true },
    bookSeries_subtitle: { type: String, trim: true },
    monograph_subtitle: { type: String, trim: true },
    bookSet_subtitle: { type: String, trim: true },
    bookPart_subtitle: { type: String, trim: true },
    bookChapter_subtitle: { type: String, trim: true },
    bookSection_subtitle: { type: String, trim: true },
    bookTrack_subtitle: { type: String, trim: true },
    component_subtitle: { type: String, trim: true },
    proceedings_subtitle: { type: String, trim: true },
    dataset_subtitle: { type: String, trim: true },
    reportSeries_subtitle: { type: String, trim: true },
    book_subtitle: { type: String, trim: true },
    referenceBook_subtitle: { type: String, trim: true },
    referenceEntry_subtitle: { type: String, trim: true },
    monograph_edition: { type: String, trim: true },
    editedBook_edition: { type: String, trim: true },
    dissertation_edition: { type: String, trim: true },
    proceedings_edition: { type: String, trim: true },
    report_edition: { type: String, trim: true },
    book_edition: { type: String, trim: true },
    referenceBook_edition: { type: String, trim: true },
    standard_edition: { type: String, trim: true },
    journalVolume_number: { type: String, trim: true },
    journalIssue_number: { type: String, trim: true },
    journalArticle_number: { type: String, trim: true },
    bookPart_number: { type: String, trim: true },
    monograph_number: { type: String, trim: true },
    editedBook_number: { type: String, trim: true },
    component_number: { type: String, trim: true },
    bookSet_number: { type: String, trim: true },
    bookSeries_number: { type: String, trim: true },
    bookChapter_number: { type: String, trim: true },
    bookSection_number: { type: String, trim: true },
    bookTrack_number: { type: String, trim: true },
    proceedings_number: { type: String, trim: true },
    report_number: { type: String, trim: true },
    book_number: { type: String, trim: true },
    standard_number: { type: String, trim: true },
    referenceBook_number: { type: String, trim: true },
    referenceEntry_number: { type: String, trim: true },
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
    cites: [{ type: String, trim: true }], // reference entries
    partOf: { type: String, trim: true }, // link to other br
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
    source: { type: String, trim: true }
});



// we want to run a single elastic for the beginning. As the model name corresponds to the index name in elastic, we make
// sure that we do not mix up everything by adding the connection name to the index name
brSchema.plugin(mongoosastic,{
    index: config.DB.SCHEMA + '_br',
    host: config.SEARCHINDEX.HOST,
    port: config.SEARCHINDEX.PORT,
    protocol: config.SEARCHINDEX.PROTOCOL
});

var mongoBr = mongoose.model('br', brSchema);

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
}) ;




mongoBr.synchronize();

module.exports = {
    mongoBr: mongoBr,
    brSchema: brSchema
};
