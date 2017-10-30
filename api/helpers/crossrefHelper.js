'use strict';

const crossref = require('crossref');
const Identifier = require('./../schema/identifier.js');
const BibliographicResource = require('./../schema/bibliographicResource.js');
const AgentRole = require('./../schema/agentRole.js');
const BibliographicEntry = require('./../schema/bibliographicEntry.js');
const enums = require('./../schema/enum.json');
const errorlog = require('./../util/logger.js').errorlog;

var CrossrefHelper = function(){
};

/**
 * Places a fuzzy string query to Crossref and returns an array of matching BRs
 * @param query
 * @param callback
 */
CrossrefHelper.prototype.query = function(query, callback){
    var self = this;
    crossref.works({query: query }, (err, objs, nextOpts, done) => {
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
 * Retrieves references from Crossref given a DOI or a query string and returns an array of BRs
 * @param doi
 * @param query
 * @param callback
 */
CrossrefHelper.prototype.queryReferences = function(doi, query, callback){
    var self = this;
    if(doi != null){
        crossref.work(doi, (err, obj, nextOpts, done) => {
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
        crossref.works({query: query, filter:{"has-references" : true}}, (err, objs, nextOpts, done) => {
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
        // check whether they really contain the 'reference' property
        var candidates = [];
        candidates.push(obj);
        self.parseObjects(candidates, function(err, res){
            if (err) {
                errorlog.error(err);
                return callback(err, null);
            }
            if (res.length >0){
                return callback(null, res[0]);
            }
            return callback(null, null);
        });
    });
};


/**
 * Parses an array of Crossref objects and returns an array of BRs
 * @param objects
 * @param callback
 */
CrossrefHelper.prototype.parseObjects = function(objects, callback){
    var res = [];
    for(var obj of objects){

        // Identifiers
        var identifiers = [];
        if(obj.DOI){
            var identifier = new Identifier({scheme: enums.identifier.doi, literalValue: obj.DOI});
            identifiers.push(identifier.toObject());
        }
        if(obj.URL){
            var identifier = new Identifier({scheme: enums.externalSources.crossref, literalValue: obj.URL});
            identifiers.push(identifier.toObject());
        }
        if(obj.ISSN){
            for(var issn of obj.ISSN){
                var identifier = new Identifier({scheme: enums.identifier.issn, literalValue: issn});
                identifiers.push(identifier.toObject())
            }
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
        // Title
        var title = "";
        if(obj.title && obj.title[0]) {
            title = obj.title[0];
        }
        // Subtitle
        var subtitle = ""
        if(obj.subtitle && obj.subtitle[0]) {
            title = obj.subtitle[0];
        }

        // Reference list
        if(obj.reference){
            var bes = [];
            for(var reference of obj.reference){
                var bibliographicEntry = new BibliographicEntry({
                    identifiers:[new Identifier({scheme: enums.identifier.doi, literalValue: reference.DOI})],
                    bibliographicEntryText: reference.unstructured,
                    ocrData:{
                        title: reference['article-title'] || reference['volume-title'],
                        date: reference.year
                    },
                    status: enums.status.external});
                bes.push(bibliographicEntry);
            }

        }
        // TODO: Parse type etc?
        var bibliographicResource = new BibliographicResource({
            title: title,
            subtitle: subtitle,
            contributors: contributors,
            identifiers: identifiers,
            status: enums.status.external,
            parts: bes
        });


        res.push(bibliographicResource.toObject());
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