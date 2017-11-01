"use strict";
const ocrHelper = require('./../helpers/ocrHelper.js').createOcrHelper();
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const BibliographicResource = require('./../schema/bibliographicResource.js');
const Scan = require('./../schema/scan.js');
const enums = require('./../schema/enum.json');
const async = require('async');
const mongoBr = require('./../models/bibliographicResource.js');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;
const config = require('./../../config/config.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const databaseHelper = require('./../helpers/databaseHelper.js').createDatabaseHelper();


function saveScan(req, res) {
    var response = res;
    var scan = req.swagger.params.scan.value;
    var ppn = req.swagger.params.ppn.value;
    var firstPage = req.swagger.params.firstPage.value;
    var lastPage = req.swagger.params.lastPage.value;
    var resourceType = req.swagger.params.resourceType.value;

    if(resourceType == enums.resourceType.monograph){
        databaseHelper.saveIndependentPrintResource(scan, ppn, resourceType, function(err,res){
            if(err){
                errorlog.error(err);
                return response.status(400).json(err);
            }
            return response.json(res);
        });
    }else if(resourceType == enums.resourceType.journal
        || resourceType == enums.resourceType.collection) {
        databaseHelper.saveDependentPrintResource(scan, firstPage, lastPage, ppn, resourceType, function (err, res) {
            if(err){
                errorlog.error(err);
                return response.status(400).json(err);
            }
            return response.json(res);
        });
    }
};


function saveScanForElectronicJournal(req, res) {
    var response = res;
    var scan = req.swagger.params.scan.value;
    var doi = req.swagger.params.doi.value;

    mongoBr.findOne({
        "identifiers.scheme": enums.identifier.doi,
        "identifiers.literalValue": doi
    }, function (err, child) {
        // if there is an error, log it and return
        if (err) {
            errorlog.error(err);
            return response.status(500).json(err);
        }
        // we only have to save the file and add it to the child and we have to change the status of the child
        databaseHelper.saveScan(scan, function(err,scan){
            child.status = enums.status.valid;
            if(child.embodiedAs.length == 0){
                child.embodiedAs.push({scans: [], type : enums.embodimentType.digital});
                child.embodiedAs[0].scans.push(scan);
            }else{
                for (var embodiment of child.embodiedAs){
                    // we check for the digital embodiment and append the scan to it
                    if(embodiment.type == enums.embodimentType.digital){
                        embodiment.scans.push(scan);
                        break;
                    }
                }
            }
            child.save(function (err, result) {
                if(err){
                    errorlog.log(err);
                    return response.status(500).json(err);
                }
                return response.status(200).json(result);
            });
        });
    });
};


function getToDo(req, res) {
    var response = res;
    var status = req.swagger.params.status.value;
    if ((status !== enums.status.notOcrProcessed) && (status !== enums.status.ocrProcessed) && (status !== enums.status.external)) {
        errorlog.error(err);
        return response.status(400).json({"message": "Invalid parameter."});
    }
    if(status == enums.status.ocrProcessed) {
        mongoBr.find({'embodiedAs.scans.status': status}, function (err, children) {
            if (err) {
                errorlog.error(err);
                return response.status(500).json({"message": "DB query failed."});
            }
            var resultArray = [];
            var resultObject;
            for (var child of children) {
                // check here whether it is really a child
                if (child.partOf) {
                    // this applies to dependent resources
                    var alreadyIn = false;
                    if (resultArray.length !== 0) {
                        for (var i of resultArray) {
                            if (i._id == child.partOf) {
                                alreadyIn = true;
                                resultObject = i;
                                break;
                            } else {
                                resultObject = {};
                                resultObject._id = child.partOf;
                                resultObject.children = [];
                            }
                        }
                    } else {
                        resultObject = {};
                        resultObject._id = child.partOf;
                        resultObject.children = [];
                    }
                    var resultChild = {};
                    resultChild._id = child._id;
                    //resultChild.status = child.status;
                    var scans = [];
                    for (var embodiment of child.embodiedAs) {
                        for (var scan of embodiment.scans) {
                            if (scan.status === status) {
                                scans.push({
                                    "_id": scan._id.toString(),
                                    "status": scan.status,
                                    "firstPage": embodiment.firstPage,
                                    "lastPage": embodiment.lastPage
                                });
                            }
                        }
                    }

                    resultChild.scans = scans;
                    // TODO: We want to show more information to the user
                    resultChild.title = child.title;
                    resultChild.subtitle = child.subtitle;
                    resultChild.type = child.subtitle;
                    resultChild.publicationYear = child.publicationYear;
                    resultChild.edition = child.edition;
                    resultChild.number = child.number;
                    resultChild.contributors = child.contributors;
                    resultChild.identifiers = child.identifiers;

                    if (!resultObject.children) {
                        resultObject.children = [];
                    }
                    resultObject.children.push(resultChild);
                    if (!alreadyIn) {
                        resultArray.push(resultObject);
                    }
                } else {
                    // This applies to independent resources
                    var scans = [];
                    var resultObject = child;
                    for (var embodiment of child.embodiedAs) {
                        for (var scan of embodiment.scans) {
                            if (scan.status === status) {
                                scans.push({"_id": scan._id.toString(), "status": scan.status});
                            }
                        }
                    }
                    resultObject = resultObject.toObject();
                    delete resultObject.embodiedAs;
                    resultObject.scans = scans;
                    resultArray.push(resultObject);
                }
            }
            // add additional information for displaying it to the user
            async.map(resultArray, function (parent, callback) {
                // check first whether it is really a parent
                if (parent.children) {
                    mongoBr.findOne({'_id': parent._id}, function (err, br) {
                        if (err) {
                            errorlog.error(err);
                            return callback(err, null)
                        }
                        if (!br) {
                            return callback(null, parent);
                        }
                        parent.identifiers = br.identifiers ? br.identifiers : [];
                        parent.title = br.title ? br.title : "";
                        parent.subtitle = br.subtitle ? br.subtitle : "";
                        parent.publicationYear = br.publicationYear ? br.publicationYear : -1;
                        parent.contributors = br.contributors ? br.contributors : [];
                        parent.type = br.type ? br.type : "";
                        parent.edition = br.edition ? br.edition : "";
                        parent.number = br.number ? br.number : -1;
                        callback(null, parent);
                    });
                } else {
                    callback(null, parent);
                }
            }, function (err, res) {
                if (err) {
                    errorlog.error(err);
                    return response.status(500).json({"message": "DB query failed."});
                }
                response.json(res);
            });

        });
    }else if (status == enums.status.notOcrProcessed){
        mongoBr.find({ $or: [ {'embodiedAs.scans.status': enums.status.notOcrProcessed}, {'embodiedAs.scans.status': enums.status.ocrProcessing}] }, function (err, children) {
            if (err) {
                errorlog.error(err);
                return response.status(500).json({"message": "DB query failed."});
            }
            var resultArray = [];
            var resultObject;
            for (var child of children) {
                // check here whether it is really a child
                if (child.partOf) {
                    // this applies to dependent resources
                    var alreadyIn = false;
                    if (resultArray.length !== 0) {
                        for (var i of resultArray) {
                            if (i._id == child.partOf) {
                                alreadyIn = true;
                                resultObject = i;
                                break;
                            } else {
                                resultObject = {};
                                resultObject._id = child.partOf;
                                resultObject.children = [];
                            }
                        }
                    } else {
                        resultObject = {};
                        resultObject._id = child.partOf;
                        resultObject.children = [];
                    }
                    var resultChild = {};
                    resultChild._id = child._id;
                    //resultChild.status = child.status;
                    var scans = [];
                    for (var embodiment of child.embodiedAs) {
                        for (var scan of embodiment.scans) {
                            if (scan.status === status) {
                                scans.push({
                                    "_id": scan._id.toString(),
                                    "status": scan.status,
                                    "firstPage": embodiment.firstPage,
                                    "lastPage": embodiment.lastPage
                                });
                            }
                        }
                    }

                    resultChild.scans = scans;
                    // TODO: We want to show more information to the user
                    resultChild.title = child.title;
                    resultChild.subtitle = child.subtitle;
                    resultChild.type = child.subtitle;
                    resultChild.publicationYear = child.publicationYear;
                    resultChild.edition = child.edition;
                    resultChild.number = child.number;
                    resultChild.contributors = child.contributors;
                    resultChild.identifiers = child.identifiers;

                    if (!resultObject.children) {
                        resultObject.children = [];
                    }
                    resultObject.children.push(resultChild);
                    if (!alreadyIn) {
                        resultArray.push(resultObject);
                    }
                } else {
                    // This applies to independent resources
                    var scans = [];
                    var resultObject = child;
                    for (var embodiment of child.embodiedAs) {
                        for (var scan of embodiment.scans) {
                            if (scan.status === status) {
                                scans.push({"_id": scan._id.toString(), "status": scan.status});
                            }
                        }
                    }
                    resultObject = resultObject.toObject();
                    delete resultObject.embodiedAs;
                    resultObject.scans = scans;
                    resultArray.push(resultObject);
                }
            }
            // add additional information for displaying it to the user
            async.map(resultArray, function (parent, callback) {
                // check first whether it is really a parent
                if (parent.children) {
                    mongoBr.findOne({'_id': parent._id}, function (err, br) {
                        if (err) {
                            errorlog.error(err);
                            return callback(err, null)
                        }
                        if (!br) {
                            return callback(null, parent);
                        }
                        parent.identifiers = br.identifiers ? br.identifiers : [];
                        parent.title = br.title ? br.title : "";
                        parent.subtitle = br.subtitle ? br.subtitle : "";
                        parent.publicationYear = br.publicationYear ? br.publicationYear : -1;
                        parent.contributors = br.contributors ? br.contributors : [];
                        parent.type = br.type ? br.type : "";
                        parent.edition = br.edition ? br.edition : "";
                        parent.number = br.number ? br.number : -1;
                        callback(null, parent);
                    });
                } else {
                    callback(null, parent);
                }
            }, function (err, res) {
                if (err) {
                    errorlog.error(err);
                    return response.status(500).json({"message": "DB query failed."});
                }
                response.json(res);
            });

        });
    }else if (status == enums.status.external){
        // this case applies only to electronic journals at the moment and only if there is no scan uploaded yet
        mongoBr.find({'status': status}, function (err, children) {
            if (err) {
                errorlog.error(err);
                return response.status(500).json({"message": "DB query failed."});
            }
            if (err) {
                errorlog.error(err);
                return response.status(500).json({"message": "DB query failed."});
            }
            var resultArray = [];
            var resultObject;
            for (var child of children) {
                // check here whether it is really a child
                if (child.partOf) {
                    // this applies to dependent resources
                    var alreadyIn = false;
                    if (resultArray.length !== 0) {
                        for (var i of resultArray) {
                            if (i._id == child.partOf) {
                                alreadyIn = true;
                                resultObject = i;
                                break;
                            } else {
                                resultObject = {};
                                resultObject._id = child.partOf;
                                resultObject.children = [];
                            }
                        }
                    } else {
                        resultObject = {};
                        resultObject._id = child.partOf;
                        resultObject.children = [];
                    }
                    var resultChild = {};
                    resultChild._id = child._id;
                    // TODO: We want to show more information to the user
                    resultChild.title = child.title;
                    resultChild.subtitle = child.subtitle;
                    resultChild.type = child.subtitle;
                    resultChild.publicationYear = child.publicationYear;
                    resultChild.edition = child.edition;
                    resultChild.number = child.number;
                    resultChild.contributors = child.contributors;
                    resultChild.identifiers = child.identifiers;
                    resultChild.parts = child.parts;
/*                    var scans = [];
                    // this is the difference now: Before we needed to add the scans, but now, we only add a dummy.
                    scans.push({
                        "_id": "No scan available."
                    });*/

                    //resultChild.scans = scans;
                    if (!resultObject.children) {
                        resultObject.children = [];
                    }
                    resultObject.children.push(resultChild);
                    if (!alreadyIn) {
                        resultArray.push(resultObject);
                    }
                }
            }
            // add additional information for displaying it to the user
            async.map(resultArray, function (parent, callback) {
                // check first whether it is really a parent
                if (parent.children) {
                    mongoBr.findOne({'_id': parent._id}, function (err, br) {
                        if (err) {
                            errorlog.error(err);
                            return callback(err, null)
                        }
                        if (!br) {
                            return callback(null, parent);
                        }
                        parent.identifiers = br.identifiers ? br.identifiers : [];
                        parent.title = br.title ? br.title : "";
                        parent.subtitle = br.subtitle ? br.subtitle : "";
                        parent.publicationYear = br.publicationYear ? br.publicationYear : -1;
                        parent.contributors = br.contributors ? br.contributors : [];
                        parent.type = br.type ? br.type : "";
                        parent.edition = br.edition ? br.edition : "";
                        parent.number = br.number ? br.number : "-1";
                        parent.parts = br.parts ? br.parts : [];
                        callback(null, parent);
                    });
                } else {
                    callback(null, parent);
                }
            }, function (err, res) {
                if (err) {
                    errorlog.error(err);
                    return response.status(500).json({"message": "DB query failed."});
                }
                response.json(res);
            });
        });
    }
}


function get(req, res) {
    var response = res;
    var id = req.swagger.params.id.value;

    // check if id is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
        errorlog.error("Invalid value for parameter id.", {id: id});
        return response.status(400).json({"message": "Invalid parameter."});
    }

    // retrieve corresponding entry from the db
    mongoBr.findOne({'embodiedAs.scans._id': id}, function (err, br) {
        if (err) {
            errorlog.error(err);
            return response.status(500).json({"message": "DB query failed."});
        } else if (!br) {
            errorlog.error("No entry found for parameter id.", {id: id});
            return response.status(400).json({"message": "No entry found."});
        }
        for (var embodiment of br.embodiedAs) {
            for (var scan of embodiment.scans) {
                if (scan._id == id) {
                    // send file
                    var filePath = config.PATHS.UPLOAD + scan.scanName;
                    return response.sendFile(path.resolve(filePath), function (err) {
                        if (err) return errorlog.error(err);
                    });
                }
            }
        }
    });
}


