"use strict";
const ocrHelper = require('./../helpers/ocrHelper.js').createOcrHelper();
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const BibliographicResource = require('./../schema/bibliographicResource.js');
const Scan = require('./../schema/scan.js');
const status = require('./../schema/enum.json').status;
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
    
    async.parallel([
        function(callback){
            ocrHelper.saveBinaryFile(scan.originalname, scan.buffer, function(){
                callback(null, scan.originalname)
            });
        },
        function(callback){
            swbHelper.query(ppn, function(result){
                callback(null, result);
            });
        }
    ],
    function(err, results) {
        if(err){
            return res.status(400).json("An error occured.");
        }
        var br = new BibliographicResource(results[1]);
        var scan = new Scan({ scanName: results[0], status: status.notOcrProcessed, pages: pages });
        br.scans=[];
        br.scans[0]=scan;
        // TODO: How to check properly if theres already something? --> SWB ppn?
        mongoBr.findOne({br: br.title}).then((doc) => {
            if(doc  != null){
                // TODO: If there already exists one, add scan, update db and send back!
                return res.json(doc);
            }else{
                new mongoBr(br.toObject()).save().then(function(result){
                    response.json(result);
                    res.json(br.toObject);
                }, function(err){
                    response.status(400).send(err);
                });
            }
        });
    });
};

// TODO: What if more than one scan is associated with the br and one is already processed and the other not?
function getNotOcrProcessedScans(req, res){
    var response = res;
    mongoBr.find({ 'scans.status': status.notOcrProcessed }, function (err, brs) {
        if(err){
            errorlog.error(err);
            return res.status(500).json({"message":"DB query failed."});
        }
        response.json(brs);
    });
};


function getOcrProcessedScans(req, res){
    var response = res;
    mongoBr.find({ 'scans.status': status.ocrProcessed }, function (err, brs) {
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
        return res.status(400).json({"message":"Invalid parameter."});
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
    mongoBr.findOne({'scans._id': id,  'scans.status': status.notOcrProcessed}, function (err, br) {
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
                                    be.status = status.ocrProcessed;
                                    br.parts.push(be);
                                });
                                
                                // change status in scan
                                var index = br.scans.indexOf(scan);
                                scan.status = status.ocrProcessed;
                                scan.xmlName = name;
                                br.scans[index] = scan;
                                
                                br.save(function(err){
                                    if(err){
                                        errorlog.error(err);
                                        return res.status(504).json({"message":"Saving BR to DB failed."});
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
                        res.json(br);
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