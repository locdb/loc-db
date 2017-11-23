/**
 * Created by anlausch on 9/8/2017.
 */

'use strict';
const mongoBr = require('./../models/bibliographicResource.js');
const mongoose = require('mongoose');
const enums = require('./../schema/enum.json');
const errorlog = require('./../util/logger').errorlog;
const accesslog = require('./../util/logger').accesslog;
const ocrHelper = require('./ocrHelper').createOcrHelper();
const swbHelper = require('./swbHelper').createSwbHelper();
const crossrefHelper = require('./crossrefHelper').createCrossrefHelper();
const async = require('async');
const Scan = require('./../schema/scan');
const ResourceEmbodiment = require('./../schema/resourceEmbodiment');

var DatabaseHelper = function(){
};

/**
 * Saves a monograph
 * @param scan - file to save in the filesystem
 * @param ppn - pica prod number (~id) of the monograph
 * @param callback - callback function
 */
DatabaseHelper.prototype.saveIndependentPrintResource = function(scan, ppn, resourceType, textualPdf, callback){
    var self = this;
    // check first whether the monograph already exists
    mongoBr.findOne({
        "identifiers.scheme": enums.identifier.ppn,
        "identifiers.literalValue": ppn
    }, function (err, br) {
        // if there is an error, log it and return
        if(err){
            errorlog.error(err);
            return callback(err, null);
        }
        // if the br is filled, then there is already a resource for the given identifier and it is another scan page
        if(br) {
            // then we only have to save the scan but not the whole metadata
            return self.saveScan(scan, textualPdf, function(err,scan){
                for (var embodiment of br.embodiedAs){
                    // we check for the print embodiment and append the scan to it
                    if(embodiment.type == enums.embodimentType.print){
                        embodiment.scans.push(scan.toObject());
                        break;
                    }
                }
                br.type = resourceType;
                return br.save(function (err, result) {
                    // now search for the scanId
                    // now search for the scanId
                    self.findScanByScanName(result, scan.scanName, function(err, scan){
                        var res=[];
                        res.push(result);
                        res.push(scan);
                        return callback(null, res);
                    });
                });
            });
        }else{
            // the br does not exist at all yet
            // we have to retrieve all the metadata and we have to save the file
            self.saveScanAndRetrieveMetadata(scan, ppn, resourceType, textualPdf, function (err, result) {
                if (err) {
                    errorlog.log(err);
                    return callback(err, null);
                }
                var scan = result[0];
                var br = result[1];
                br.type = resourceType;
                br.embodiedAs = [{
                    type: enums.embodimentType.print,
                    //firstPage: firstPage,
                    //lastPage: lastPage,
                    scans: [scan.toObject()]
                }];
                br = new mongoBr(br);
                br.save(function (err, result) {
                    // now search for the scanId
                    self.findScanByScanName(result, scan.scanName, function(err, scan){
                        var res=[];
                        res.push(result);
                        res.push(scan);
                        return callback(null, res);
                    });
                });
            });
        }

    });
};

/**
 * Saves an article or chapter in a collection
 * @param scan - file to save in the filesystem
 * @param firstPage - first page of the subresource (part of a unique identifier)
 * @param lastPage - last page of the subresource (part of a unique identifier)
 * @param ppn - pica prod number (~id) of the monograph
 * @param callback - callback function
 */
