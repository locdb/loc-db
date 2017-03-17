'use strict';
const mongoBr = require('./../models/bibliographicResource.js');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;
const status = require('./../schema/enum.json').status;
const mongoose = require('mongoose');
const extend = require('extend');

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

function update(req, res){
    var response = res;
    var id = req.swagger.params.id.value;
    var update = req.swagger.params.bibliographicEntry.value;

    if(! mongoose.Types.ObjectId.isValid(id)){
        errorlog.error("Invalid value for parameter id.", {id : id});
        return response.status(400).json({"message":"Invalid parameter."});
    }

    mongoBr.findOne({ 'cites._id': id}, function (err, br) {
        if(err){
            errorlog.error(err);
            return res.status(500).json({"message":"DB query failed."});
        }
        if(!br){
            errorlog.error("No bibliographic entry found for id.", {id: id});
            return res.status(500).json({"message":"No bibliographic entry found for id."});
        }


        for(var be of br.cites){
            if(be._id.toString() === id){
                var index = br.cites.indexOf(be);
                console.log(be);
                extend(true, be, update);
                console.log(be);
                br.cites[index] = be;
                console.log(br);
                br.save().then(function(result){
                    for(var be of br.cites){
                        if(be._id.toString() === id){
                            return response.json(be);
                        }
                    }
                }, function(err){
                    return response.status(500).send(err);
                });
            }
        }
    });
}


function getInternalSuggestions(req, res){
    var response = res;
    var searchObject = req.swagger.params.bibliographicEntry.value;

    response.json([]);

}

function getExternalSuggestions(req, res){
    var response = res;
    var searchObject = req.swagger.params.bibliographicEntry.value;

    response.json([]);
}


module.exports = {
    getToDoBibliographicEntries : getToDoBibliographicEntries,
    update: update,
    getInternalSuggestions : getInternalSuggestions,
    getExternalSuggestions : getExternalSuggestions
};