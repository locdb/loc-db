'use strict';
const config = require('./../../config/config.json');
const fs = require('fs');
const xml2js = require('xml2js');
const BibliographicEntry = require('./../schema/bibliographicEntry.js');


var OcrHelper = function(){
};


OcrHelper.prototype.saveBinaryFile = function(fileName, fileBuffer, callback){
    fs.writeFile(config.upload.imagePath + fileName, fileBuffer, 'binary', function(err){
        if(err){
            return console.log(err);
        }
        callback();
    });
};

/**
 * Should return a list of bibliographic entries
 */
OcrHelper.prototype.parseXML = function(fileName, fileBuffer, callback){
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