DatabaseHelper.prototype.saveDependentPrintResource = function(scan, firstPage, lastPage, ppn, resourceType, textualPdf, callback){
    var self = this;
    // check first whether the container resource already exists
    mongoBr.findOne({
        "identifiers.scheme": enums.identifier.ppn,
        "identifiers.literalValue": ppn
    }, function (err, parent) {
        // if there is an error, log it and return
        if(err){
            errorlog.error(err);
            return callback(err, null);
        }
        // if the parent is filled, then there is already a container resource for the given ppn
        // we have to check, whether there is already a db instance for the the sub resource
        if(parent) {
            mongoBr.findOne({
                "partOf": parent._id,
                "embodiedAs": {$elemMatch: {firstPage: firstPage, lastPage: lastPage}}
            }, function (err, child) {
                // the parent resource already exists, the sub resource already exists, apparently, the user is just adding another scan page
                if(child){
                    self.saveScan(scan, textualPdf, function(err,scan){
                        if(err){
                            errorlog.error(err);
                            return callback(err, null);
                        }
                        for(var embodiment of child.embodiedAs){
                            if(embodiment.type == enums.embodimentType.print && embodiment.firstPage == firstPage
                            && embodiment.lastPage == lastPage){
                                embodiment.scans.push(scan);
                                break;
                            }
                        }
                        // We have to save the child in both cases
                        child.save(function (err, result) {
                            if(err){
                                errorlog.error(err);
                                callback(err, null);
                            }
                            var res = []
                            res.push(parent);
                            res.push(child);
                            // now search for the scanId
                            self.findScanByScanName(result, scan.scanName, function(err, scan){
                                res.push(scan);
                                return callback(null, res);
                            });
                        });
                    });
                }else{
                    // the child resource does not exist yet, but the parent does
                    self.saveScan(scan, textualPdf, function(err,result){
                        if(err){
                            errorlog.error(err);
                            return callback(err, null);
                        }
                        var scan = result;
                        // TODO: Test this properly!
                        crossrefHelper.queryChapterMetaData(parent.title ,firstPage, lastPage, function(err, res){
                            if(err){
                                errorlog.error(err);
                                return callback(err, null);
                            }
                            if(res[0]) {
                                child = new mongoBr(res[0]);
                                child.partOf = parent._id.toString();
                                child.embodiedAs = [{
                                    type: enums.embodimentType.print,
                                    firstPage: firstPage,
                                    lastPage: lastPage,
                                    scans: [scan]
                                }];
                            }else {
                                child = new mongoBr({
                                    partOf: parent._id.toString(),
                                    embodiedAs: [{
                                        type: enums.embodimentType.print,
                                        firstPage: firstPage,
                                        lastPage: lastPage,
                                        scans: [scan]}]
                                });

                            }
                            // We have to save the child in both cases
                            child.save(function (err, result) {
                                if(err){
                                    errorlog.error(err);
                                    callback(err, null);
                                }
                                var res = []
                                res.push(parent.toObject());
                                res.push(child.toObject());

                                self.findScanByScanName(result, scan.scanName, function(err, scan){
                                    res.push(scan);
                                    return callback(null, res);
                                });
                            });
                        });
                    });
                }
            });
        }else {
            // the container br does not exist at all yet
            // ergo the sub-resource does not exist neither
            // we have to retrieve all the metadata and we have to save the file
            self.saveScanAndRetrieveMetadata(scan, ppn, resourceType, textualPdf, function (err, result) {
                if (err) {
                    errorlog.log(err);
                    return callback(err, null);
                }
                var scan = result[0];
                result[1].type = resourceType;
                var parent = new mongoBr(result[1]);
                // TODO: Test this properly!
                crossrefHelper.queryChapterMetaData(parent.title, firstPage, lastPage, function (err, res) {
                    if (err) {
                        errorlog.error(err);
                        return callback(err, null);
                    }
                    if (res[0]) {
                        var child = new mongoBr(res[0]);
                        child.partOf = parent._id.toString();
                        child.embodiedAs = [{
                            type: enums.embodimentType.print,
                            firstPage: firstPage,
                            lastPage: lastPage,
                            scans: [scan]
                        }];
                    } else {
                        child = new mongoBr({
                            partOf: parent._id.toString(),
                            embodiedAs: [{
                                type: enums.embodimentType.print,
                                firstPage: firstPage,
                                lastPage: lastPage,
                                scans: [scan]
                            }]
                        });

                    }
                    // Save parent and child
                    async.parallel([
                            function (callback) {
                                parent.save(function (err, result) {
                                    if (err) {
                                        errorlog.error(err);
                                        callback(err, null);
                                    }
                                    callback(null, result);
                                });
                            },
                            function (callback) {
                                child.save(function (err, result) {
                                    if (err) {
                                        errorlog.error(err);
                                        callback(err, null);
                                    }
                                    callback(null, result);
                                });
                            }],
                        function (err, result) {
                            if (err) {
                                errorlog.error(err);
                                return callback(err, null);
                            }
                            self.findScanByScanName(result[1], scan.scanName, function(err, scan){
                                result.push(scan);
                                return callback(null, result);
                            });
                        });
                });
            });
        }
    });
};

