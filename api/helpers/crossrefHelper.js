'use strict';

const crossref = require('crossref');
const Identifier = require('./../schema/identifier.js');
const BibliographicResource = require('./../schema/bibliographicResource.js');
const AgentRole = require('./../schema/agentRole.js');
const BibliographicEntry = require('./../schema/bibliographicEntry.js');
const ResourceEmbodiment = require('./../schema/resourceEmbodiment.js');
const enums = require('./../schema/enum.json');
const errorlog = require('./../util/logger.js').errorlog;
const stringSimilarity = require('string-similarity');
const removeDiacritics = require('diacritics').remove;
const utf8 = require('utf8');

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
            errorlog.error(err);
            return callback(err, null);
        }
        self.parseObjects(objs, function(err, res){
            if (err) {
                errorlog.error(err);
                return callback(err, null);
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
    //containerTitle = utf8.encode(containerTitle);
    containerTitle = removeDiacritics(containerTitle);
    crossref.works({"query.container-title": containerTitle, mailto:"anne@informatik.uni-mannheim.de"}, (err, objs, nextOpts, done) => {
        if (err) {
            errorlog.error(err);
            return callback(err, null);
        }
        var candidates = [];
        for(var obj of objs){
            if(stringSimilarity.compareTwoStrings(obj['container-title'][0], containerTitle) > 0.95
                && (obj['page'] == firstPage + "-" + lastPage || obj['page'] == firstPage + "--" + lastPage)){
                console.log("Match on pages and title, similarity = " + stringSimilarity.compareTwoStrings(obj['container-title'][0], containerTitle));
                candidates.push(obj);
            }
        }
        self.parseObjects(candidates, function(err, res){
            if (err) {
                errorlog.error(err);
                return callback(err, null);
            }
            return callback(null, res);
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
                errorlog.error(err);
                return callback(err, null);
            }
            // check whether they really contain the 'reference' property
            var candidates = [];
            if(obj.reference){
                candidates.push(obj);
            }
            self.parseObjects(candidates, function(err, res){
                if (err) {
                    errorlog.error(err);
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
                errorlog.error(err);
                return callback(err, null);
            }
            // check whether they really contain the 'reference' property
            var candidates = [];
            for(var obj of objs){
                if(obj.reference){
                    candidates.push(obj);
                }
            }
            self.parseObjects(candidates, function(err, res){
                if (err) {
                    errorlog.error(err);
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
            errorlog.error(err);
            return callback(err, null);
        }
        var candidates = [];
        candidates.push(obj);
        self.parseObjects(candidates, function(err, res){
            if (err) {
                errorlog.error(err);
                return callback(err, null);
            }
            if (res.length > 0){
                return callback(null, res);
            }
            return callback(null, null);
        });
    });
};


CrossrefHelper.prototype.parseObjects = function(objects, callback){
    var res = [];
    for(var obj of objects){

        // everything related to the object itself
        var identifiers = [];

        if(obj.DOI){
            var identifier = new Identifier({scheme: enums.identifier.doi, literalValue: obj.DOI});
            identifiers.push(identifier.toObject());
        }
        if(obj.URL){
            var identifier = new Identifier({scheme: enums.externalSources.crossref, literalValue: obj.URL});
            identifiers.push(identifier.toObject());
        }

        // Contributors
        var contributors = [];
        if(obj.author){
            for(var author of obj.author){
                var agentRole = new AgentRole({roleType: enums.roleType.author, heldBy: {nameString: (author.family + " " + author.given), givenName: author.given, familyName: author.family}});
                contributors.push(agentRole.toObject());
            }
        }
        if(obj.publisher){
            var agentRole = new AgentRole({roleType: enums.roleType.publisher, heldBy: {nameString: obj.publisher}});
            contributors.push(agentRole.toObject());
        }

        var title = obj.title && obj.title[0] ? obj.title[0] : "";
        var subtitle = obj.subtitle && obj.subtitle[0] ? obj.subtitle[0] : "";
        var firstPage = obj.page && obj.page.split('-').length == 2  ? obj.page.split('-')[0] : obj.page;
        var lastPage = obj.page && obj.page.split('-').length == 2 ? obj.page.split('-')[1] : "";
        var embodiedAs = [new ResourceEmbodiment({firstPage: firstPage, lastPage:lastPage})];
        var containerTitle = obj['container-title'] && obj['container-title'][0] ? obj['container-title'][0] : "";

        var type="";
        switch(obj.type){
            case 'journal-article':
                type = enums.resourceType.journalArticle;
                break;
            case 'journal-issue':
                type = enums.resourceType.journalIssue;
                break;
            case 'journal-volume':
                type = enums.resourceType.journalVolume;
                break;
            case 'journal':
                type = enums.resourceType.journal;
                break;
            case 'book':
                type = enums.resourceType.book;
                break;
            case 'book-set':
                type = enums.resourceType.bookSet;
                break;
            case 'book-chapter':
                type = enums.resourceType.bookChapter;
                break;
            case 'book-part':
                type = enums.resourceType.bookPart;
                break;
            case 'book-series':
                type = enums.resourceType.bookSeries;
                break;
            case 'book-section':
                type = enums.resourceType.bookSection;
                break;
            case 'book-track':
                type = enums.resourceType.bookTrack;
                break;
            case 'edited-book':
                type = enums.resourceType.editedBook;
                break;
            case 'component':
                type = enums.resourceType.component;
                break;
            case 'dataset':
                type = enums.resourceType.dataset;
                break;
            case 'dissertation':
                type = enums.resourceType.dissertation;
                break;
            case 'monograph':
                type = enums.resourceType.monograph;
                break;
            case 'proceedings':
                type = enums.resourceType.proceedings;
                break;
            case 'proceedings-article':
                type = enums.resourceType.proceedingsArticle;
                break;
            case 'reference-book':
                type = enums.resourceType.referenceBook;
                break;
            case 'reference-entry':
                type = enums.resourceType.referenceEntry;
                break;
            case 'report-series':
                type = enums.resourceType.reportSeries;
                break;
            case 'report':
                type = enums.resourceType.report;
                break;
            case 'standard-series':
                type = enums.resourceType.standardSeries;
                break;
            case 'standard':
                type = enums.resourceType.standard;
                break;
        }

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



        var bibliographicResource = new BibliographicResource({
            title: title,
            subtitle: subtitle,
            contributors: contributors,
            identifiers: identifiers,
            status: enums.status.external,
            parts: bes,
            embodiedAs: embodiedAs,
            containerTitle: containerTitle,
            type: type
        });

        res.push(bibliographicResource.toObject());

        if(bibliographicResource.type === enums.resourceType.journalArticle){
            // here we have to extract the information about the journal, the issue and the volume
            var journalIdentifiers = [];
            if(obj.ISSN){
                for(var issn of obj.ISSN){
                    var identifier = new Identifier({scheme: enums.identifier.issn, literalValue: issn});
                    journalIdentifiers.push(identifier.toObject())
                }
            }
            var journalContributors = [];

            if(obj.publisher){
                var agentRole = new AgentRole({roleType: enums.roleType.publisher, heldBy: {nameString: obj.publisher}});
                journalContributors.push(agentRole.toObject());
            }

            var journal = new BibliographicResource({
                identfifiers: journalIdentifiers,
                contributors: journalContributors,
                title: containerTitle,
                type: enums.resourceType.journal
            });

            var issue = new BibliographicResource({
                contributors: journalContributors,
                number: obj.issue ? obj.issue : "",
                type: enums.resourceType.journalIssue
            });

            var volume = new BibliographicResource({
                contributors: journalContributors,
                number: obj.volume ? obj.volume : "",
                type: enums.resourceType.journalVolume
            });

            res.push(issue);
            res.push(volume);
            res.push(journal);
        }
    }
    callback(null, res);
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