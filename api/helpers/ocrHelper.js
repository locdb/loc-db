'use strict';
const config = require('./../../config/config.js');
const fs = require('fs');
const xml2js = require('xml2js');
const BibliographicEntry = require('./../schema/bibliographicEntry.js');
const request = require('request');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;
const fileType = require('file-type');


var OcrHelper = function(){
};


OcrHelper.prototype.saveBinaryFile = function(fileName, fileBuffer, callback){
    var fileExtension = fileType(fileBuffer).ext;
    var fileName = fileName + '.' + fileExtension;

    if (!fs.existsSync(config.PATHS.UPLOAD)){
        accesslog.log("Create dir", {name: config.PATHS.UPLOAD});
        fs.mkdir(config.PATHS.UPLOAD, function(err, res){
            if(err){
                errorlog.error(err);
                return callback(err, null);
            }
            fs.writeFile(config.PATHS.UPLOAD + fileName, fileBuffer, 'binary', function(err){
                if(err){
                    errorlog.error(err);
                    return callback(err, null);
                }
                callback(null, fileName);
            });
        });
    }else{
        fs.writeFile(config.PATHS.UPLOAD + fileName, fileBuffer, 'binary', function(err){
            if(err){
                errorlog.error(err);
                return callback(err, null);
            }
            callback(null, fileName);
        });
    }
};

OcrHelper.prototype.saveStringFile = function(fileName, fileString, callback){
    fs.writeFile(config.PATHS.UPLOAD + fileName, fileString, 'utf-8', function(err){
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
 * Should return a list of bibliographic entries for a given filename
 */
OcrHelper.prototype.parseXMLString = function(xmlString, callback){
    xml2js.parseString(xmlString, function(err, ocrResult){
        if(err){
            errorlog.error(err);
            return callback(err, null)
        }
        //var citations = ocrResult.algorithms.algorithm[0].citationList[0].citation;
        //var citations = ocrResult.algorithm.BibStructured;

        // check for the filename
        // .$.fname
        var citations = ocrResult.LOCDBViewResults.algorithm[0].BibStructured;
        var bes = [];
        // How to make use of the additional OCRed information?
        for (var citation of citations){

            var title = citation.title ? citation.title[0] : "";
            var date = citation.date ? citation.date[0] : "";
            var marker = citation.marker ? citation.marker[0] : "";
            var journal = citation.journal ? citation.journal[0] : "";
            var volume = citation.volume ? citation.volume[0] : "";
            var authors = [];

            if(citation.authors){
                for(var a of citation.authors){
                    var author = a.author ? a.author[0] : "";
                    authors.push(author);
                }
            }
            var be = new BibliographicEntry({bibliographicEntryText: citation.rawString[0]._,
                                            ocrData:{
                                                coordinates: citation.rawString[0]['$'].coordinates,
                                                title: title,
                                                date: date,
                                                marker: marker,
                                                authors: authors,
                                                journal: journal,
                                                volume: volume
                                            }});
            bes.push(be.toObject())
        }
        callback(null, bes);
    });
    
};


/*OcrHelper.prototype.queryOcrComponent = function(fileName, callback){
    var path = config.PATHS.UPLOAD + fileName;
    console.log(path);

    var form = {
     files: fs.createReadStream(path),
     colNumb: '2',
     pdfFlag: 'on',
     };

/!*    var files = [fs.createReadStream(path), fs.createReadStream(path)];
    var form = {
     files: files,
     colNumb: '2',
     pdfFlag: 'on',
    };*!/
    request.post({url: config.URLS.OCR, formData: form, timeout:1000000000}, function(err, res, body) {
        if (err) {
            errorlog.error(err);
            return callback(err, null);
        }else if (res.statusCode!= 200){
            errorlog.error("Request to OCR component failed.");
            return callback("Request to OCR component failed.", null);
        }
        console.log(body);
        accesslog.log("Request to OCR component successful.", {body: body});
        callback(null, body);
     });
};*/


OcrHelper.prototype.ocr_fileupload = function(fileName, callback){
    var path = config.PATHS.UPLOAD + fileName;
    var ext = fileName.split('.')[fileName.split('.').length -1].toLowerCase();
    //pdfFlag: This flag can be set for both textual and Image pdf files. It is mandatory for image pdf file
    //but optional for Textual pdf. If this flag is set for textual pdf then, it will process textual pdf as an
    //image pdf, which might result in potential loss in accuracy because of involvement of OCR and
    //increase in processing time.
    //Txt_dummy: This flag should be set for textual pdf files. It adds dummy text at the start of the file to
    //increase its accuracy by including the pages with single or few referenc
    var form;
    if(ext === "pdf"){
        form = {
            files: fs.createReadStream(path),
            pdfFlag: 'on',
            txt_dummy: 'on'
        };
    }else{
        form = {
            files: fs.createReadStream(path)
        };
    }

    request.post({url: config.URLS.OCR_FILEUPLOAD, formData: form, timeout:1000000000}, function(err, res, body) {
        if (err) {
            errorlog.error(err);
            return callback(err, null);
        }else if (res.statusCode!= 200){
            errorlog.error("Request to OCR component failed.");
            return callback("Request to OCR component failed.", null);
        }
        console.log(body);
        accesslog.log("Request to OCR component successful.", {body: body});
        callback(null, body);
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