/**
 * Assumption for this function: The br for which the ppn is given is not in the db yet, we need to get metadata
 * @param scan
 * @param ppn
 * @param callback
 */
DatabaseHelper.prototype.saveScanAndRetrieveMetadata = function(scan, ppn, resourceType, textualPdf, callback){
    var self = this;
    // run the saving and the retrieval of metadata in parallel
    async.parallel([
        // 1. save scan
        function(callback){
            self.saveScan(scan, textualPdf, function(err, scan){
                if(err){
                    errorlog.error(err);
                    return callback(err, null)
                }
                callback(null, scan);
            });
        },
        // 2. retrieve metadata for ppn
        function(callback){
            swbHelper.query(ppn, resourceType, function (err, result) {
                if(err){
                    errorlog.error(err);
                    return callback(err, null)
                }
                callback(null, result);
            });
        }
    ], function(err, results){
        if (err) {
            errorlog.error(err);
            return callback(err, null);
        }
        if(!results[1].identifiers){
            errorlog.error("Something went wrong with retrieving data from the union catalog.");
            return callback(new Error("Something went wrong with retrieving data from the union catalog."), null);
        }
        results[1].identifiers.push({scheme: enums.identifier.ppn, literalValue: ppn});
        return callback(err, results);
    });
};


DatabaseHelper.prototype.findScanByScanName = function(br, scanName, callback){
    // now search for the scanId
    for(var embodiment of br.embodiedAs){
        for(var scan of embodiment.scans){
            if(scan.scanName === scanName){
                return callback(null, scan);
            }
        }
    }
    return callback(null, null);
};

DatabaseHelper.prototype.saveScan = function(scan, textualPdf, callback){
    // get unique id from mongo which we use as filename
    var scanId = mongoose.Types.ObjectId().toString();

    ocrHelper.saveBinaryFile(scanId, scan.buffer, function (err, scanName) {
        // if there is an error, log it and return
        if (err) {
            errorlog.error(err);
            return callback(err, null)
        }
        // if not, create a scan object
        var scan = new Scan({_id: scanId, scanName: scanName, status: enums.status.notOcrProcessed, textualPdf: textualPdf});

        // return scan object to the caller
        callback(null, scan);
    });
}

// TODO: CREATE TEST FOR THIS
DatabaseHelper.prototype.saveStringScan = function(scan, callback){
    // get unique id from mongo which we use as filename
    var scanId = mongoose.Types.ObjectId().toString();

    ocrHelper.saveStringFile(scanId, scan, function (err, scanName) {
        // if there is an error, log it and return
        if (err) {
            errorlog.error(err);
            return callback(err, null)
        }
        // if not, create a scan object
        var scan = new Scan({_id: scanId, scanName: scanName, status: enums.status.notOcrProcessed, textualPdf: false});

        // return scan object to the caller
        callback(null, scan);
    });
}


// TODO: CREATE TEST FOR THIS
DatabaseHelper.prototype.saveScanInResourceEmbodiment = function(resource, scan, embodimentType, callback){
    // check whether embodiment of type embodimentType already exists in resource
    for(var embodiment of resource.embodiedAs){
        if(embodiment.type === embodimentType){
            // a matching embodiment was found; save scan and return resource
            embodiment.scans.push(scan);
            return callback(null, resource);
        }
    }
    // a matching embodiment type was not found; create a new one and return the resource
    var embodiment = new ResourceEmbodiment({type: embodimentType, scans: [scan]});
    resource.embodiedAs.push(embodiment);
    return callback(null, resource);
}

