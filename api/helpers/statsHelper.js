'use strict';
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');
const enums = require('./../schema/enum.json');
const mongoBr= require('./../models/bibliographicResource').mongoBr;
const async = require('async');

var StatsHelper = function(){
};

StatsHelper.prototype.groupBy = function(collection, property) {
    var i = 0, val, index,
        values = [], result = [];
    for (; i < collection.length; i++) {
        val = collection[i][property];
        index = values.indexOf(val);
        if (index > -1)
            result[index].push(collection[i]);
        else {
            values.push(val);
            result.push([collection[i]]);
        }
    }
    return result;
};


StatsHelper.prototype.brStats = function(callback){
    var self = this;
    var stats = {};
    mongoBr.find({},{},function(err,docs){
        if(err){
            logger.error(err);
            return callback(err, null);
        }
        stats.total = docs.length;
        var typeGroups = self.groupBy(docs, "type");
        var identifiers = [];
        for(var br of docs){
            var helper = new BibliographicResource(br);
            var helperTypes = helper.getAllTypesOfThis();
            for(var t of helperTypes){
                var identifiers = identifiers.concat(helper.getIdentifiersForType(t));
            }
        }
        var identifierGroups = self.groupBy(identifiers, "scheme");
        stats.types = {};
        stats.identifiers = {};
        stats.identifiers.total = identifiers.length;
        for(var tg of typeGroups){
            stats.types[tg[0].type] = tg.length;
        }
        for(var ig of identifierGroups){
            stats.identifiers[ig[0].scheme] = ig.length;
        }
        return callback(null, stats);
    });
};

StatsHelper.prototype.logStats = function(callback){
    var self = this;
    var stats = {};
    logger.query({limit: 10},function(err, results){
        return callback(null, results);
    });

    // read log
    // filter log according to old stats script
};

