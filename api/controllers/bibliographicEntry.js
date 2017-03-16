'use strict';
const mongoBr = require('./../models/bibliographicResource.js');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;
const status = require('./../schema/enum.json').status;

function getOcrProcessedBibliographicEntries(req, res){
    var response = res;
    mongoBr.find({ 'parts.status': status.ocrProcessed }, function (err, bes) {
        if(err){
            errorlog.error(err);
            return res.status(500).json({"message":"DB query failed."});
        }
        // Loop over BEs and take only the scans that are really OCR processed and also only their id?
        response.json(bes);
    });
}

module.exports = {
        getOcrProcessedBibliographicEntries : getOcrProcessedBibliographicEntries
};