function remove(req, res) {
    var response = res;
    var id = req.swagger.params.id.value;

    // check if id is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
        errorlog.error("Invalid value for parameter id.", {id: id});
        return response.status(400).json({"message": "Invalid parameter."});
    }

    // retrieve corresponding entry from the db
    mongoBr.findOne({'embodiedAs.scans._id': id}, function (err, br) {
        if (err) {
            errorlog.error(err);
            return response.status(500).json({"message": "DB query failed."});
        } else if (!br) {
            errorlog.error("No entry found for parameter id.", {id: id});
            return response.status(400).json({"message": "No entry found."});
        }
        for (var embodiment of br.embodiedAs) {
            for (var scan of embodiment.scans) {
                if (scan._id == id) {
                    // remove scan
                   var scanIndex =  embodiment.scans.indexOf(scan);
                    if (scanIndex > -1) {
                        embodiment.scans.splice(scanIndex, 1);
                    }
                    var embodimentIndex = br.embodiedAs.indexOf(embodiment);
                    br.embodiedAs[embodimentIndex] = embodiment;
                    return br.save(function(err, res){
                        if (err) {
                            errorlog.error(err);
                            return response.status(500).json({"message": "DB query failed."});
                        }
                        return response.status(200).json({"message": "Delete succeeded"})
                    });
                }
            }
        }
    });
}


