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

// TODO: Use this and test this!!
// TODO: Write a similar function for Collections and Joutnals
/**
 * Saves a monograph if a resource with the given ppn does not exist yet
 * @param scan - file to save in the filesystem
 * @param ppn - pica prod number (~id) of the monograph
 * @param callback - callback function
 */
DatabaseHelper.prototype.savePrintMonograph = function(scan, ppn, callback){
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
                br.save(function (err, result) {
                    callback(err, result);
                });
            });
        }else{
            // the br does not exist at all yet
            // we have to retrieve all the metadata and we have to save the file
            self.saveScanAndRetrieveMetadata(scan, ppn, function (err, result) {
                if (err) {
                    errorlog.log(err);
                    return callback(err, null);
                }
                var scan = result[0];
                var br = result[1];
                br.embodiedAs = [{
                    type: enums.embodimentType.print,
                    //firstPage: firstPage,
                    //lastPage: lastPage,
                    scans: [scan.toObject()]
                }];
                br = new mongoBr(br);
                br.save(function (err, result) {
                    return callback(err, result.toObject());
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
// TODO: Use this and test this!!
DatabaseHelper.prototype.saveScanAndRetrieveMetadata = function(scan, ppn, callback){
    var self = this;
    // run the saving and the retrieval of metadata in parallel
    async.parallel([
        // 1. save scan
        function(callback){
            self.saveScan(scan, function(err, scan){
                callback(err, scan);
            });
        },
        // 2. retrieve metadata for ppn
        function(callback){
            // TODO: Adapt this function to the err, result pattern
            swbHelper.query(ppn, function (result) {
                callback(null, result);
            });
        }
    ], function(err, results){
        if (err) {
            errorlog.error(err);
            return callback(err, null);
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