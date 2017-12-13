
// The bibliographicResource model
const mongoose = require('mongoose')
       ,Schema = mongoose.Schema
       ,ObjectId = Schema.ObjectId;
const enums = require('./../schema/enum.json');
const mongoosastic = require('mongoosastic');
const config = require('./../../config/config');


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
    journalArticle_publicationYear: String,
    monograph_publicationYear: String,
    report_publicationYear: String,
    editedBook_publicationYear: String,
    dissertation_publicationYear: String,
    proceedingsArticle_publicationYear: String,
    dataset_publicationYear: String,
    proceedings_publicationYear: String,
    book_publicationYear: String,
    referenceBook_publicationYear: String,
    standard_publicationYear: String,
    cites: [String], // reference entries
    partOf: String, // link to other br
    status: {type: String, enum: [enums.status.external, enums.status.valid]},
    parts: [beSchema], // links to other brs
    monograph_embodiedAs: [resourceEmbodimentSchema],
    editedBook_embodiesAs: [resourceEmbodimentSchema],
    bookSeries_embodiesAs: [resourceEmbodimentSchema],
    bookSet_embodiesAs: [resourceEmbodimentSchema],
    bookChapter_embodiesAs: [resourceEmbodimentSchema],
    bookSet_section: [resourceEmbodimentSchema],
    bookPart_embodiesAs: [resourceEmbodimentSchema],
    bookTrack_embodiesAs: [resourceEmbodimentSchema],
    component_embodiesAs: [resourceEmbodimentSchema],
    dissertation_embodiesAs: [resourceEmbodimentSchema],
    proceedingsArticle_embodiesAs: [resourceEmbodimentSchema],
    proceedings_embodiesAs: [resourceEmbodimentSchema],
    journal_embodiesAs: [resourceEmbodimentSchema],
    journalVolume_embodiesAs: [resourceEmbodimentSchema],
    journalIssue_embodiesAs: [resourceEmbodimentSchema],
    journalArticle_embodiesAs: [resourceEmbodimentSchema],
    dataset_embodiesAs: [resourceEmbodimentSchema],
    report_embodiesAs: [resourceEmbodimentSchema],
    reportSeries_embodiesAs: [resourceEmbodimentSchema],
    book_embodiesAs: [resourceEmbodimentSchema],
    referenceBook_embodiesAs: [resourceEmbodimentSchema],
    referenceEntry_embodiesAs: [resourceEmbodimentSchema],
    standard_embodiesAs: [resourceEmbodimentSchema],
    standardSeries_embodiedAs:[resourceEmbodimentSchema]
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
br.synchronize();

module.exports = br;
