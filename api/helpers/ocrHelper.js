'use strict';
const config = require('./../../config/config.json');
const fs = require('fs');
const xml2js = require('xml2js');
const BibliographicEntry = require('./../schema/bibliographicEntry.js');
const request = require('request');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;


var OcrHelper = function(){
};


OcrHelper.prototype.saveBinaryFile = function(fileName, fileBuffer, callback){
    var fName = fileName;
    fs.writeFile(config.upload.imagePath + fileName, fileBuffer, 'binary', function(err){
        if(err){
            errorlog.error(err);
            return callback(err, null);;
        }
        callback(null, fName);
    });
};

OcrHelper.prototype.saveStringFile = function(fileName, fileString, callback){
    fs.writeFile(config.upload.imagePath + fileName, fileString, 'utf-8', function(err){
        if(err){
            errorlog.error(err);
            return callback(err, null)
        }
        callback(null,null);
    });
};

/**
 * Should return a list of bibliographic entries
 */
OcrHelper.prototype.parseXMLBuffer = function(fileName, fileBuffer, callback){
    var xmlString = fileBuffer.toString('utf-8');
    xml2js.parseString(xmlString, function(err, ocrResult){
        if(err){
            return console.log(err);
        }
        var citations = ocrResult.algorithms.algorithm[0].citationList[0].citation;
        console.log(citations[0].rawString);
        var bes = [];
        // How to make use of the additional OCRed information?
        for (var citation of citations){
            var be = new BibliographicEntry({bibliographicEntryText: citation.rawString[0]._, coordinates: citation.rawString[0]['$'].coordinates});
            bes.push(be)
        }
        callback(bes);
    });
    
};

/**
 * Should return a list of bibliographic entries
 */
OcrHelper.prototype.parseXMLString = function(xmlString, callback){
    xml2js.parseString(xmlString, function(err, ocrResult){
        if(err){
            errorlog.error(err);
            return callback(err, null)
        }
        var citations = ocrResult.algorithms.algorithm[0].citationList[0].citation;
        var bes = [];
        // How to make use of the additional OCRed information?
        for (var citation of citations){
            var be = new BibliographicEntry({bibliographicEntryText: citation.rawString[0]._, coordinates: citation.rawString[0]['$'].coordinates});
            bes.push(be)
        }
        callback(null, bes);
    });
    
};


OcrHelper.prototype.queryOcrComponent = function(fileName, callback){
    var path = config.upload.imagePath + fileName;

    fs.access(path, fs.constants.R_OK, function(err){
        if (err){
            errorlog.error(err);
            return callback(err, null);
        }
        var form = {
                file: fs.createReadStream(path)//,
                //filename: fileName
        };
        request.post({url: config.urls.ocrUrl, formData: form}, function(err, res, body) {
            if (err) {
                errorlog.error(err);
                return callback(err, null);
            }else if (res.statusCode!= 200){
                errorlog.error("Request to OCR component failed.");
                return callback("Request to OCR component failed.", null);
            }
            accesslog.log("Request to OCR component successfull.", {body: body});
            callback(null, body);
         });
    });
};

/**
 * Factory function
 *
 * @returns {OcrHelper}
*/
function createOcrHelper() {
    return new OcrHelper();
}


module.exports = {
        createOcrHelper : createOcrHelper
};