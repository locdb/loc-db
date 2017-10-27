/**
 * Created by anlausch on 9/8/2017.
 */

'use strict';
const mongoBr = require('./../models/bibliographicResource.js');
const mongoose = require('mongoose');
const enums = require('./../schema/enum.json');
const errorlog = require('./../util/logger').errorlog;
const ocrHelper = require('./ocrHelper').createOcrHelper();
const swbHelper = require('./swbHelper').createSwbHelper();
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
DatabaseHelper.prototype.saveIndependentPrintResource = function(scan, ppn, resourceType, callback){
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
            self.saveScan(scan, function(err,scan){
                for (var embodiment of br.embodiedAs){
                    // we check for the print embodiment and append the scan to it
                    if(embodiment.type == enums.embodimentType.print){
                        embodiment.scans.push(scan.toObject());
                        break;
                    }
                }
                br.type = resourceType;
                br.save(function (err, result) {
                    callback(err, result);
                });
            });
        }else{
            // the br does not exist at all yet
            // we have to retrieve all the metadata and we have to save the file
            self.saveScanAndRetrieveMetadata(scan, ppn, resourceType, function (err, result) {
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
                    return callback(err, result);
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
DatabaseHelper.prototype.saveDependentPrintResource = function(scan, firstPage, lastPage, ppn, resourceType, callback){
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
                    self.saveScan(scan, function(err,result){
                        if(err){
                            errorlog.error(err);
                            return callback(err, null);
                        }
                        for(var embodiment of child.embodiedAs){
                            if(embodiment.type == enums.embodimentType.print && embodiment.firstPage == firstPage
                            && embodiment.lastPage == lastPage){
                                embodiment.scans.push(result);
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
                            return callback(null, res);
                        });
                    });
                }else{
                    // the child resource does not exist yet, but the parent does
                    self.saveScan(scan, function(err,result){
                        if(err){
                            errorlog.error(err);
                            return callback(err, null);
                        }
                        var scan = result;
                        child = new mongoBr({
                            partOf: parent._id.toString(),
                            embodiedAs: [{
                                type: enums.embodimentType.print,
                                firstPage: firstPage,
                                lastPage: lastPage,
                                scans: [scan]}]
                        });

                        // We have to save the child in both cases
                        child.save(function (err, result) {
                            if(err){
                                errorlog.error(err);
                                callback(err, null);
                            }
                            var res = []
                            res.push(parent.toObject());
                            res.push(child.toObject());
                            return callback(null, res);
                        });

                    });
                }
            });
        }else{
            // the container br does not exist at all yet
            // ergo the sub-resource does not exist neither
            // we have to retrieve all the metadata and we have to save the file
            self.saveScanAndRetrieveMetadata(scan, ppn, resourceType, function (err, result) {
                if (err) {
                    errorlog.log(err);
                    return callback(err, null);
                }
                var scan = result[0];
                result[1].type = resourceType;
                var parent = new mongoBr(result[1]);
                var child = new mongoBr({
                    partOf: parent._id.toString(),
                    embodiedAs: [{
                        type: enums.embodimentType.print,
                        firstPage: firstPage,
                        lastPage: lastPage,
                        scans: [scan]}]
                });
                // Save parent and child
                async.parallel([
                        function (callback) {
                            parent.save(function (err, result) {
                                if(err){
                                    errorlog.error(err);
                                    callback(err, null);
                                }
                                callback(null, result);
                            });
                        },
                        function (callback) {
                            child.save(function (err, result) {
                                if(err){
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
                        return callback(null, result);
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
DatabaseHelper.prototype.saveScanAndRetrieveMetadata = function(scan, ppn, resourceType, callback){
    var self = this;
    // run the saving and the retrieval of metadata in parallel
    async.parallel([
        // 1. save scan
        function(callback){
            self.saveScan(scan, function(err, scan){
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


DatabaseHelper.prototype.saveScan = function(scan, callback){
    // get unique id from mongo which we use as filename
    var scanId = mongoose.Types.ObjectId().toString();

    ocrHelper.saveBinaryFile(scanId, scan.buffer, function (err, scanName) {
        // if there is an error, log it and return
        if (err) {
            errorlog.error(err);
            return callback(err, null)
        }
        // if not, create a scan object
        var scan = new Scan({_id: scanId, scanName: scanName, status: enums.status.notOcrProcessed});

        // return scan object to the caller
        callback(null, scan);
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