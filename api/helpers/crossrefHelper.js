'use strict';

const crossref = require('crossref');
const Identifier = require('./../schema/identifier.js');
const BibliographicResource = require('./../schema/bibliographicResource.js');
const AgentRole = require('./../schema/agentRole.js');
const BibliographicEntry = require('./../schema/bibliographicEntry.js');
const ResourceEmbodiment = require('./../schema/resourceEmbodiment.js');
const enums = require('./../schema/enum.json');
const logger = require('./../util/logger.js');
const stringSimilarity = require('string-similarity');
const removeDiacritics = require('diacritics').remove;
const utf8 = require('utf8');
const async = require('async');

var CrossrefHelper = function(){
};

/**
 * Places a fuzzy string query to Crossref and returns an array of matching BRs
 * @param query
 * @param callback
 */
CrossrefHelper.prototype.query = function(query, callback){
    var self = this;
    // TODO: remove this, when they have fixed the issue
    query = removeDiacritics(query);
    crossref.works({query: query, mailto:"anne@informatik.uni-mannheim.de"}, (err, objs, nextOpts, done) => {
        if (err) {
            logger.error(err);
            return callback(err, null);
        }
        self.parseObjects(objs, function(err, res){
            if (err) {
                logger.error(err);
                return callback(err, null);
            }
            for(var parentChild of res){
                for(var br of parentChild){
                    br.status = enums.status.external;
                }
            }
            return callback(null, res);
        });
    });
};


/**
 * Places a fuzzy string query to Crossref for searching for chapter metadata via the container-title and returns an array of matching BRs
 * @param query
 * @param callback
 */
CrossrefHelper.prototype.queryChapterMetaData = function(containerTitle, firstPage, lastPage, callback){
    var self = this;
    // TODO: remove this, when they have fixed the issue
    containerTitle = utf8.encode(containerTitle);
    containerTitle = removeDiacritics(containerTitle);
    crossref.works({"query.container-title": containerTitle, mailto:"anne@informatik.uni-mannheim.de"}, (err, objs, nextOpts, done) => {
        if (err) {
            logger.error(err);
            return callback(err, null);
        }
        var candidates = [];
        for(var obj of objs){
            if(stringSimilarity.compareTwoStrings(obj['container-title'][0], containerTitle) > 0.95
                && (obj['page'] == firstPage + "-" + lastPage || obj['page'] == firstPage + "--" + lastPage)){
                logger.info("Match on pages and title, similarity = " + stringSimilarity.compareTwoStrings(obj['container-title'][0], containerTitle));
                candidates.push(obj);
            }
        }
        self.parseObjects(candidates, function(err, res){
            if (err) {
                logger.error(err);
                return callback(err, null);
            }
            if(res && res[0]) {
                return callback(null, res[0]);
            }else{
                return callback(null, []);
            }
        });
    });
};


/**
 * Retrieves references from Crossref given a DOI or a query string and returns an array of BRs
 * @param doi
 * @param query
 * @param callback
 */
CrossrefHelper.prototype.queryReferences = function(doi, query, callback){
    var self = this;
    if(doi != null){
        crossref.work(doi,(err, obj, nextOpts, done) => {
            if (err) {
                logger.error(err);
                return callback(err, null);
            }
            // check whether they really contain the 'reference' property
            var candidates = [];
            if(obj.reference){
                candidates.push(obj);
            }
            self.parseObjects(candidates, function(err, res){
                if (err) {
                    logger.error(err);
                    return callback(err, null);
                }
                return callback(null, res);
            });
        });
    }else if(query != null){
        // TODO: remove this, when they have fixed the issue
        query = removeDiacritics(query);
        crossref.works({query: query, filter:{"has-references" : true}, mailto: "anne@informatik.uni-mannheim.de"}, (err, objs, nextOpts, done) => {
            if (err) {
                logger.error(err);
                return callback(err, null);
            }
            // check whether they really contain the 'reference' property
            var candidates = [];
            for(var obj of objs){
                if(stringSimilarity.compareTwoStrings(obj['title'][0], query) > 0.95 && obj.reference){
                    logger.info("Match on pages and title, similarity = " + stringSimilarity.compareTwoStrings(obj['title'][0], query));
                    candidates.push(obj);
                }
            }
            self.parseObjects(candidates, function(err, res){
                if (err) {
                    logger.error(err);
                    return callback(err, null);
                }
                return callback(null, res);
            });
        });
    }
};


/**
 * Retrieves meta data from Crossref given a DOI
 * @param doi
 * @param callback
 */
CrossrefHelper.prototype.queryByDOI = function(doi, callback){
    var self = this;
    crossref.work(doi, (err, obj, nextOpts, done) => {
        if (err) {
            logger.error(err);
            return callback(err, null);
        }
        // check whether they really contain the 'reference' property
        var candidates = [];
        candidates.push(obj);
        self.parseObjects(candidates, function(err, res){
            if (err) {
                logger.error(err);
                return callback(err, null);
            }
            if (res.length >0){
                var result = res[0];
                return callback(null, result);
            }
            return callback(null, null);
        });
    });
};