function triggerOcrProcessing(req, res) {
    var id = req.swagger.params.id.value;
    var response = res;

    // check if id is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
        errorlog.error("Invalid value for parameter id.", {id: id});
        return response.status(400).json({"message": "Invalid parameter."});
    }

    // read the corresponding scan by id
    mongoBr.findOne({
        'embodiedAs.scans': {
            '$elemMatch': {
                '_id': id,
                'status': enums.status.notOcrProcessed
            }
        }
    }, function (err, br) {
        // do error handling
        if (err) {
            errorlog.error(err);
            return response.status(500).json({"message": "DB query failed."});
        } else if (!br) {
            errorlog.error("No entry found for parameter id.", {id: id});
            return response.status(400).json({"message": "No entry found."});
        }
        for (var embodiment of br.embodiedAs) {
            for (var scan of embodiment.scans) {
                if (scan._id == id) {
                    // set the status such that we know that the scan is already in the queue
                    scan.status = enums.status.ocrProcessing;

                    var embodimentIndex = br.embodiedAs.indexOf(embodiment);
                    var scanIndex = embodiment.scans.indexOf(scan);
                    br.embodiedAs[embodimentIndex].scans[scanIndex] = scan;

                    br.save(function(err,res){
                        ocrHelper.ocr_fileupload(scan.scanName, function (err, result) {
                            if (err) {
                                errorlog.error(err);
                                accesslog.log("We try to set back the status of the scan");
                                return mongoBr.findOne({
                                    'embodiedAs.scans': {
                                        '$elemMatch': {
                                            '_id': id
                                        }
                                    }
                                }, function (err, br) {
                                    for (var embodiment of br.embodiedAs) {
                                        for (var scan of embodiment.scans) {
                                            if (scan._id == id) {
                                                var embodimentIndex = br.embodiedAs.indexOf(embodiment);
                                                var scanIndex = embodiment.scans.indexOf(scan);
                                                scan.status = enums.status.notOcrProcessed;
                                                br.embodiedAs[embodimentIndex].scans[scanIndex] = scan;
                                                return br.save(function (err, res) {
                                                    return response.status(502).json({"message": "OCR request failed."});
                                                });
                                            }
                                        }
                                    }
                                });
                            }
                            var name = scan._id.toString() + ".xml";
                            async.parallel([
                                // Do two functions in parallel: 1) parse xml string 2) save xml string in file
                                function (callback) {
                                    ocrHelper.parseXMLString(result, scan.scanName, function (err, bes) {
                                        if (err) {
                                            errorlog.error(err);
                                            return response.status(500).json({"message": "XML parsing failed."});
                                        }

                                        bes.map(function (be) {
                                            console.log(be);
                                            be.scanId = id;
                                            be.status = enums.status.ocrProcessed;
                                            br.parts.push(be);
                                        });

                                        var embodimentIndex = br.embodiedAs.indexOf(embodiment);
                                        var scanIndex = embodiment.scans.indexOf(scan);

                                        scan.xmlName = name;
                                        br.embodiedAs[embodimentIndex].scans[scanIndex] = scan;

                                        br.save().then(function (br) {
                                            callback(null, br);
                                        }, function (err) {
                                            errorlog.error(err);
                                            callback(err, null)
                                        });

                                    });
                                },
                                function (callback) {

                                    ocrHelper.saveStringFile(name, result, function (err, res) {
                                        if (err) {
                                            errorlog.error(err);
                                            return callback(err, null);
                                        }
                                        callback(null, name);
                                    });
                                },
                                function (callback) {
                                    ocrHelper.getImageForPDF(scan.scanName, function (err, res) {
                                        if (err) {
                                            errorlog.error(err);
                                            return callback(err, null);
                                        }
                                        callback(null, res);
                                    });
                                }
                            ], function (err, results) {
                                if (err) {
                                    errorlog.error(err);
                                    return response.status(500).json({"message": "An error occured."});
                                }
                                if(results[2]){
                                    ocrHelper.saveBinaryFile(scan._id.toString(), results[2], function(err, res){
                                        if (err) {
                                            errorlog.error(err);
                                            return response.status(500).json({"message": "An error occured."});
                                        }

                                        mongoBr.findOne({
                                            'embodiedAs.scans': {
                                                '$elemMatch': {
                                                    '_id': id
                                                }
                                            }
                                        }, function (err, br) {
                                            // do error handling
                                            if (err) {
                                                errorlog.error(err);
                                                return response.status(500).json({"message": "DB query failed."});
                                            }
                                            for (var embodiment of br.embodiedAs) {
                                                for (var scan of embodiment.scans) {
                                                    if (scan._id == id) {
                                                        // Interestingly, mongodb seems not to be aware of the update
                                                        // when you change the scan directly
                                                        var embodimentIndex = br.embodiedAs.indexOf(embodiment);
                                                        var scanIndex = embodiment.scans.indexOf(scan);
                                                        scan.scanName = res;
                                                        scan.status = enums.status.ocrProcessed;
                                                        br.embodiedAs[embodimentIndex].scans[scanIndex] = scan;
                                                        br.save().then(function (br) {
                                                            return response.json(br);
                                                        }, function (err) {
                                                            errorlog.error(err);
                                                            return response.status(500).json(err);
                                                        });
                                                    }
                                                }
                                            }
                                        });
                                    });
                                }else{
                                    var embodimentIndex = br.embodiedAs.indexOf(embodiment);
                                    var scanIndex = embodiment.scans.indexOf(scan);
                                    scan.status = enums.status.ocrProcessed;
                                    results[0].embodiedAs[embodimentIndex].scans[scanIndex] = scan;
                                    results[0].save().then(function (br) {
                                        return response.json(br);
                                    }, function (err) {
                                        errorlog.error(err);
                                        return response.status(500).json(err);
                                    });
                                }
                            });
                        });
                    });
                }
            }
        }
    });
}

module.exports = {
    saveScan: saveScan,
    saveScanForElectronicJournal: saveScanForElectronicJournal,
    getToDo: getToDo,
    triggerOcrProcessing: triggerOcrProcessing,
    get: get,
    remove: remove
};