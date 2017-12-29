/**
 * Created by anlausch on 9/8/2017.
 */

'use strict';
const mongoBr = require('./../models/bibliographicResource.js');
const BibliographicResource = require('./../schema/bibliographicResource.js');
const mongoose = require('mongoose');
const enums = require('./../schema/enum.json');
const logger = require('./../util/logger');
const ocrHelper = require('./ocrHelper').createOcrHelper();
const swbHelper = require('./swbHelper').createSwbHelper();
const crossrefHelper = require('./crossrefHelper').createCrossrefHelper();
const async = require('async');
const Scan = require('./../schema/scan');

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
            logger.error(err);
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
                    logger.log(err);
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
            logger.error(err);
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
                            logger.error(err);
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
                                logger.error(err);
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
                            logger.error(err);
                            return callback(err, null);
                        }
                        var scan = result;
                        // TODO: Test this properly!
                        crossrefHelper.queryChapterMetaData(parent.title ,firstPage, lastPage, function(err, res){
                            if(err){
                                logger.error(err);
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
                                    logger.error(err);
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
                    logger.error(err);
                    return callback(err, null);
                }
                var scan = result[0];
                result[1].type = resourceType;
                var parent = new mongoBr(result[1]);
                // TODO: Test this properly!
                crossrefHelper.queryChapterMetaData(parent.title, firstPage, lastPage, function (err, res) {
                    if (err) {
                        logger.error(err);
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
                                        logger.error(err);
                                        callback(err, null);
                                    }
                                    callback(null, result);
                                });
                            },
                            function (callback) {
                                child.save(function (err, result) {
                                    if (err) {
                                        logger.error(err);
                                        callback(err, null);
                                    }
                                    callback(null, result);
                                });
                            }],
                        function (err, result) {
                            if (err) {
                                logger.error(err);
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
                    logger.error(err);
                    return callback(err, null)
                }
                callback(null, scan);
            });
        },
        // 2. retrieve metadata for ppn
        function(callback){
            swbHelper.query(ppn, resourceType, function (err, result) {
                if(err){
                    logger.error(err);
                    return callback(err, null)
                }
                callback(null, result);
            });
        }
    ], function(err, results){
        if (err) {
            logger.error(err);
            return callback(err, null);
        }
        if(!results[1].identifiers){
            logger.error("Something went wrong with retrieving data from the union catalog.");
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
            logger.error(err);
            return callback(err, null)
        }
        // if not, create a scan object
        var scan = new Scan({_id: scanId, scanName: scanName, status: enums.status.notOcrProcessed, textualPdf: textualPdf});

        // return scan object to the caller
        callback(null, scan);
    });
}


DatabaseHelper.prototype.resourceExists = function (identifier, resourceType, firstPage, lastPage, callback) {
    var self = this;

    // TODO: We have to make 100% sure, that we find the match. Therefore, it would be better to search just in all identifier properties
    if(resourceType === enums.resourceType.bookChapter && identifier.scheme === enums.identifier.swb_ppn){
        resourceType = enums.resourceType.editedBook;
    }
    var propertyPrefix = new BibliographicResource().getPropertyPrefixForType(resourceType);
    // check whether a resource with the given identifier and type is in the db
    mongoBr.where(propertyPrefix.concat("identifiers.scheme"), identifier.scheme)
        .where(propertyPrefix.concat("identifiers.literalValue"), identifier.literalValue)
        .where("type", resourceType)
        .exec(function (err, resources) {
            if(err){
                logger.error(err);
                return callback(err, null);
            }else if(resources.length === 0){
                // nothing like this can be found; therefore, we can be sure that there is nothing to consider
                logger.log("Resource with given identifier and resourceType does not exist.",
                    {
                        identifier: identifier,
                        resourceType: resourceType
                    });
                return callback(null, null);
            } else if(firstPage && lastPage){
                // something could be found and firstPage and lastPage are given; therefore, the identifier relates to the parent; we have to retrieve the children and check their page numbers (dependent resource)
                async.map(resources, function(parent, callback){
                    // retrieve children of this thing
                    mongoBr.where('partOf', parent._id)
                        .exec(function (err, children) {
                            if(err){
                                logger.error(err);
                                callback(err, null);
                            }else if(children.length === 0) {
                                callback(null, null);
                            }else {
                                for(var child of children){
                                    var child = new BibliographicResource(child);
                                    for(var embodiment of child.getResourceEmbodimentsForType(child.type)){
                                        if(embodiment.firstPage === firstPage && embodiment.lastPage === lastPage){
                                            return callback(null, [child, parent]);
                                        }
                                    }
                                }
                                callback(null, null);
                            }
                        });
                }, function(err, matches){
                    for(var match of matches){
                        if(match !== null){
                            logger.log("Resource with given identifier and resourceType, firstPage, lastPage does exist.",
                                {
                                    identifier: identifier,
                                    resourceType: resourceType,
                                    firstPage: firstPage,
                                    lastPage: lastPage
                                });
                            return callback(null, match);
                        }
                    }
                    logger.log("Resource with given identifier and resourceType, firstPage, lastPage does not exist.",
                        {
                            identifier: identifier,
                            resourceType: resourceType,
                            firstPage: firstPage,
                            lastPage: lastPage
                        });
                    return callback(null, null);
                });
            }else{
                // first page and last page are not given; therefore, the identifier relates directly to the resource; we have a match (independent resource)!
                logger.log("Resource with given identifier and resourceType does exist.",
                    {
                        identifier: identifier,
                        resourceType: resourceType
                    });
                return callback(null, resources);
            }
        }
    );
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