CrossrefHelper.prototype.parseObjects = function(objects, callback){
    var self = this;
    async.map(objects, function(obj, cb){
        if(obj['container-title'] && obj['container-title'].length > 0){
            self.parseDependentResource(obj, function (err, result) {
                cb(err, result);
            });
        }else{
            self.parseIndependentResource(obj, function(err,result){
                cb(err, result);
            });
        }
    }, function(err, results) {
        return callback(null, results);
    });
};


CrossrefHelper.prototype.parseIndependentResource = function(obj, callback){
    var resource = new BibliographicResource({type: this.getType(obj.type)});

    // Identifiers
    if(obj.DOI){
        resource.pushIdentifierForType(resource.type, new Identifier({scheme: enums.identifier.doi, literalValue: obj.DOI}));
    }
    if(obj.URL){
        resource.pushIdentifierForType(resource.type, new Identifier({scheme: enums.identifier.crossrefUrl, literalValue: obj.URL}));
    }
    if(obj.ISBN && resource.type !== enums.resourceType.bookChapter && !obj['container-title']){
        for(var isbn of obj.ISBN){
            resource.pushIdentifierForType(resource.type, new Identifier({scheme: enums.identifier.isbn, literalValue: isbn}));
        }
    }

    // Contributors
    if(obj.author){
        for(var author of obj.author){
            resource.pushContributorForType(resource.type, new AgentRole({roleType: enums.roleType.author, heldBy: {givenName: author.given, familyName: author.family}}));
        }
    }
    if(obj.editor){
        for(var editor of obj.editor){
            resource.pushContributorForType(resource.type, new AgentRole({roleType: enums.roleType.editor, heldBy: {givenName: editor.given, familyName: editor.family}}));
        }
    }
    if(obj.publisher){
        resource.pushContributorForType(resource.type, new AgentRole({roleType: enums.roleType.publisher, heldBy: {nameString: obj.publisher}}));
    }

    // Numbers/ Edition
    if(obj.edition_number){
        resource.setEditionForType(resource.type, obj.edition_number);
    }
    if(obj['article-number']){
        resource.setNumberForType(resource.type, obj['article-number']);
    }

    // Titles
    resource.setTitleForType(resource.type, (obj.title && obj.title[0] ? obj.title[0] : ""));
    resource.setSubtitleForType(resource.type, obj.subtitle && obj.subtitle[0] ? obj.subtitle[0] : "");

    // Embodiment
    if(obj.page){
        var firstPage = obj.page && obj.page.split('-').length == 2  ? obj.page.split('-')[0] : obj.page ;
        var lastPage = obj.page && obj.page.split('-').length == 2 ? obj.page.split('-')[1] : "" ;
        resource.pushResourceEmbodimentForType(resource.type, new ResourceEmbodiment({firstPage: firstPage, lastPage:lastPage}));
    }

    // Publication Year
    if(obj['issued'] && obj['issued']['date-parts'] && obj['issued']['date-parts'][0] && obj['issued']['date-parts'][0][0]){
        if(obj['issued']['date-time']){
            resource.setPublicationDateForType(resource.type, obj['issued']['date-time']);
        }else{
            resource.setPublicationDateForType(resource.type, obj['issued']['date-parts'][0][0]);
        }
    }else if (obj['published-print'] && obj['published-print']['date-parts'] && obj['published-print']['date-parts'][0] && obj['published-print']['date-parts'][0][0]){
        if(obj['published-print']['date-time']){
            resource.setPublicationDateForType(resource.type, obj['published-print']['date-time']);
        }else{
            resource.setPublicationDateForType(resource.type, obj['published-print']['date-parts'][0][0]);
        }
    }else if(obj['published-online'] && obj['published-online']['date-parts'] && obj['published-online']['date-parts'][0] && obj['published-online']['date-parts'][0][0]){
        if(obj['published-online']['date-time']){
            resource.setPublicationDateForType(resource.type, obj['published-online']['date-time']);
        }else{
            resource.setPublicationDateForType(resource.type, obj['published-online']['date-parts'][0][0]);
        }
    }
    this.parseReferences(obj, function(err, bes){
        resource.parts = bes;
        return callback(null, [resource]);
    });
};

CrossrefHelper.prototype.getCrossrefParentType = function (child, obj) {
    if(child.type === enums.resourceType.journalArticle && !obj.issue && !obj.volume){
        return enums.resourceType.journal;
    }else if (child.type === enums.resourceType.journalArticle && !obj.issue){
        return enums.resourceType.journalVolume;
    }else{
        return child.getContainerTypeForType(child.type).length > 0 ? child.getContainerTypeForType(child.type)[0] : "";
    }
}

