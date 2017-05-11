'use strict';

const crossref = require('crossref');
const Identifier = require('./../schema/identifier.js');
const BibliographicEntry = require('./../schema/bibliographicEntry.js');
const enums = require('./../schema/enum.json');
const errorlog = require('./../util/logger.js').errorlog;

var CrossrefHelper = function(){
};


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
        var authors = [];
        if(obj.author){
            for(var author of obj.author){
                authors.push(author.family + " " + author.given);
            }
        }
        // Title
        var title = "";
        if(obj.title && obj.title[0]){
            title = obj.title[0];
        }
        var bibliographicEntry = new BibliographicEntry({ocrData : {title: title, authors: authors}, identifiers: identifiers});
        res.push(bibliographicEntry.toObject());
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