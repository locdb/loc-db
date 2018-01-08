'use strict';
const SchemaObject = require('schema-object');
const BibliographicEntry = require('./bibliographicEntry.js');
const Identifier = require('./identifier.js');
const AgentRole = require('./agentRole');
const status = require('./enum.json').status;
const resourceType = require('./enum.json').resourceType;
const ResourceEmbodiment = require('./resourceEmbodiment');
const _ = require('underscore.string');

var bibliographicResource = new SchemaObject({
    _id: 'any',
    journal_identifiers: [{type: Identifier}],
    journalVolume_identifiers: [{type: Identifier}],
    journalIssue_identifiers: [{type: Identifier}],
    journalArticle_identifiers: [{type: Identifier}],
    monograph_identifiers: [{type: Identifier}],
    editedBook_identifiers: [{type: Identifier}],
    bookSeries_identifiers: [{type: Identifier}],
    bookSet_identifiers: [{type: Identifier}],
    bookChapter_identifiers: [{type: Identifier}],
    bookSection_identifiers: [{type: Identifier}],
    bookPart_identifiers: [{type: Identifier}],
    bookTrack_identifiers: [{type: Identifier}],
    component_identifiers: [{type: Identifier}],
    dissertation_identifiers: [{type: Identifier}],
    proceedingsArticle_identifiers: [{type: Identifier}],
    proceedings_identifiers: [{type: Identifier}],
    dataset_identifiers: [{type: Identifier}],
    report_identifiers: [{type: Identifier}],
    reportSeries_identifiers: [{type: Identifier}],
    book_identifiers: [{type: Identifier}],
    referenceBook_identifiers: [{type: Identifier}],
    referenceEntry_identifiers: [{type: Identifier}],
    standard_identifiers: [{type: Identifier}],
    standardSeries_identifiers: [{type: Identifier}],
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
    journal_contributors: [{type: AgentRole}],
    report_contributors: [{type: AgentRole}],
    journalVolume_contributors: [{type: AgentRole}],
    journalIssue_contributors: [{type: AgentRole}],
    journalArticle_contributors: [{type: AgentRole}],
    monograph_contributors: [{type: AgentRole}],
    editedBook_contributors: [{type: AgentRole}],
    bookSeries_contributors: [{type: AgentRole}],
    proceedingsArticle_contributors: [{type: AgentRole}],
    bookSet_contributors: [{type: AgentRole}],
    bookChapter_contributors: [{type: AgentRole}],
    dataset_contributors: [{type: AgentRole}],
    bookTrack_contributors: [{type: AgentRole}],
    component_contributors: [{type: AgentRole}],
    dissertation_contributors: [{type: AgentRole}],
    proceedings_contributors: [{type: AgentRole}],
    reportSeries_contributors: [{type: AgentRole}],
    book_contributors: [{type: AgentRole}],
    referenceBook_contributors: [{type: AgentRole}],
    referenceEntry_contributors: [{type: AgentRole}],
    standard_contributors: [{type: AgentRole}],
    standardSeries_contributors: [{type: AgentRole}],
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
    status: {type: String, enum: [status.external, status.valid]},
    parts: [{type: BibliographicEntry}], // links to other brs
    monograph_embodiedAs: [{type: ResourceEmbodiment}],
    editedBook_embodiedAs: [{type: ResourceEmbodiment}],
    bookSeries_embodiedAs: [{type: ResourceEmbodiment}],
    bookSet_embodiedAs: [{type: ResourceEmbodiment}],
    bookChapter_embodiedAs: [{type: ResourceEmbodiment}],
    bookSection_embodiedAs: [{type: ResourceEmbodiment}],
    bookPart_embodiedAs: [{type: ResourceEmbodiment}],
    bookTrack_embodiedAs: [{type: ResourceEmbodiment}],
    component_embodiedAs: [{type: ResourceEmbodiment}],
    dissertation_embodiedAs: [{type: ResourceEmbodiment}],
    proceedingsArticle_embodiedAs: [{type: ResourceEmbodiment}],
    proceedings_embodiedAs: [{type: ResourceEmbodiment}],
    journal_embodiedAs: [{type: ResourceEmbodiment}],
    journalVolume_embodiedAs: [{type: ResourceEmbodiment}],
    journalIssue_embodiedAs: [{type: ResourceEmbodiment}],
    journalArticle_embodiedAs: [{type: ResourceEmbodiment}],
    dataset_embodiedAs: [{type: ResourceEmbodiment}],
    report_embodiedAs: [{type: ResourceEmbodiment}],
    reportSeries_embodiedAs: [{type: ResourceEmbodiment}],
    book_embodiedAs: [{type: ResourceEmbodiment}],
    referenceBook_embodiedAs: [{type: ResourceEmbodiment}],
    referenceEntry_embodiedAs: [{type: ResourceEmbodiment}],
    standard_embodiedAs: [{type: ResourceEmbodiment}],
    standardSeries_embodiedAs: [{type: ResourceEmbodiment}]
}, {
    methods: {
        getAllTypes: function(){
            var types = [];
            for (var type in resourceType) {
                types.push(resourceType[type]);
            }
            return types;
        },
        getPropertyForTypes:function(propertyName, types){
            var properties = [];
            for (var type of types) {
                var prefix = this.getPropertyPrefixForType(type);
                for (var property in this) {
                    if (property.includes(prefix + propertyName)){
                        properties.push(property);
                    }
                }
            }
            return properties;
        },
        /**
         * Returns the property prefix for a given type
         * @param type
         * @returns {string}
         */
        getPropertyPrefixForType: function (type) {
            return type.split("_").length > 1 ?
                _.camelize(type.split("_")[0].toLowerCase()+ "-" + type.split("_")[1].toLowerCase()) + "_" :
                type.split("_")[0].toLowerCase() + "_";
        },
        getPropertyPrefixForPreferredParent: function(type){

        },
        /**
         * Given a resource type, this function returns all possible parent resource types. The position 0 indicates our preferred type.
         * @param type {string}
         * @returns {*}
         */
        getContainerTypeForType: function(type){
            switch(type){
                case resourceType.monograph || resourceType.editedBook || resourceType.book || resourceType.referenceBook:
                    return [resourceType.bookSet, resourceType.bookSeries];
                case resourceType.bookSet:
                    return [resourceType.bookSeries]
                case resourceType.bookChapter || resourceType.bookSection || resourceType.bookPart || resourceType.bookTrack || resourceType.component:
                    return [resourceType.editedBook, resourceType.book, resourceType.monograph]
                case resourceType.proceedingsArticle:
                    return [resourceType.proceedings]
                case resourceType.journalArticle:
                    return [resourceType.journalIssue, resourceType.journalVolume, resourceType.journal]
                case resourceType.journalIssue:
                    return [resourceType.journalVolume, resourceType.journal]
                case resourceType.journalVolume:
                    return [resourceType.journal]
                case resourceType.report:
                    return [resourceType.reportSeries]
                case resourceType.referenceEntry:
                    return [resourceType.referenceBook]
                case resourceType.standard:
                    return [resourceType.standardSeries]
                case resourceType.dataset:
                    return [resourceType.dataset]
                default:
                    return []
            }
        },
         /**
         * Setter and getter for all properties with dynamically computed properties
         * @param type
         * @param value (only for setters)
         */
        setTitleForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'title'] = value;
        },
        getTitleForType: function(type){
            var prefix = this.getPropertyPrefixForType(type);
            return this[prefix + 'title'];
        },
        setSubtitleForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'subtitle'] = value;
        },
        getSubtitleForType: function(type){
            var prefix = this.getPropertyPrefixForType(type);
            return this[prefix + 'subtitle'];
        },
        setEditionForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'edition'] = value;
        },
        getEditionForType: function(type){
            var prefix = this.getPropertyPrefixForType(type);
            return this[prefix + 'edition'];
        },
        setNumberForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'number'] = value;
        },
        getNumberForType: function(type){
            var prefix = this.getPropertyPrefixForType(type);
            return this[prefix + 'number'];
        },
        setPublicationYearForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'publicationYear'] = value;
        },
        getPublicationYearForType: function(type){
            var prefix = this.getPropertyPrefixForType(type);
            return this[prefix + 'publicationYear'];
        },
        setIdentifiersForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'identifiers'] = value;
        },
        pushIdentifierForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'identifiers'].push(value);
        },
        getIdentifiersForType: function(type){
            var prefix = this.getPropertyPrefixForType(type);
            return this[prefix + 'identifiers'];
        },
        setContributorsForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'contributors'] = value;
        },
        pushContributorForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'contributors'].push(value);
        },
        getContributorsForType: function(type){
            var prefix = this.getPropertyPrefixForType(type);
            return this[prefix + 'contributors'];
        },
        setResourceEmbodimentsForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'embodiedAs'] = value;
        },
        pushResourceEmbodimentForType: function (type, value) {
            var prefix = this.getPropertyPrefixForType(type);
            this[prefix + 'embodiedAs'].push(value);
        },
        getResourceEmbodimentsForType: function(type){
            var prefix = this.getPropertyPrefixForType(type);
            return this[prefix + 'embodiedAs'];
        }
    }
});

module.exports = bibliographicResource;