CrossrefHelper.prototype.parseDependentResource = function(obj, callback){
    var self = this;

    return this.parseIndependentResource(obj, function(err, res){
        var child = res[0];
        var parentType = self.getCrossrefParentType(child, obj);
        if(parentType === ""){
            return callback(null,[child]);
        }
        var parent = new BibliographicResource({type: parentType});

        // set the general parent properties
        if(child.type === enums.resourceType.journalArticle){
            parent.setTitleForType(enums.resourceType.journal, obj['container-title'][0]);
        }else{
            parent.setTitleForType(parentType, obj['container-title'][0]);
        }

        if(obj.editor){
            for(var editor of obj.editor){
                parent.pushContributorForType(parent.type, new AgentRole({roleType: enums.roleType.editor, heldBy: {givenName: editor.given, familyName: editor.family}}));
            }
        }
        if(obj.publisher){
            parent.pushContributorForType(parent.type, new AgentRole({roleType: enums.roleType.publisher, heldBy: {nameString: obj.publisher}}));
        }
        if(obj.ISSN && child.type == enums.resourceType.journalArticle){
            for(var issn of obj.ISSN){
                parent.pushIdentifierForType(enums.resourceType.journal, new Identifier({scheme: enums.identifier.issn, literalValue: issn}));
            }
        }else if(obj.ISSN){
            for(var issn of obj.ISSN){
                parent.pushIdentifierForType(enums.resourceType.bookSeries, new Identifier({scheme: enums.identifier.issn, literalValue: issn}));
            }
        }
        if(obj.ISBN){
            for(var isbn of obj.ISBN){
                parent.pushIdentifierForType(parent.type, new Identifier({scheme: enums.identifier.isbn, literalValue: isbn}));
            }
        }
        if(obj.issue){
            parent.setNumberForType(enums.resourceType.journalIssue, obj.issue);
        }
        if(obj.volume){
            parent.setNumberForType(enums.resourceType.journalVolume, obj.volume);
        }
        return callback(null,[child, parent]);
    });
};


/**
 * Given a crossref type, it returns the matching internal enum
 * @param type
 * @returns type
 */
CrossrefHelper.prototype.getType = function(type){
    switch(type){
        case 'journal-article':
            return enums.resourceType.journalArticle;
        case 'journal':
            return enums.resourceType.journal;
        case 'journal-issue':
            return enums.resourceType.journalIssue;
        case 'journal-volume':
            return enums.resourceType.journalVolume;
        case 'book':
            return enums.resourceType.book;
        case 'book-chapter':
            return enums.resourceType.bookChapter;
        case 'book-part':
            return enums.resourceType.bookPart;
        case 'book-section':
            return enums.resourceType.bookSection;
        case 'book-series':
            return enums.resourceType.bookSeries;
        case 'book-set':
            return enums.resourceType.bookSet;
        case 'book-track':
            return enums.resourceType.bookTrack;
        case 'edited-book':
            return enums.resourceType.editedBook;
        case 'component':
            return enums.resourceType.component;
        case 'dataset':
            return enums.resourceType.dataset;
        case 'dissertation':
            return enums.resourceType.dissertation;
        case 'proceedings':
            return enums.resourceType.proceedings;
        case 'proceedings-article':
            return enums.resourceType.proceedingsArticle;
        case 'monograph':
            return enums.resourceType.monograph;
        case 'reference-book':
            return enums.resourceType.referenceBook;
        case 'reference-entry':
            return enums.resourceType.referenceEntry;
        case 'report':
            return enums.resourceType.report;
        case 'report-series':
            return enums.resourceType.reportSeries;
        case 'standard':
            return enums.resourceType.standard;
        case 'standard-series':
            return enums.resourceType.standardSeries;
    }
};


/**
 * Extracts the references from a given crossref object
 * @param obj
 */
CrossrefHelper.prototype.parseReferences = function(obj, callback){
    // Reference list
    if(obj.reference){
        var bes = [];
        for(var reference of obj.reference){
            var referenceTitle = reference['article-title'] ? reference['article-title'] : "";
            var referenceAuthor = reference.author ? reference.author : "";
            var referenceYear = reference.year ? reference.year : "";
            var referenceJournal = reference['journal-title'] ? reference['journal-title'] : "";
            var referenceVolume = reference.volume ? reference.volume : "";
            var referenceComments = reference['first-page']? "First page: " + reference['first-page'] : "";


            if(referenceTitle === ""){
                referenceTitle = reference['volume-title'] ? reference['volume-title'] : "";
            }

            var bibliographicEntry = new BibliographicEntry({
                identifiers:[new Identifier({scheme: enums.identifier.doi, literalValue: reference.DOI})],
                bibliographicEntryText: reference.unstructured,
                ocrData:{
                    title: referenceTitle,
                    date: referenceYear,
                    authors: [referenceAuthor],
                    journal: referenceJournal,
                    volume: referenceVolume,
                    comments: referenceComments
                },
                status: enums.status.external});

            bes.push(bibliographicEntry);
        }
    }
    return callback(null, bes);
};


/**
 * Factory function
 *
 * @returns {CrossrefHelper}
*/
function createCrossrefHelper() {
    return new CrossrefHelper();
}


module.exports = {
        createCrossrefHelper : createCrossrefHelper
};