"use strict";
const ocrHelper = require('./../helpers/ocrHelper.js').createOcrHelper();
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const BibliographicResource = require('./../schema/bibliographicResource.js');
const Scan = require('./../schema/scan.js');
const Part = require('./../schema/part.js');
const enums = require('./../schema/enum.json');
const async = require('async');
const mongoBr = require('./../models/bibliographicResource.js');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;
const config = require('./../../config/config.json');
const mongoose = require('mongoose');
const fs = require('fs');


function saveScan(req, res){
    var response = res;
    var scan = req.swagger.params.scan.value;
    var ppn = req.swagger.params.ppn.value;
    var pages = req.swagger.params.pages.value;
    
    // Check wether we already have something in the db
    mongoBr.findOne({"identifiers.scheme": enums.identifier.ppn, "identifiers.literalValue": ppn}).then(function(parent) {
        if (parent) {
            for (var part of parent.parts) {
                if (part.pages == pages) {
                    errorlog.error("Duplicate upload.");
                    return response.status(400).json({"message": "Duplicate upload."});
                }
            }
            ocrHelper.saveBinaryFile(scan.originalname, scan.buffer, function (err, name) {
                if (err) {
                    errorlog.error(err);
                    return res.status(500).json({"message": "Saving the file failed"});
                }
                var scan = new Scan({scanName: name, status: enums.status.notOcrProcessed});
                var child = new mongoBr({partOf: parent._id.toString(), pages: pages, scans: [scan]});
                child.save().then(function (result) {
                    parent.parts.push(new Part({
                        partId: child._id.toString(),
                        pages: pages,
                        status: enums.status.notOcrProcessed
                    }));
                    parent.save(function (result) {
                        return response.status(200).json([parent, child]);
                    }, function(err){
                        errorlog.error(err);
                        return response.status(500).json({"message": "DB failure."});
                    });
                }, function (err) {
                    errorlog.error(err);
                    return response.status(500).json({"message": "DB failure."});
                });

            });
            // do the same as before but start with creating the new br
        } else {
            async.parallel([
                    function (callback) {
                        ocrHelper.saveBinaryFile(scan.originalname, scan.buffer, function (err, name) {
                            if (err) {
                                errorlog.error(err);
                                return res.status(500).json({"message": "Saving the file failed"});
                            }
                            callback(null, name)
                        });
                    },
                    function (callback) {
                        // TODO: change interface here
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
                    var scan = new Scan({scanName: results[0], status: enums.status.notOcrProcessed});
                    var child = new mongoBr({scans: [scan.toObject()]});
                    parent.parts = [new Part({
                        partId: child._id.toString(),
                        pages: pages,
                        status: enums.status.notOcrProcessed
                    }).toObject()];
                    child.partOf = parent._id.toString();

                    // Save scan and child
                    async.parallel([
                        function(callback){
                            new mongoBr(parent.toObject()).save().then(function (result) {
                                callback(null, result)
                            }, function (err) {
                                errorlog.error(err);
                                return response.status(400).send(err);
                            });
                        },
                        function(callback){
                            child.save().then(function (result) {
                                callback(null, result)
                            }, function (err) {
                                errorlog.error(err);
                                return response.status(400).send(err);
                            });
                        }],
                        function(err, result){
                            if (err) {
                                errorlog.error(err);
                                return res.status(400).json("An error occured.");
                            }
                            return response.status(200).json(result);
                        });
                });
        }
        ;
    });
};

// TODO: What if more than one scan is associated with the br and one is already processed and the other not?
function getNotOcrProcessedScans(req, res){
    var response = res;
    mongoBr.find({'scans.status': enums.status.notOcrProcessed }, function (err, brs) {
        if(err){
            errorlog.error(err);
            return response.status(500).json({"message":"DB query failed."});
        }
        response.json(brs);
    });
};


function getOcrProcessedScans(req, res){
    var response = res;
    mongoBr.find({ 'scans.status': enums.status.ocrProcessed }, function (err, brs) {
        if(err){
            errorlog.error(err);
            return res.status(500).json({"message":"DB query failed."});
        }
        // Loop over BEs and take only the scans that are really OCR processed and also only their id?
        response.json(brs);
    });
};


function get(req, res){
    var response = res;
    var id = req.swagger.params.id.value;
    
    // check if id is valid
    if(! mongoose.Types.ObjectId.isValid(id)){
        errorlog.error("Invalid value for parameter id.", {id : id});
        return response.status(400).json({"message":"Invalid parameter."});
    }
    
    // retrieve corresponding entry from the db
    mongoBr.findOne({ 'scans._id': id }, function (err, br) {
        if(err){
            errorlog.error(err);
            return response.status(500).json({"message":"DB query failed."});
        }else if(!br){
            errorlog.error("No entry found for parameter id.", {id : id});
            return response.status(400).json({"message":"No entry found."});
        }
        for(var scan of br.scans){
            if(scan._id == id){
                // send file
                var filePath = config.upload.imagePath + scan.scanName;
                return response.sendFile(filePath, {root: process.cwd()}, function(err){
                    if(err) return errorlog.error(err);
                });
            }
        }
    });
};


function triggerOcrProcessing(req, res){
    var id = req.swagger.params.id.value;
    var response = res;
    
    // check if id is valid
    if(! mongoose.Types.ObjectId.isValid(id)){
        errorlog.error("Invalid value for parameter id.", {id : id});
        return res.status(400).json({"message":"Invalid parameter."});
    }
    
    
    // read the corresponding scan by id
    mongoBr.findOne({'scans._id': id,  'scans.status': enums.status.notOcrProcessed}, function (err, br) {
        // do error handling
        if(err){
            errorlog.error(err);
            return response.status(500).json({"message":"DB query failed."});
        }else if(!br){
            errorlog.error("No entry found for parameter id.", {id : id});
            return response.status(400).json({"message":"No entry found."});
        }
        
        // TODO: Can we use a projection for filtering the right scan?
        for(var scan of br.scans){
            if(scan._id == id){
                ocrHelper.queryOcrComponent(scan.scanName, function(err, result){
                    if(err){
                        errorlog.error(err);
                        return res.status(504).json({"message":"OCR request failed."});
                    }
                    // TODO: assume that we got this name from the server answer? Mocking purpose.
                    var name = "xmltest.xml";
                    async.parallel([
                        // Do two functions in parallel: 1) parse xml string 2) save xml string in file
                        function(callback){
                            ocrHelper.parseXMLString(result, function(err, bes){
                                if(err){
                                    errorlog.error(err);
                                    return res.status(504).json({"message":"XML parsing failed."});
                                }
                                
                                bes.map(function(be){
                                    console.log(be);
                                    be.scanId = id;
                                    be.status = enums.status.ocrProcessed;
                                    br.cites.push(be);
                                });
                                
                                // change status in scan
                                var index = br.scans.indexOf(scan);
                                scan.status = enums.status.ocrProcessed;
                                scan.xmlName = name;
                                br.scans[index] = scan;
                                
                                br.save(function(err){
                                    if(err){
                                        errorlog.error(err);
                                        return response.status(504).json({"message":"Saving BR to DB failed."});
                                    }
                                });
                                callback(null, br);
                            });
                        },
                        function(callback){
                            
                            ocrHelper.saveStringFile(name, result, function(err, res){
                                if(err){
                                    errorlog.error(err);
                                    return callback(err, null);
                                }
                                callback(null, name);
                            });
                        }
                    ], function(err, results) {
                        if(err){
                            errorlog.error(err);
                            return response.status(500).json({"message":"An error occured."});
                        }
                        response.json(br);
                    });

                });
            }
        }
    });
}

////TODO: Should I add this to bibliographicResource.js?
//function saveScan(req, res){
//    // Get PPN param from request?
//    var image = req.swagger.params.image.value;
//    var xml = req.swagger.params.xml.value;
//    var ppn = req.swagger.params.ppn.value;
//    
//    async.parallel([
//        function(callback){
//            ocrHelper.saveBinaryFile(image.originalname, image.buffer, function(){
//                callback(null, "Image")
//            });
//        },
//        function(callback){
//            ocrHelper.saveBinaryFile(xml.originalname, xml.buffer, function(){
//                callback(null, "XML");
//            });
//        },
//        function(callback){
//            ocrHelper.parseXML(xml.originalname, xml.buffer, function(result){
//                callback(null, result);
//            });
//        },
//        function(callback){
//            swbHelper.query(ppn, function(result){
//                callback(null, result);
//            });
//        }
//    ],
//    function(err, results) {
//        if(err){
//            return res.json("An error occured.");
//        }
//        var br = new BibliographicResource(results[3]);
//        console.log(br);
//        br.parts = results[2];
//        console.log("\n\n\n");
//        console.log(br.toObject());
//        res.json(results[2]);
//    });
//}

module.exports = {
        saveScan : saveScan,
        getNotOcrProcessedScans : getNotOcrProcessedScans,
        getOcrProcessedScans : getOcrProcessedScans,
        triggerOcrProcessing : triggerOcrProcessing,
        get : get
};