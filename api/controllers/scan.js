"use strict";
const ocrHelper = require('./../helpers/ocrHelper.js').createOcrHelper();
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const BibliographicResource = require('./../schema/bibliographicResource.js');
const Scan = require('./../schema/scan.js');
const status = require('./../schema/enum.json').status;
const async = require('async');
const mongoBr = require('./../models/bibliographicResource.js');

//TODO: Should I add this to bibliographicResource.js?
function saveScan(req, res){
    console.log("Function called");
    var response = res;
    var scan = req.swagger.params.scan.value;
    var ppn = req.swagger.params.ppn.value;
    console.log(ppn);
    
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
        var scan = new Scan({ scanName: results[0], status: status.notOcrProcessed });
        br.scans=[];
        br.scans[0]=scan;
        // TODO: How to check properly if theres already something? --> SWB ppn?
        mongoBr.findOne({br: br.title}).then((doc) => {
            if(doc  != null){
                // TODO: If there already exists one, add scan, update db and send back?
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


function getNotOcrProcessedScans(req, res){
    var response = res;
    console.log("function called");
    mongoBr.find({ 'scans.status': status.notOcrProcessed }, function (err, brs) {
        if (err) return console.log(err);
        response.json(brs);
    });
};


function triggerOcrProcessing(req, res){
    console.log("Test");
    ocrHelper.query(function(result){
        console.log(result);
        res.json("TEST");
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
        triggerOcrProcessing : triggerOcrProcessing
};