'use strict';
const config = require('./../../config/config');
const fs = require('fs');
const xml2js = require('xml2js');
const BibliographicEntry = require('./../schema/bibliographicEntry');
const request = require('request');
const logger = require('./../util/logger');
const databaseHelper = require('./databaseHelper').createDatabaseHelper();
const fileHelper = require('./fileHelper').createFileHelper();
const enums = require('./../schema/enum.json');
const async = require('async');
const BibliographicResource = require('./../schema/bibliographicResource.js');

var OcrHelper = function(){
};

OcrHelper.prototype.triggerOcrProcessing = function(scan, id, br, callback){
    let self = this;
    self.ocr_fileupload(scan.scanName, scan.textualPdf, function (err, result) {
        if (err) {
            logger.error(err);
            logger.info("We try to set back the status of the scan");
            return databaseHelper.setScanStatus(id, enums.status.notOcrProcessed, null, function(err, result){
                if(err){
                    logger.error(err);
                    return callback(new Error("Something went wrong with setting back the scan status"), result);
                }
                return callback(new Error("Set back scan status: Something went wrong when OCR processing"), result);
            });
        }
        var name = scan._id.toString() + ".xml";
        async.parallel([
            // Do two functions in parallel: 1) parse xml string 2) save xml string in file
            function (callback) {
                self.parseXMLString(result, scan.scanName, function (err, bes) {
                    if (err) {
                        logger.error(err);
                        return callback(new Error("XML parsing failed"), bes);
                    }

                    bes.map(function (be) {
                        console.log(be);
                        be.scanId = id;
                        be.status = enums.status.ocrProcessed;
                        br.parts.push(be);
                    });

                    var helperBr = new BibliographicResource(br);
                    var embodiments = helperBr.getResourceEmbodimentsForType(br.type);
                    for (var embodiment of embodiments) {
                        for (var scan of embodiment.scans) {
                            if (scan._id == id) {
                                scan.xmlName = name;
                                var embodimentIndex = embodiments.indexOf(embodiment);
                                var scanIndex = embodiment.scans.indexOf(scan);
                                embodiments[embodimentIndex].scans[scanIndex] = scan;

                                databaseHelper.convertSchemaResourceToMongoose(helperBr, function (err, br) {
                                    if(!br){
                                        var err = new Error("Br is null")
                                        logger.error(err);
                                        return callback(err, null);
                                    }
                                    return br.save(function (err, br) {
                                        if (err) {
                                            logger.error(err);
                                            return callback(err, null)
                                        }
                                        return callback(null, br);
                                    });
                                });
                            }
                        }
                    }
                });
            },
            function (callback) {
                fileHelper.saveStringFile(name, result, function (err, res) {
                    if (err) {
                        logger.error(err);
                        return callback(err, null);
                    }
                    callback(null, name);
                });
            },
            function (callback) {
                self.getImageForPDF(scan.scanName, function (err, res) {
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
                return callback(err, results);
            }
            if(results[2]){


                fileHelper.saveBinaryFile(scan._id.toString(), results[2], function(err, res){
                    if (err) {
                        logger.error(err);
                        return callback(err, res);
                    }

                    databaseHelper.setScanStatus(id, enums.status.ocrProcessed, res, function(err, result){
                        if(err){
                            logger.error(err);
                            return callback(err, result);
                        }
                        var br = result[0];
                        return callback(null, br);
                    });
                });
            }else{
                databaseHelper.setScanStatus(id, enums.status.ocrProcessed, null, function(err, result){
                    if(err){
                        logger.error(err);
                        return callback(err, null);
                    }
                    var br = result[0];
                    return callback(null, br);
                });
            }
        });
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
OcrHelper.prototype.parseXMLString = function(xmlString, fileName, callback){
    xml2js.parseString(xmlString, function(err, ocrResult){
        if(err){
            logger.error(err);
            return callback(err, null)
        }

        var bes = [];
        for(var algorithm of ocrResult.LOCDBViewResults.algorithm){
            //if(algorithm.$.fname === fileName){
                var citations = algorithm.BibStructured;
                if(citations){
                    for (var citation of citations){

                        var title = citation.title ? citation.title[0] : "";
                        var date = citation.date ? citation.date[0] : "";
                        var marker = citation.marker ? citation.marker[0] : "";
                        var journal = citation.journal ? citation.journal[0] : "";
                        var volume = citation.volume ? citation.volume[0] : "";
                        var authors = [];
                        var coordinates = (citation.rawString && citation.rawString[0]  && citation.rawString[0]['$']) ? citation.rawString[0]['$'].coordinates : "";


                        if(citation.authors){
                            for(var a of citation.authors){
                                var author = a.author ? a.author[0] : "";
                                authors.push(author);
                            }
                        }

                        var be = new BibliographicEntry({bibliographicEntryText: citation.rawString[0]._,
                            ocrData:{
                                coordinates: coordinates,
                                title: title,
                                date: date,
                                marker: marker,
                                authors: authors,
                                journal: journal,
                                volume: volume
                            }});
                        bes.push(be.toObject())
                    }
                    return callback(null, bes);
                }
            //}
        }
        return callback(null, bes);
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
            logger.error(err);
            return callback(err, null);
        }else if (res.statusCode!= 200){
            logger.error("Request to OCR component failed.");
            return callback("Request to OCR component failed.", null);
        }
        console.log(body);
        logger.info("Request to OCR component successful.", {body: body});
        callback(null, body);
     });
};*/


OcrHelper.prototype.ocr_fileupload = function(fileName, textualPdf, callback){
    var path = config.PATHS.UPLOAD + fileName;
    var ext = fileName.split('.')[fileName.split('.').length -1].toLowerCase();
    //pdfFlag: This flag can be set for both textual and Image pdf files. It is mandatory for image pdf file
    //but optional for Textual pdf. If this flag is set for textual pdf then, it will process textual pdf as an
    //image pdf, which might result in potential loss in accuracy because of involvement of OCR and
    //increase in processing time.
    //Txt_Dummy: This flag should be set for textual pdf files. It adds dummy text at the start of the file to
    //increase its accuracy by including the pages with single or few referenc
    var form;
    if((ext === "pdf" || ext === "PDF") && !textualPdf){
        form = {
            files: fs.createReadStream(path),
            pdfFlag: 'on'
        };
    }else if((ext === "pdf" || ext === "PDF") && textualPdf){
        form = {
            files: fs.createReadStream(path),
            Txt_Dummy: 'on'
        };
    }else{
        form = {
            files: fs.createReadStream(path),
            pdfFlag: 'on'
        };
    }

    request.post({url: config.URLS.OCR_FILEUPLOAD, formData: form, timeout:1000000000}, function(err, res, body) {
        if (err) {
            logger.error(err);
            return callback(err, null);
        }else if (res.statusCode!= 200){
            logger.error("Request to OCR component failed.");
            return callback("Request to OCR component failed.", null);
        }
        logger.info("Request to OCR component successful.", {body: body});
        callback(null, body);
    });
};

OcrHelper.prototype.getImageForPDF = function(fileName, callback){
    var path = config.PATHS.UPLOAD + fileName;
    var ext = fileName.split('.')[fileName.split('.').length -1].toLowerCase();

    var form;
    if(ext === "pdf"){
        form = {
            files: fs.createReadStream(path),
        };

        request.post({url: config.URLS.OCR_IMAGEVIEW, formData: form, timeout:1000000000, encoding: null}, function(err, res, body) {
            if (err) {
                logger.error(err);
                return callback(err, null);
            }else if (res.statusCode!= 200) {
                logger.error("Request to OCR component failed.");
                return callback("Request to OCR component failed.", null);
            }
            logger.info("Request to OCR component successful.");
            return callback(null, body);
        });
    }else{
        return callback(null, null);
    }
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