StatsHelper.prototype.mandatoryFieldsStats = function(callback) {
    let self = this;
    let stats = {};
    let typeList = [];

    // generate a list of valid types
    for(let t in enums.resourceType){
        typeList.push(enums.resourceType[t]);
    }

    // retrieve all data
    mongoBr.find({}, {}, function (err, docs) {
        if (err) {
            logger.error(err);
            return callback(err, null);
        }
        stats.total = docs.length;
        var typeGroups = self.groupBy(docs, "type");
        stats.wrongType = 0;

        // check for invalid types
        // conduct per-type field checking
        async.map(typeGroups, function(tg, cb){
            if(typeList.indexOf(tg[0].type) < 0){
                stats.wrongType = stats.wrongType + tg.length;
                cb(null, [tg[0].type, {}]);
            }else{
                switch(tg[0].type){
                    case enums.resourceType.book:
                        self.mandatoryFieldsBook(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.bookChapter:
                        self.mandatoryFieldsBookChapter(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.bookPart:
                        self.mandatoryFieldsBookPart(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.bookSet:
                        self.mandatoryFieldsBookSet(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.bookSection:
                        self.mandatoryFieldsBookSection(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.bookSeries:
                        self.mandatoryFieldsBookSeries(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.bookTrack:
                        self.mandatoryFieldsBookTrack(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.editedBook:
                        self.mandatoryFieldsEditedBook(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.component:
                        self.mandatoryFieldsComponent(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.dataset:
                        self.mandatoryFieldsDataset(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.dissertation:
                        self.mandatoryFieldsDissertation(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.journal:
                        self.mandatoryFieldsJournal(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.journalArticle:
                        self.mandatoryFieldsJournalArticle(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.journalIssue:
                        self.mandatoryFieldsJournalIssue(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.journalVolume:
                        self.mandatoryFieldsJournalVolume(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.monograph:
                        self.mandatoryFieldsMonograph(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.proceedings:
                        self.mandatoryFieldsProceedings(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.proceedingsArticle:
                        self.mandatoryFieldsProceedingsArticle(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.referenceBook:
                        self.mandatoryFieldsReferenceBook(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.referenceEntry:
                        self.mandatoryFieldsReferenceEntry(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.report:
                        self.mandatoryFieldsReport(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.reportSeries:
                        self.mandatoryFieldsReportSeries(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.standard:
                        self.mandatoryFieldsStandard(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    case enums.resourceType.standardSeries:
                        self.mandatoryFieldsStandardSeries(tg, function(err, res){
                            cb(err, [tg[0].type, res]);
                        });
                        break;
                    default:
                        cb(null, [tg[0].type, {}]);
                }
            }
        }, function(err, result){
            stats.wrongTypeFraction = stats.wrongType / stats.total;
            result.map(function(r){
                for(let key in r[1]){
                    if(key !== "contributorStats" && key !== "embodimentStats" && key !== "total"){
                        let fractionKey = key + "Fraction";
                        r[1][fractionKey] = r[1][key] / r[1].total;
                    }else{
                        for(let subKey in r[1][key]){
                            if(subKey !== "total" && subKey !== "missingEmbodiments" && subKey !== "missingContributors"){
                                let fractionKey = subKey + "Fraction";
                                r[1][key][fractionKey] = r[1][key][subKey] / r[1][key].total;
                            }
                        }
                    }
                }
                stats[r[0]]= r[1];
            });
            return callback(null, stats);
        });
    });
};

StatsHelper.prototype.mandatoryFieldsBook = function(books, callback) {
    let self = this;

    async.map(books, function(book, cb){
        // check single resource for all the mandatory fields
        book = new BibliographicResource(book);
        let individualStats = {};
        individualStats.missingPublicationDate = 0;
        individualStats.missingTitle = 0;

        if(!book.getPublicationDateForType() || book.getPublicationDateForType() === "" || book.getPublicationDateForType() === " " || !book.getPublicationDateForType() instanceof Date){
            individualStats.missingPublicationDate = 1;
        }
        if(!book.getTitleForType() || book.getTitleForType() === "" || book.getTitleForType() === " "){
            individualStats.missingTitle = 1;
        }

        self.mandatoryFieldsContributors(book.getContributorsForType(), function(err, contributorStats){
            individualStats.contributorStats = contributorStats;

            return cb(err, individualStats);
        });

    }, function(err, res){
        let stats = res.reduce(self.sumMissingFields);
        stats.total = res.length;
        return callback(err, stats);
    });
};


StatsHelper.prototype.mandatoryFieldsBookChapter = function(bookChapters, callback) {
    let self = this;

    async.map(bookChapters, function(bookChapter, cb){
        // check single resource for all the mandatory fields
        bookChapter = new BibliographicResource(bookChapter);
        let individualStats = {};
        individualStats.missingPublicationDate = 0;
        individualStats.missingTitle = 0;
        individualStats.missingPartOf = 0;

        if(!bookChapter.getPublicationDateForType() || bookChapter.getPublicationDateForType() === "" || bookChapter.getPublicationDateForType() === " " || !bookChapter.getPublicationDateForType() instanceof Date){
            individualStats.missingPublicationDate = 1;
        }
        if(!bookChapter.getTitleForType() || bookChapter.getTitleForType() === "" || bookChapter.getTitleForType() === " "){
            individualStats.missingTitle = 1;
        }
        if(!bookChapter.partOf || bookChapter.partOf === "" || bookChapter.partOf === " "){
            individualStats.missingPartOf = 1;
        }

        self.mandatoryFieldsContributors(bookChapter.getContributorsForType(), function(err, contributorStats){
            individualStats.contributorStats = contributorStats;
            self.mandatoryFieldsResourceEmbodiments(bookChapter.getResourceEmbodimentsForType(), function(err, embodimentStats){
                individualStats.embodimentStats = embodimentStats;
                return cb(err, individualStats);
            });
        });

    }, function(err, res){
        let stats = res.reduce(self.sumMissingFields);
        stats.total = res.length;
        return callback(err, stats);
    });
};


StatsHelper.prototype.mandatoryFieldsBookPart = function(bookParts, callback) {
    let self = this;

    async.map(bookParts, function(bookPart, cb){
        // check single resource for all the mandatory fields
        bookPart = new BibliographicResource(bookPart);
        let individualStats = {};
        individualStats.missingPublicationDate = 0;
        individualStats.missingTitle = 0;
        individualStats.missingPartOf = 0;

        if(!bookPart.getPublicationDateForType() || bookPart.getPublicationDateForType() === "" || bookPart.getPublicationDateForType() === " " || !bookPart.getPublicationDateForType() instanceof Date){
            individualStats.missingPublicationDate = 1;
        }
        if(!bookPart.getTitleForType()|| bookPart.getTitleForType() === "" || bookPart.getTitleForType() === " "){
            individualStats.missingTitle = 1;
        }
        if(!bookPart.partOf || bookPart.partOf === "" || bookPart.partOf === " "){
            individualStats.missingPartOf = 1;
        }
        self.mandatoryFieldsResourceEmbodiments(bookPart.getResourceEmbodimentsForType(), function(err, embodimentStats){
            individualStats.embodimentStats = embodimentStats;
            return cb(err, individualStats);
        });
    }, function(err, res){
        let stats = res.reduce(self.sumMissingFields);
        stats.total = res.length;
        return callback(err, stats);
    });
};

StatsHelper.prototype.mandatoryFieldsBookSection = function(bookSections, callback) {
    let self = this;
    self.mandatoryFieldsBookPart(bookSections, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsBookSeries = function(bookSeries, callback) {
    let self = this;

    async.map(bookSeries, function(bookSer, cb){
        // check single resource for all the mandatory fields
        bookSer = new BibliographicResource(bookSer);
        let individualStats = {};
        individualStats.missingTitle = 0;
        if(!bookSer.getTitleForType() || bookSer.getTitleForType()  === "" || bookSer.getTitleForType()  === " "){
            individualStats.missingTitle = 1;
        }
        return cb(null, individualStats);
    }, function(err, res){
        let stats = res.reduce(self.sumMissingFields);
        stats.total = res.length;
        return callback(err, stats);
    });
};


StatsHelper.prototype.mandatoryFieldsBookSet = function(bookSets, callback) {
    let self = this;

    async.map(bookSets, function(bookSet, cb){
        // check single resource for all the mandatory fields
        bookSet = new BibliographicResource(bookSet);
        let individualStats = {};
        individualStats.missingTitle = 0;
        if(!bookSet.getTitleForType() || bookSet.getTitleForType() === "" || bookSet.getTitleForType() === " "){
            individualStats.missingTitle = 1;
        }
        self.mandatoryFieldsContributors(bookSet.getContributorsForType(), function(err, contributorStats){
            individualStats.contributorStats = contributorStats;

            return cb(err, individualStats);
        });

    }, function(err, res){
        let stats = res.reduce(self.sumMissingFields);
        stats.total = res.length;
        return callback(err, stats);
    });
};


StatsHelper.prototype.mandatoryFieldsBookTrack = function(bookTracks, callback) {
    let self = this;

    self.mandatoryFieldsBookChapter(bookTracks, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsComponent = function(components, callback) {
    let self = this;

    self.mandatoryFieldsBook(components, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsDataset = function(datasets, callback) {
    let self = this;

    self.mandatoryFieldsBook(datasets, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsDissertation = function(dissertations, callback) {
    let self = this;

    self.mandatoryFieldsBook(dissertations, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsEditedBook = function(editedBooks, callback) {
    let self = this;

    self.mandatoryFieldsBook(editedBooks, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsProceedings = function(proceedings, callback) {
    let self = this;

    self.mandatoryFieldsBook(proceedings, function(err, res){
        return callback(err, res);
    });
};


StatsHelper.prototype.mandatoryFieldsMonograph = function(monographs, callback) {
    let self = this;

    self.mandatoryFieldsBook(monographs, function(err, res){
        return callback(err, res);
    });
};


StatsHelper.prototype.mandatoryFieldsJournal = function(journals, callback) {
    let self = this;

    self.mandatoryFieldsBookSet(journals, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsJournalArticle = function(journalArticles, callback) {
    let self = this;

    self.mandatoryFieldsBookChapter(journalArticles, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsProceedingsArticle = function(proceedingsArticles, callback) {
    let self = this;

    self.mandatoryFieldsBookChapter(proceedingsArticles, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsReferenceBook = function(referenceBooks, callback) {
    let self = this;

    self.mandatoryFieldsBook(referenceBooks, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsReport = function(reports, callback) {
    let self = this;

    self.mandatoryFieldsBook(reports, function(err, res){
        return callback(err, res);
    });
};

StatsHelper.prototype.mandatoryFieldsStandard = function(standards, callback) {
    let self = this;

    self.mandatoryFieldsBook(standards, function(err, res){
        return callback(err, res);
    });
};


StatsHelper.prototype.mandatoryFieldsJournalIssue = function(journalIssues, callback) {
    let self = this;

    async.map(journalIssues, function(journalIssue, cb){
        // check single resource for all the mandatory fields
        journalIssue = new BibliographicResource(journalIssue);
        let individualStats = {};
        individualStats.missingTitle = 0;
        individualStats.missingJournalIssueNumber = 0;
        individualStats.missingJournalVolumeNumber = 0;
        if(!journalIssue.journal_title || journalIssue.journal_title === "" || journalIssue.journal_title === " "){
            individualStats.missingTitle = 1;
        }
        if(!journalIssue.journalIssue_number || journalIssue.journalIssue_number  === "" || journalIssue.journalIssue_number  === " "){
            individualStats.missingJournalIssueNumber = 1;
        }
        if(!journalIssue.journalVolume_number || journalIssue.journalVolume_number  === "" || journalIssue.journalVolume_number  === " "){
            individualStats.missingJournalVolumeNumber = 1;
        }
        self.mandatoryFieldsContributors(journalIssue.journal_contributors, function(err, contributorStats){
            individualStats.contributorStats = contributorStats;

            return cb(err, individualStats);
        });

    }, function(err, res){
        let stats = res.reduce(self.sumMissingFields);
        stats.total = res.length;
        return callback(err, stats);
    });
};

StatsHelper.prototype.mandatoryFieldsReferenceEntry = function(referenceEntries, callback) {
    let self = this;

    async.map(referenceEntries, function(referenceEntry, cb){
        // check single resource for all the mandatory fields
        referenceEntry = new BibliographicResource(referenceEntry);
        let individualStats = {};
        individualStats.missingPublicationDate = 0;
        individualStats.missingTitle = 0;
        individualStats.missingPartOf = 0;

        if(!referenceEntry.getPublicationDateForType() || referenceEntry.getPublicationDateForType() === "" || referenceEntry.getPublicationDateForType() === " " || !referenceEntry.getPublicationDateForType() instanceof Date){
            individualStats.missingPublicationDate = 1;
        }
        if(!referenceEntry.getTitleForType() || referenceEntry.getTitleForType() === "" || referenceEntry.getTitleForType() === " "){
            individualStats.missingTitle = 1;
        }
        if(!referenceEntry.partOf || referenceEntry.partOf === "" || referenceEntry.partOf === " "){
            individualStats.missingPartOf = 1;
        }
        return cb(null, individualStats);


    }, function(err, res){
        let stats = res.reduce(self.sumMissingFields);
        stats.total = res.length;
        return callback(err, stats);
    });
};


StatsHelper.prototype.mandatoryFieldsReportSeries = function(reportSeries, callback) {
    let self = this;

    async.map(reportSeries, function(reportSer, cb){
        // check single resource for all the mandatory fields
        reportSer = new BibliographicResource(reportSer);
        let individualStats = {};
        individualStats.missingTitle = 0;
        if(!reportSer.getTitleForType() || reportSer.getTitleForType() === "" || reportSer.getTitleForType() === " "){
            individualStats.missingTitle = 1;
        }
        return cb(null, individualStats);
    }, function(err, res){
        let stats = res.reduce(self.sumMissingFields);
        stats.total = res.length;
        return callback(err, stats);
    });
};

StatsHelper.prototype.mandatoryFieldsJournalVolume = function(journalVolumes, callback) {
    let self = this;

    async.map(journalVolumes, function(journalVolume, cb){
        // check single resource for all the mandatory fields
        journalVolume = new BibliographicResource(journalVolume);
        let individualStats = {};
        individualStats.missingJournalVolumeNumber = 0;
        if(!journalVolume.getNumberForType() || journalVolume.getNumberForType() === "" || journalVolume.getNumberForType() === " "){
            individualStats.missingJournalVolumeNumber = 1;
        }
        return cb(null, individualStats);
    }, function(err, res){
        let stats = res.reduce(self.sumMissingFields);
        stats.total = res.length;
        return callback(err, stats);
    });
};

StatsHelper.prototype.mandatoryFieldsStandardSeries = function(standardSeries, callback) {
    let self = this;

    self.mandatoryFieldsReportSeries(standardSeries, function(err, res){
        return callback(err, res);
    });
};


StatsHelper.prototype.sumMissingFields = function (total, item) {
    let res = {};
    if (total.missingPublicationDate  || total.missingPublicationDate === 0) res.missingPublicationDate = total.missingPublicationDate + item.missingPublicationDate;
    if (total.missingTitle  || total.missingTitle === 0) res.missingTitle = total.missingTitle + item.missingTitle;
    if (total.contributorStats) res.contributorStats = {
        missingContributors: total.contributorStats.missingContributors + item.contributorStats.missingContributors,
        total: total.contributorStats.total + item.contributorStats.total,
        missingIdentifierForContributors: total.contributorStats.missingIdentifierForContributors + item.contributorStats.missingIdentifierForContributors,
        missingRoleTypeForContributors: total.contributorStats.missingRoleTypeForContributors + item.contributorStats.missingRoleTypeForContributors,
        missingNameForContributors: total.contributorStats.missingNameForContributors + item.contributorStats.missingNameForContributors,
    };

    if (total.embodimentStats) res.embodimentStats = {
        missingEmbodiments: total.embodimentStats.missingEmbodiments + item.embodimentStats.missingEmbodiments,
        total: total.embodimentStats.total + item.embodimentStats.total,
        missingFirstPage: total.embodimentStats.missingFirstPage + item.embodimentStats.missingFirstPage,
        missingLastPage: total.embodimentStats.missingLastPage + item.embodimentStats.missingLastPage,
    };

    if (total.missingJournalIssueNumber || total.missingJournalIssueNumber === 0) res.missingJournalIssueNumber = total.missingJournalIssueNumber + item.missingJournalIssueNumber;
    if (total.missingJournalVolumeNumber || total.missingJournalVolumeNumber === 0) res.missingJournalVolumeNumber = total.missingJournalVolumeNumber + item.missingJournalVolumeNumber;
    if (total.missingPartOf || total.missingPartOf === 0) res.missingPartOf = total.missingPartOf + item.missingPartOf;

    return res;
};

StatsHelper.prototype.mandatoryFieldsContributors = function(contributors, callback) {
    let individualStats = {};
    individualStats.total = 0;
    individualStats.missingContributors = 0;
    individualStats.missingIdentifierForContributors = 0;
    individualStats.missingRoleTypeForContributors = 0;
    individualStats.missingNameForContributors = 0;
    let roleList = [];

    // generate a list of valid types
    for(let t in enums.roleType){
        roleList.push(enums.roleType[t]);
    }
    if(!contributors || contributors.length === 0){
        individualStats.missingContributors = 1;
        return callback(null, individualStats);
    }else {
        for(let contrib of contributors){
            individualStats.total += 1;
            if(!contrib.heldBy.identifiers || contrib.heldBy.identifiers.length === 0){
                individualStats.missingIdentifierForContributors += 1;
            }
            if(!contrib.roleType || roleList.indexOf(contrib.roleType) < 0){
                individualStats.missingRoleTypeForContributors += 1;
            }
            if((!contrib.heldBy.nameString || contrib.heldBy.nameString === "")
                && (!contrib.heldBy.givenName || contrib.heldBy.givenName === "")
                && (!contrib.heldBy.familyName || contrib.heldBy.familyName === "")){
                individualStats.missingNameForContributors += 1;
            }
        }
    }
    return callback(null, individualStats);
};

StatsHelper.prototype.mandatoryFieldsResourceEmbodiments = function(embodiments, callback) {
    let individualStats = {};
    individualStats.total = 0;
    individualStats.missingEmbodiments = 0;
    individualStats.missingFirstPage = 0;
    individualStats.missingLastPage = 0;

    if(!embodiments || embodiments.length === 0){
        individualStats.missingEmbodiments = 1;
        return callback(null, individualStats);
    }else {
        for(let embod of embodiments){
            individualStats.total += 1;
            if(!embod.firstPage || embod.firstPage === " " || embod.firstPage === ""){
                individualStats.missingFirstPage += 1;
            }
            if(!embod.lastPage || embod.lastPage === " " || embod.lastPage === ""){
                individualStats.missingLastPage += 1;
            }
        }
    }
    return callback(null, individualStats);
};

/**
 * Factory function
 *
 * @returns {StatsHelper}
 */
function createStatsHelper() {
    return new StatsHelper();
}


module.exports = {
    createStatsHelper : createStatsHelper
};