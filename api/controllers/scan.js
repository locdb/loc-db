"use strict";
const ocrHelper = require('./../helpers/OcrHelper.js').createOcrHelper();
const async = require('async');

//TODO: Should I add this to bibliographicResource.js?
function saveScan(req, res){
    // Get PPN param from request?
    var image = req.swagger.params.image.value;
    var xml = req.swagger.params.xml.value;
    
    async.parallel([
        function(callback){
            ocrHelper.saveBinaryFile(image.originalname, image.buffer, function(){
                callback("Successfully saved", "Image")
            });
        },
        function(callback){
            ocrHelper.saveBinaryFile(xml.originalname, xml.buffer, function(){
                callback("Successfully saved", "XML");
            });
        },
        function(callback){
            ocrHelper.parseXML(xml.originalname, xml.buffer, function(){
                callback("Successfully parsed", "XML");
            });
        }
    ],
    function(err, results) {
        if(err){
            return res.json("An error occured.");
        }
        res.json(results);
    });
}

module.exports = {
        saveScan : saveScan
};