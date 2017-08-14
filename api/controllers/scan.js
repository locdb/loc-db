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
        databaseHelper.savePrintMonograph(scan, ppn, function(err,res){
            response.json(res);
        });
    }else if(resourceType == enums.resourceType.journal
        || resourceType == enums.resourceType.collection) {
        databaseHelper.savePrintSubresource(scan, firstPage, lastPage, ppn, function (err, res) {
            response.json(res);
        });
    }
/*


    mongoBr.findOne({
        "identifiers.scheme": enums.identifier.ppn,
        "identifiers.literalValue": ppn
    }).then(function (parent) {
        // We want to save each scan with a unique id. So, first of all, we have to generate it.
        var scanId = mongoose.Types.ObjectId().toString();
        if (parent) {
            mongoBr.find({
                partOf: parent._id,
                embodiedAs: {$elemMatch: {firstPage: firstPage, lastPage: lastPage}}
            }, function (err, brs) {
                if (err) {
                    errorlog.error(err);
                    return res.status(500).json({"message": "DB error."});
                }
                if (brs.length > 0) {
                    errorlog.error("Duplicate upload.");
                    return response.status(400).json({"message": "Duplicate upload."});
                }
                ocrHelper.saveBinaryFile(scanId, scan.buffer, function (err, scanName) {
                    if (err) {
                        errorlog.error(err);
                        return res.status(500).json({"message": "Saving the file failed"});
                    }
                    var scan = new Scan({_id: scanName.split(".png")[0], scanName: scanName, status: enums.status.notOcrProcessed});
                    var child = new mongoBr({
                        partOf: parent._id.toString(),
                        embodiedAs: [{firstPage: firstPage, lastPage: lastPage, scans: [scan]}]
                    });
                    child.save().then(function (result) {
                        return response.status(200).json([parent, child]);
                    }, function (err) {
                        errorlog.error(err);
                        return response.status(500).json({"message": "DB failure."});
                    });
                });
            });
        } else {
            async.parallel([
                    function (callback) {
                        ocrHelper.saveBinaryFile(scanId, scan.buffer, function (err, scanName) {
                            if (err) {
                                errorlog.error(err);
                                return res.status(500).json({"message": "Saving the file failed"});
                            }
                            callback(null, scanName)
                        });
                    },
                    function (callback) {
                        swbHelper.query(ppn, function (result) {
                            callback(null, result);
                        });
                    }
                ],
                function (err, results) {
                    if (err) {
                        errorlog.error(err);
                        return res.status(400).json("An error occured.");
                    }
                    // create parent
                    var parent = new mongoBr(results[1]);
                    parent.identifiers.push({scheme: enums.identifier.ppn, literalValue: ppn})

                    // create scan and child
                    var scan = new Scan({_id: results[0].split(".png")[0], scanName: results[0], status: enums.status.notOcrProcessed});
                    var child = new mongoBr({
                        partOf: parent._id.toString(),
                        embodiedAs: [{
                            firstPage: firstPage,
                            lastPage: lastPage,
                            scans: [scan.toObject()]
                        }]
                    });

                    // Save parent and child
                    async.parallel([
                            function (callback) {
                                parent.save().then(function (result) {
                                    callback(null, result)
                                }, function (err) {
                                    errorlog.error(err);
                                    return response.status(400).send(err);
                                });
                            },
                            function (callback) {
                                child.save().then(function (result) {
                                    callback(null, result)
                                }, function (err) {
                                    errorlog.error(err);
                                    return response.status(400).send(err);
                                });
                            }],
                        function (err, result) {
                            if (err) {
                                errorlog.error(err);
                                return res.status(400).json("An error occured.");
                            }
                            return response.status(200).json(result);
                        });
                });
        }
    });*/
};

// TODO: What if more than one scan is associated with the br and one is already processed and the other not?
// old version
function getNotOcrProcessedScans2(req, res) {
    var response = res;
    mongoBr.find({'scans.status': enums.status.notOcrProcessed}, function (err, brs) {
        if (err) {
            errorlog.error(err);
            return response.status(500).json({"message": "DB query failed."});
        }
        response.json(brs);
    });
};

function getToDo(req, res) {
    var response = res;
    var status = req.swagger.params.status.value;
    if ((status !== enums.status.notOcrProcessed) && (status !== enums.status.ocrProcessed)) {
        errorlog.error(err);
        return response.status(400).json({"message": "Invalid parameter."});
    }
    mongoBr.find({'embodiedAs.scans.status': status}, function (err, children) {
        if (err) {
            errorlog.error(err);
            return response.status(500).json({"message": "DB query failed."});
        }
        var resultArray = [];
        var resultObject;
        for (var child of children) {
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
                        scans.push({"_id": scan._id.toString(), "status": scan.status, "firstPage": embodiment.firstPage, "lastPage": embodiment.lastPage});
                    }
                }
            }

            resultChild.scans = scans;
            resultObject.children.push(resultChild);
            if (!alreadyIn) {
                resultArray.push(resultObject);
            }
        }
        // add additional information for displaying it to the user
        async.map(resultArray, function(parent, callback) {
            mongoBr.findOne({'_id': parent._id}, function (err, br) {
                if (err) {
                    errorlog.error(err);
                    return callback(err, null)
                }
                if(!br){
                    callback(null, parent);
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
        }, function(err, res) {
            if (err) {
                errorlog.error(err);
                return response.status(500).json({"message": "DB query failed."});
            }
            response.json(res);
        });

    });
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

        // TODO: Can we use a projection for filtering the right scan?
        for (var embodiment of br.embodiedAs) {
            for (var scan of embodiment.scans) {
                if (scan._id == id) {
                    ocrHelper.queryOcrComponent(scan.scanName, function (err, result) {
                        if (err) {
                            errorlog.error(err);
                            return res.status(502).json({"message": "OCR request failed."});
                        }
                        var name = scan._id.toString() + ".xml";
                        async.parallel([
                            // Do two functions in parallel: 1) parse xml string 2) save xml string in file
                            function (callback) {
                                ocrHelper.parseXMLString(result, function (err, bes) {
                                    if (err) {
                                        errorlog.error(err);
                                        return res.status(500).json({"message": "XML parsing failed."});
                                    }

                                    bes.map(function (be) {
                                        console.log(be);
                                        be.scanId = id;
                                        be.status = enums.status.ocrProcessed;
                                        br.parts.push(be);
                                    });

                                    var embodimentIndex = br.embodiedAs.indexOf(embodiment);
                                    var scanIndex = embodiment.scans.indexOf(scan);
                                    scan.status = enums.status.ocrProcessed;
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
                            }
                        ], function (err, results) {
                            if (err) {
                                errorlog.error(err);
                                return response.status(500).json({"message": "An error occured."});
                            }
                            response.json(results[0]);
                        });

                    });
                }
            }
        }
    });
}

module.exports = {
    saveScan: saveScan,
    getToDo: getToDo,
    triggerOcrProcessing: triggerOcrProcessing,
    get: get
};