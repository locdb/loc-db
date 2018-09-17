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
const Scan = require('./../schema/scan');


var OcrHelper = function(){
};

OcrHelper.prototype.triggerOcrProcessing = function(scan, id, br, callback){
    let self = this;
    self.ocrFileUpload(scan.scanName, scan.textualPdf, function (err, result) {
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
        var xmlName = scan._id.toString() + ".xml";
        async.parallel([
            // Do two functions in parallel: 1) parse xml string 2) save xml string in file
            function (callback) {
                self.parseXMLString(result, function (err, bes) {
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
                                scan.xmlName = xmlName;
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
                fileHelper.saveStringFile(xmlName, result, function (err, res) {
                    if (err) {
                        logger.error(err);
                        return callback(err, null);
                    }
                    callback(null, xmlName);
                });
            },
            function (callback) {
                self.getImagesForPDF(scan.scanName, function (err, res) {
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
                //fileHelper.saveBinaryFile(scan._id.toString(), results[2], function(err, res){
                self.saveAndUnpackZipFile(results[2], scan, br, function(err, res){
                    if (err) {
                        logger.error(err);
                        return callback(err, res);
                    }
                    let splitted_scans = [];
                    for(let file of res){
                        let splitted_scan = new Scan({
                            scanName: id + "/" + file,
                            xmlName: xmlName,
                            textualPdf: scan.textualPdf,
                            status: enums.status.ocrProcessed})
                        logger.log(file)
                        splitted_scans.push(splitted_scan);
                    }

                    databaseHelper.replaceScanWithScanPages(id, splitted_scans, function(err, result){
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
 * Should return a list of bibliographic entries for a given filename
 */
OcrHelper.prototype.parseXMLString = function(xmlString, callback) {
    xml2js.parseString(xmlString, function (err, ocrResult) {
        if (err) {
            logger.error(err);
            return callback(err, null)
        }

        var bes = [];
        if(ocrResult.LOCDBViewResults && ocrResult.LOCDBViewResults.algorithm) {
            for (var algorithm of ocrResult.LOCDBViewResults.algorithm) {
                //if(algorithm.$.fname === fileName){
                var citations = algorithm.BibStructured;
                if (citations) {
                    for (var citation of citations) {
                        var namer = citation.$ && citation.$.namer ? citation.$.namer : "";
                        var detector = citation.$ && citation.$.detector ? citation.$.detector : "";

                        var title = citation.title ? citation.title[0] : "";
                        var date = citation.date ? citation.date[0] : "";
                        var marker = citation.marker ? citation.marker[0] : "";
                        var journal = citation.journal ? citation.journal[0] : "";
                        var volume = citation.volume ? citation.volume[0] : "";
                        var authors = [];
                        var coordinates = (citation.rawString && citation.rawString[0] && citation.rawString[0]['$']) ? citation.rawString[0]['$'].coordinates : "";


                        if (citation.authors) {
                            for (var a of citation.authors) {
                                var author = a.author ? a.author[0] : "";
                                authors.push(author);
                            }
                        }

                        var be = new BibliographicEntry({
                            bibliographicEntryText: citation.rawString[0]._,
                            ocrData: {
                                coordinates: coordinates,
                                title: title,
                                date: date,
                                marker: marker,
                                authors: authors,
                                journal: journal,
                                volume: volume,
                                namer: namer,
                                detector: detector
                            },
                            scanName: algorithm.$.fname
                        });
                        bes.push(be.toObject())
                    }
                }
            }
        }
        return callback(null, bes);
    });
}


OcrHelper.prototype.ocrFileUpload = function(fileName, textualPdf, callback){
    var path = config.PATHS.UPLOAD + fileName;
    var ext = fileName.split('.')[fileName.split('.').length -1].toLowerCase();
    //pdfFlag: This flag can be set for both textual and Image pdf files. It is mandatory for image pdf file
    //but optional for Textual pdf. If this flag is set for textual pdf then, it will process textual pdf as an
    //image pdf, which might result in potential loss in accuracy because of involvement of OCR and
    //increase in processing time.
    //Txt_Dummy: This flag should be set for textual pdf files. It adds dummy text at the start of the file to
    //increase its accuracy by including the pages with single or few references
    var form;
    if((ext === "pdf" || ext === "PDF") && !textualPdf){
        // if it is a pdf file but not textual, we just set the pdf flag to on
        form = {
            files: fs.createReadStream(path),
            pdfFlag: 'on'
        };
    }else if((ext === "pdf" || ext === "PDF") && textualPdf){
        // if it is a pdf file and textual, we also add a txt dummy for improving accuracy
        form = {
            files: fs.createReadStream(path),
            pdfFlag: 'on',
            Txt_Dummy: 'on'
        };
    }else{
        // for everything else, we also set this flag because Tahseen said so
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


OcrHelper.prototype.getImagesForPDF = function(fileName, callback){
    var path = config.PATHS.UPLOAD + fileName;
    var ext = fileName.split('.')[fileName.split('.').length -1].toLowerCase();

    var form;
    // the image service only works for pdf files
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

OcrHelper.prototype.saveAndUnpackZipFile = function(zipResponse, scan, br, callback){
    logger.log("Starting zip processing");
    let zipPath = scan._id.toString();
    //zipPath = fileHelper.getAbsolutePath(zipPath);
    fileHelper.saveBinaryFile(zipPath, zipResponse, function(err, res) {
        if (err) {
            logger.error(err);
            return callback(err, res);
        }
        logger.log("Zip file saved", {zipPath : zipPath});
        fileHelper.extractZip(zipPath, zipPath, function(err, res){
            if(err){
                logger.error(err);
                return callback(err, res);
            }
            fileHelper.readFilesFromDir(fileHelper.getAbsolutePath(zipPath), function(err, files){
                if (err) {
                    logger.error(err);
                    return callback(err, null);
                }
                return callback(null, files);

            });
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