// TODO: CREATE TEST FOR THIS
DatabaseHelper.prototype.curateJournalHierarchy = function(resources, callback){
    var journal;
    var volume;
    var issue;
    var article;
    // We expect as input four resources: A journal, a volume, an issue and the article
    // Now we need to check what we already have in the db and what needs to be created
    // The service should return the saved mongoose resources
    for(var resource of resources) {
        if (resource.type === enums.resourceType.journal) {
            journal = resource;
        }else if (resource.type === enums.resourceType.journalVolume) {
            volume = resource;
        }else if (resource.type === enums.resourceType.journalIssue) {
            issue = resource;
        }else if (resource.type === enums.resourceType.journalArticle) {
            article = resource;
        }
    }
    if(journal && volume && issue && article){
        // check if journal already exists, via issn
        // therefore, collect the issns available
        var issns= [];
        for(var identifier of journal.identifiers){
            if(identifier.scheme === enums.identifier.issn){
                issns.push(identifier.literalValue);
            }
        }
        // now query with them
        mongoBr.findOne({
            "identifiers.scheme": enums.identifier.issn,
            "identifiers.literalValue": {$in: issns},
            "resourceType": enums.resourceType.journal
        }, function (err, mongoJournal) {
            // if no resource was found, create everything
            if(err){
                errorlog.error(err);
                return callback(err, null);
            }
            if(!mongoJournal){
                // no journal was found; so we assume that it needs to be created and that all the others (volume, issue, article)
                // are missing too
                mongoBr.save(journal, function(err, journal){
                    volume.partOf = journal._id;
                    mongoBr.save(volume, function(err, volume){
                        issue.partOf = volume._id;
                        mongoBr.save(issue, function(err, issue){
                            article.partOf = issue._id;
                            mongoBr.save(article, function(err, article){
                                return callback(null, [journal, volume, issue, article]);
                            })
                        });
                    });
                });
            }else{
                // if a resource was found, go on searching with part of and the id and volume number
                // thats the volume, if the volume was found,
                // search with part of and id of the volume
                mongoBr.find({
                    "partOf": mongoJournal._id,
                    "number": volume.number,
                }, function (err, mongoVolume) {
                    if (!mongoVolume) {
                        // the volume is missing; so we create volume, issue and article
                        volume.partOf = mongoJournal._id;
                        mongoBr.save(volume, function (err, volume) {
                            issue.partOf = volume._id;
                            mongoBr.save(issue, function (err, issue) {
                                article.partOf = issue._id;
                                mongoBr.save(article, function (err, article) {
                                    return callback(null, [mongoJournal, volume, issue, article]);
                                })
                            });
                        });
                    } else {
                        // the volume is there, so, let's check for the issue
                        // search with part of and id of the volume
                        mongoBr.find({
                            "partOf": mongoVolume._id,
                            "number": issue.number
                        }, function (err, mongoIssue) {
                            if (!mongoIssue) {
                                // the issue is missing; so we create issue and article
                                issue.partOf = mongoVolume._id;
                                mongoBr.save(issue, function (err, issue) {
                                    article.partOf = issue._id;
                                    mongoBr.save(article, function (err, article) {
                                        return callback(null, [mongoJournal, volume, issue, article]);
                                    })
                                });
                            }else{
                                // the issue is there, so we check for the article
                                // we use the doi and partOf for doing this
                                var dois= [];
                                for(var identifier of article.identifiers){
                                    if(identifier.scheme === enums.identifier.doi){
                                        dois.push(identifier.literalValue);
                                    }
                                }
                                mongoBr.find({
                                    "partOf": mongoIssue._id,
                                    "identifiers.scheme": enums.identifier.doi,
                                    "identifiers.literalValue": {$in: dois}
                                }, function (err, mongoArticle) {
                                    if (!mongoArticle) {
                                        // the issue is missing; so we create issue and article
                                        article.partOf = mongoIssue._id;
                                        mongoBr.save(article, function (err, article) {
                                            return callback(null, [mongoJournal, mongoVolume, mongoIssue, article]);
                                        });
                                    }else{
                                        // just return everything; everything seems to be there
                                        return callback(null, [mongoJournal, mongoVolume, mongoIssue, mongoArticle]);
                                    }
                                });
                            }
                        });
                    }
                });
            }

        });
    }else{
        // We got an incomplete hierarchy. What can we do?
        return callback("Something is wrong", null);
    }
}

