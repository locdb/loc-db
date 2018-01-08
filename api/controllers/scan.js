"use strict";
const ocrHelper = require('./../helpers/ocrHelper.js').createOcrHelper();
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const BibliographicResource = require('./../schema/bibliographicResource.js');
const ResourceEmbodiment = require('./../schema/resourceEmbodiment');
const Scan = require('./../schema/scan.js');
const enums = require('./../schema/enum.json');
const async = require('async');
const mongoBr = require('./../models/bibliographicResource.js');
const logger = require('./../util/logger.js');
const config = require('./../../config/config.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const databaseHelper = require('./../helpers/databaseHelper.js').createDatabaseHelper();
const crossrefHelper = require('./../helpers/crossrefHelper').createCrossrefHelper();



function saveResource(req, res) {
    var response = res;
    var identifier = {
        "scheme": req.swagger.params.identifierScheme.value,
        "literalValue": req.swagger.params.identifierLiteralValue.value
    };
    var resourceType = req.swagger.params.resourceType.value;
    var firstPage = req.swagger.params.firstPage.value;
    var lastPage = req.swagger.params.lastPage.value;
    var binaryFile = req.swagger.params.binaryFile.value;
    var textualPdf = req.swagger.params.textualPdf.value;
    var stringFile = req.swagger.params.stringFile.value;
    var embodimentType = req.swagger.params.embodimentType.value;

    // 1. Check whether resource already exists given it's identifier, resourceType and maybe first or lastPage
    databaseHelper.resourceExists(identifier, resourceType, firstPage, lastPage, function(err, resource) {
        if (err) {
            logger.error(err);
            return response.status(500).json(err);
        } else if (resource) {
            // 1a. resource already exists
            // 2. now we have to append the string file or textual pdf if given
            if (!binaryFile && !stringFile) {
                return response.status(400).json({"message": "The resource already exists."});
            }
            return databaseHelper.saveReferencesPageForResource(resource[0], binaryFile, textualPdf, stringFile, embodimentType, function (err, result) {
                if (err) {
                    logger.error(err);
                    return response.status(500).json(err);
                }
                // retrieve parent if necessary
                if(result[0].partOf && result[0].partOf !== ""){
                    mongoBr.findById(result[0].partOf, function(err, parent){
                        return response.json([result[0], parent, result[1]]);
                    });
                }else{
                    return response.json(result);
                }
            });
        } else if (!resource) {
            // 1b. resource does not exist; we will have to create it depending on the resourceType and identifier
            switch (resourceType) {
                case enums.resourceType.journal:
                    // The resource is a journal, the ZDB ID should be given and basically nothing else
                    if (identifier.scheme !== enums.identifier.zdb_ppn || stringFile || binaryFile || firstPage || lastPage) {
                        return response.status(400).json({"message": "In order to create a journal resource in the db, provide the zdb ppn."})
                    } else {
                        return swbHelper.query(identifier.literalValue, resourceType, function (err, resource) {
                            if (err) {
                                logger.error(err);
                                return response.status(500).json(err);
                            }
                            // we retrieved the metadata; As it should not be possible to append a scan directly to a journal,
                            // we are done
                            //resource.type = resourceType;
                            mongoBr.create(resource, function (err, resource) {
                                if (err) {
                                    logger.error(err);
                                    return response.status(500).json(err);
                                }
                                return response.status(200).json(resource);
                            });
                        });
                    }
                case enums.resourceType.journalArticle:
                    if (identifier.scheme !== enums.identifier.olc_ppn && identifier.scheme !== enums.identifier.doi) {
                        return response.status(400).json({"message": "Not the appropriate input data for creating a journal article."})
                    } else {
                        switch (identifier.scheme) {
                            case enums.identifier.doi:
                                // go to crossref and create article
                                return crossrefHelper.queryByDOI(identifier.literalValue, function (err, resources) {
                                    // wenn das issue nicht existiert, kann auch der article nicht existieren
                                    // hier muss hierarschich vorgegangen werden
                                    databaseHelper.curateHierarchy(resources, function (err, resources) {
                                        // jetzt müssen wir gucken, ob man noch einen Scan speichern muss oder nicht
                                        if (!binaryFile && !stringFile) {
                                            return response.json(resources);
                                        }
                                        for (var resource of resources) {
                                            if (resource.type === enums.resourceType.journalArticle) {
                                                databaseHelper.saveReferencesPageForResource(resource, binaryFile, textualPdf, stringFile, embodimentType, function (err, result) {
                                                    if (err) {
                                                        logger.error(err);
                                                        return response.status(500).json(err);
                                                    }
                                                    result = [result[0], resources[1], result[1]];
                                                    return response.json(result);
                                                });
                                            }
                                        }

                                    });
                                });
                            case enums.identifier.olc_ppn:
                                // go to olc and create article
                                return response.status(400).json({"message": "Identifier type not implemented."});
                        }
                    }
                case enums.resourceType.bookChapter || enums.resourceType.proceedingsArticle:
                    //return response.status(400).json({"message": "Resource type not implemented yet."});
                    switch (identifier.scheme) {
                        case enums.identifier.doi:
                            // go to crossref and create chapter
                            return crossrefHelper.queryByDOI(identifier.literalValue, function (err, resources) {
                                databaseHelper.curateHierarchy(resources, function (err, resources) {
                                    if (!binaryFile && !stringFile) {
                                        return response.json(resources);
                                    }
                                    for (var resource of resources) {
                                        if (resource.type === enums.resourceType.journalArticle) {
                                            databaseHelper.saveReferencesPageForResource(resource, binaryFile, textualPdf, stringFile, embodimentType, function (err, result) {
                                                if (err) {
                                                    errorlog.error(err);
                                                    return response.status(500).json(err);
                                                }
                                                return response.json(result);
                                            });
                                        }
                                    }

                                });
                            });
                        case enums.identifier.swb_ppn:
                            return swbHelper.query(identifier.literalValue, resourceType, function (err, resources) {
                                if (err) {
                                    logger.error(err);
                                    return response.status(500).json(err);
                                }
                                var parent = resources[0];
                                crossrefHelper.queryChapterMetaData(parent.getTitleForType(parent.type), firstPage, lastPage, function(err, res) {
                                    if (err) {
                                        logger.error(err);
                                        return callback(err, null);
                                    }
                                    if (res[0]) {
                                        var child = new BibliographicResource(res[0]);
                                    } else {
                                        var child = new BibliographicResource({
                                            type: enums.resourceType.bookChapter,
                                            bookChapter_embodiedAs: [new ResourceEmbodiment({
                                                firstPage: firstPage,
                                                lastPage: lastPage
                                            })]
                                        });
                                    }
                                    resources = [child, parent];
                                    databaseHelper.curateHierarchy(resources, function (err, resources) {
                                        // jetzt müssen wir gucken, ob man noch einen Scan speichern muss oder nicht
                                        if (!binaryFile && !stringFile) {
                                            return response.json(resources);
                                        }
                                        child = resources[0];
                                        parent = resources[1];
                                        databaseHelper.saveReferencesPageForResource(child, binaryFile, textualPdf, stringFile, embodimentType, function (err, result) {
                                            if (err) {
                                                logger.error(err);
                                                return response.status(500).json(err);
                                            }
                                            result = [result[0], parent, result[1]];
                                            return response.json(result);
                                        });


                                    });
                                });
                            });
                    }
                case enums.resourceType.monograph || enums.resourceType.book:
                    return swbHelper.query(identifier.literalValue, resourceType, function (err, resource) {
                        if (err) {
                            logger.error(err);
                            return response.status(500).json(err);
                        }
                        // we retrieved the metadata;
                        // now we have to check, whether we have to append something
                        return mongoBr.create(resource[0], function (err, resource) {
                            if (err) {
                                logger.error(err);
                                return response.status(500).json(err);
                            }
                            if (binaryFile || stringFile) {
                                return databaseHelper.saveReferencesPageForResource(resource, binaryFile, textualPdf, stringFile, embodimentType, function (err, result) {
                                    if (err) {
                                        logger.error(err);
                                        return response.status(500).json(err);
                                    }
                                    return response.json(result);
                                });
                            } else {
                                return response.status(200).json(resource);
                            }
                        });

                    });
                default:
                    return response.status(400).json({"message": "Resource type not implemented."});
            }
        }
    });
}



function getToDo(req, res) {
    var response = res;
    var status = req.swagger.params.status.value;
    if ((status !== enums.status.notOcrProcessed) && (status !== enums.status.ocrProcessed) && (status !== enums.status.external)) {
        logger.error(err);
        return response.status(400).json({"message": "Invalid parameter."});
    }

    if(status == enums.status.ocrProcessed) {
        databaseHelper.createSimpleEqualsConditions('embodiedAs', enums.status.ocrProcessed, '.scans.status', function(err,conditions){
            if(err){
                logger.error(err);
                return response.status(500).json({"message": "Something weird happened."});
            }
            return mongoBr.find({'$or': conditions}, function (err, children) {
                if (err) {
                    logger.error(err);
                    return response.status(500).json({"message": "DB query failed."});
                }
                return mapChildrenAndParents(children, function(err, result){
                    if (err) {
                        logger.error(err);
                        return response.status(500).json({"message": "Mapping failed."});
                    }
                    return response.json(result);
                });

            });
        });
    }else if (status == enums.status.notOcrProcessed){
        databaseHelper.createSimpleEqualsConditions('embodiedAs', enums.status.notOcrProcessed, '.scans.status', function(err,conditions_1){
            if (err) {
                logger.error(err);
                return response.status(500).json({"message": "Something weird happened."});
            }
            databaseHelper.createSimpleEqualsConditions('embodiedAs', enums.status.ocrProcessing, '.scans.status', function(err,conditions_2){
                if (err) {
                    logger.error(err);
                    return response.status(500).json({"message": "Something weird happened."});
                }
                conditions_1 = {'$or': conditions_1};
                conditions_2 = {'$or': conditions_2};

                mongoBr.find({'$or': [conditions_1, conditions_2]}, function (err, children) {
                    if (err) {
                        logger.error(err);
                        return response.status(500).json({"message": "DB query failed."});
                    }
                    return mapChildrenAndParents(children, function(err, result){
                        if (err) {
                            logger.error(err);
                            return response.status(500).json({"message": "Mapping failed."});
                        }
                        return response.json(result);
                    });

                });
            });
        });

    }else if (status == enums.status.external){
        // this case applies only to electronic journals at the moment and only if there is no scan uploaded yet
        mongoBr.find({'status': status}, function (err, children) {
            if (err) {
                logger.error(err);
                return response.status(500).json({"message": "DB query failed."});
            }
            return mapChildrenAndParents(children, function(err, result){
                if (err) {
                    logger.error(err);
                    return response.status(500).json({"message": "Mapping failed."});
                }
                return response.json(result);
            });
        });
    }
}


function get(req, res) {
    var response = res;
    var id = req.swagger.params.id.value;

    // check if id is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.error("Invalid value for parameter id.", {id: id});
        return response.status(400).json({"message": "Invalid parameter."});
    }

    // retrieve corresponding entry from the db
    mongoBr.findOne({'embodiedAs.scans._id': id}, function (err, br) {
        if (err) {
            logger.error(err);
            return response.status(500).json({"message": "DB query failed."});
        } else if (!br) {
            logger.error("No entry found for parameter id.", {id: id});
            return response.status(400).json({"message": "No entry found."});
        }
        for (var embodiment of br.embodiedAs) {
            for (var scan of embodiment.scans) {
                if (scan._id == id) {
                    // send file
                    var filePath = config.PATHS.UPLOAD + scan.scanName;
                    return response.sendFile(path.resolve(filePath), function (err) {
                        if (err) return logger.error(err);
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
        logger.error("Invalid value for parameter id.", {id: id});
        return response.status(400).json({"message": "Invalid parameter."});
    }

    // retrieve corresponding entry from the db
    mongoBr.findOne({'embodiedAs.scans._id': id}, function (err, br) {
        if (err) {
            logger.error(err);
            return response.status(500).json({"message": "DB query failed."});
        } else if (!br) {
            logger.error("No entry found for parameter id.", {id: id});
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
                            logger.error(err);
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
        logger.error("Invalid value for parameter id.", {id: id});
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
            logger.error(err);
            return response.status(500).json({"message": "DB query failed."});
        } else if (!br) {
            logger.error("No entry found for parameter id.", {id: id});
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
                        ocrHelper.ocr_fileupload(scan.scanName, scan.textualPdf, function (err, result) {
                            if (err) {
                                logger.error(err);
                                logger.info("We try to set back the status of the scan");
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
                                            logger.error(err);
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
                                            logger.error(err);
                                            callback(err, null)
                                        });

                                    });
                                },
                                function (callback) {

                                    ocrHelper.saveStringFile(name, result, function (err, res) {
                                        if (err) {
                                            logger.error(err);
                                            return callback(err, null);
                                        }
                                        callback(null, name);
                                    });
                                },
                                function (callback) {
                                    ocrHelper.getImageForPDF(scan.scanName, function (err, res) {
                                        if (err) {
                                            logger.error(err);
                                            return callback(err, null);
                                        }
                                        callback(null, res);
                                    });
                                }
                            ], function (err, results) {
                                if (err) {
                                    logger.error(err);
                                    return response.status(500).json({"message": "An error occured."});
                                }
                                if(results[2]){
                                    ocrHelper.saveBinaryFile(scan._id.toString(), results[2], function(err, res){
                                        if (err) {
                                            logger.error(err);
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
                                                logger.error(err);
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
                                                            logger.error(err);
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
                                        logger.error(err);
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
};


function mapChildrenAndParents(children, callback){
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
            var resultChild = child.toObject();

            if (!resultObject.children) {
                resultObject.children = [];
            }
            resultObject.children.push(resultChild);
            if (!alreadyIn) {
                resultArray.push(resultObject);
            }
        } else {
            // This applies to independent resources
            var resultObject = child.toObject();
            resultArray.push(child);
        }
    }
    // add additional information for displaying it to the user
    async.map(resultArray, function (parent, callback) {
        // check first whether it is really a parent
        if (parent.children) {
            mongoBr.findOne({'_id': parent._id}, function (err, br) {
                if (err) {
                    logger.error(err);
                    return callback(err, null)
                }
                if (!br) {
                    return callback(null, parent);
                }
                // copy all properties
                for(var k in br.toObject()){
                    parent[k] = br.toObject()[k];
                }
                callback(null, parent);
            });
        } else {
            callback(null, parent);
        }
    }, function (err, res) {
        return callback(err, res);
    });
};


module.exports = {
    saveResource: saveResource,
    getToDo: getToDo,
    triggerOcrProcessing: triggerOcrProcessing,
    get: get,
    remove: remove
};