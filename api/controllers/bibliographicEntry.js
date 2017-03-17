'use strict';
const mongoBr = require('./../models/bibliographicResource.js');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;
const status = require('./../schema/enum.json').status;
const mongoose = require('mongoose');

function getToDoBibliographicEntries(req, res){
    var response = res;
    var scanId = req.swagger.params.scanId.value;

    if(scanId){
        // check if id is valid
        if(! mongoose.Types.ObjectId.isValid(scanId)){
            errorlog.error("Invalid value for parameter id.", {scanId : scanId});
            return response.status(400).json({"message":"Invalid parameter."});
        }
        mongoBr.find({ 'cites.status': status.ocrProcessed, 'cites.scanId' : scanId}, function (err, brs) {
            if(err){
                errorlog.error(err);
                return res.status(500).json({"message":"DB query failed."});
            }
            response.json(createBibliographicEntriesArray(brs));
        });
    }else{
        mongoBr.find({ 'cites.status': status.ocrProcessed }, function (err, brs) {
            if(err){
                errorlog.error(err);
                return res.status(500).json({"message":"DB query failed."});
            }
            response.json(createBibliographicEntriesArray(brs));
        });
    }
}


function createBibliographicEntriesArray(brs){
    // Loop over BEs and take only the scans that are really OCR processed
    if(brs.length > 0){
        var result = [];
        for(var br of brs){
            for(var be of br.cites){
                if(be.status === status.ocrProcessed){
                    result.push(be);
                }
            }
        }
        return result;
    }else{
        return [];
    }
}

module.exports = {
    getToDoBibliographicEntries : getToDoBibliographicEntries
};