DatabaseHelper.prototype.saveReferencesPageForResource = function(resource, binaryFile, textualPdf, stringFile, embodimentType, callback){
    var self = this;
    if(binaryFile && textualPdf){
        //2a. A binary file is given; We also need to have the information if it's a textual pdf; Save it
        self.saveScan(binaryFile, textualPdf, function(err, scan){
            if(err){
                errorlog.error(err);
                return callback(err,null);
            }
            self.saveScanInResourceEmbodiment(resource, scan, embodimentType, function(err, resource){
                // 3. We saved the file and we modified the br accordingly; Now we need to save it in mongo
                resource.save(function(err, resource){
                    if(err){
                        errorlog.error(err);
                        return callback(err,null);
                    }
                    return callback(null,[resource, scan]);
                });
            });
        });
    }else if(stringFile) {
        //2b. A string file is given; Save it
        self.saveStringScan(stringFile, function (err, scan) {
            if (err) {
                errorlog.error(err);
                return callback(err, null);
            }
            self.saveScanInResourceEmbodiment(resource, scan, embodimentType, function (err, resource) {
                // 3. We saved the file and we modified the br accordingly; Now we need to save it in mongo
                resource.save(function (err, resource) {
                    if (err) {
                        errorlog.error(err);
                        return callback(err, null)
                    }
                    return callback(null, [resource, scan]);
                });
            });
        });
    }
}


// TODO: CREATE TEST FOR THIS
DatabaseHelper.prototype.resourceExists = function (identifier, resourceType, firstPage, lastPage, callback) {
    var self = this;

    mongoBr.find({
        "identifiers.scheme": identifier.scheme,
        "identifiers.literalValue": identifier.literalValue,
        "type": resourceType
    }, function (err, resources) {
       if(err){
           errorlog.error(err);
           return callback(err, null);
       }else if(resources.length === 0){
           accesslog.log("Resource with given identifier and resourceType does not exist.",
               {
                   identifier: identifier,
                   resourceType: resourceType
               });
           return callback(null, null);
       } else if(firstPage && lastPage){
           for(var resource of resources){
               for(var embodiment of resource.embodiedAs){
                   if(embodiment.firstPage === firstPage && embodiment.lastPage === lastPage){
                       accesslog.log("Resource with given identifier, resourceType, firstPage and lastPage does exist.",
                           {
                               identifier: identifier,
                               resourceType: resourceType,
                               firstPage: firstPage,
                               lastPage: lastPage
                           });
                        return callback(null, resource);
                   }
               }
           }
           accesslog.log("Resource with given identifier, resourceType, firstPage and lastPage does not exist.",
               {
                   identifier: identifier,
                   resourceType: resourceType,
                   firstPage: firstPage,
                   lastPage: lastPage
               });
           return callback(null, null);
       }else{
           accesslog.log("Resource with given identifier and resourceType does exist.",
               {
                   identifier: identifier,
                   resourceType: resourceType
               });
           return callback(null, resources[0]);
       }
    });
}


/**
 * Factory function
 *
 * @returns {DatabaseHelper}
 */
function createDatabaseHelper() {
    return new DatabaseHelper();
}

module.exports = {
    createDatabaseHelper : createDatabaseHelper
};