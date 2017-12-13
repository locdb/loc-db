'use strict';
const mongoBr = require('./../models/bibliographicResource.js');
const logger = require('./../util/logger.js');
const enums = require('./../schema/enum.json');
const bibliographicResource = require('./../schema/bibliographicResource');
const mongoose = require('mongoose');
const extend = require('extend');
const async = require('async');
const googleScholarHelper = require('./../helpers/googleScholarHelper.js').createGoogleScholarHelper();
const crossrefHelper = require('./../helpers/crossrefHelper.js').createCrossrefHelper();
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const stringSimilarity = require('string-similarity');


function getToDoBibliographicEntries(req, res) {
    var response = res;
    var scanId = req.swagger.params.scanId.value;

    if (scanId) {
        // check if id is valid
        if (!mongoose.Types.ObjectId.isValid(scanId)) {
            logger.error("Invalid value for parameter id.", {scanId: scanId});
            return response.status(400).json({"message": "Invalid parameter."});
        }
        mongoBr.find({'parts.status': enums.status.ocrProcessed, 'parts.scanId': scanId}, function (err, brs) {
            if (err) {
                logger.error(err);
                return res.status(500).json({"message": "DB query failed."});
            }
            response.json(createBibliographicEntriesArray(brs, scanId));
        });
    } else {
        mongoBr.find({'parts.status': enums.status.ocrProcessed}, function (err, brs) {
            if (err) {
                logger.error(err);
                return res.status(500).json({"message": "DB query failed."});
            }
            response.json(createBibliographicEntriesArray(brs, scanId));
        });
    }
}


function createBibliographicEntriesArray(brs, scanId) {
    // Loop over BEs and take only the scans that are really OCR processed
    if (brs.length > 0) {
        var result = [];
        for (var br of brs) {
            for (var be of br.parts) {
                if (be.scanId === scanId) {
                    result.push(be);
                }
            }
        }
        return result;
    } else {
        return [];
    }
}

function update(req, res) {
    var response = res;
    var id = req.swagger.params.id.value;
    var update = req.swagger.params.bibliographicEntry.value;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.error("Invalid value for parameter id.", {id: id});
        return response.status(400).json({"message": "Invalid parameter."});
    }

    mongoBr.findOne({'parts._id': id}, function (err, br) {
        if (err) {
            logger.error(err);
            return res.status(500).json({"message": "DB query failed."});
        }
        if (!br) {
            logger.error("No bibliographic entry found for id.", {id: id});
            return res.status(400).json({"message": "No bibliographic entry found for id."});
        }


        for (var be of br.parts) {
            if (be._id.toString() === id) {
                var index = br.parts.indexOf(be);
                //extend(true, be, update);

                //be._id = id;
                update._id = be._id;
                br.parts[index] = update;
                return br.save().then(function (result) {
                    for (var be of br.parts) {
                        if (be._id.toString() === id) {
                            return response.json(be);
                        }
                    }
                }, function (err) {
                    return response.status(500).send(err);
                });
            }
        }
    });
}


function remove(req, res) {
    var response = res;
    var id = req.swagger.params.id.value;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.error("Invalid value for parameter id.", {id: id});
        return response.status(400).json({"message": "Invalid parameter."});
    }

    mongoBr.findOne({'parts._id': id}, function (err, br) {
        if (err) {
            logger.error(err);
            return res.status(500).json({"message": "DB query failed."});
        }
        if (!br) {
            logger.error("No bibliographic entry found for id.", {id: id});
            return res.status(400).json({"message": "No bibliographic entry found for id."});
        }

        for (var be of br.parts) {
            if (be._id.toString() === id) {
                var index = br.parts.indexOf(be);
                br.parts.splice(index, 1);
                br.save().then(function (result) {
                    return response.json(result);
                }, function (err) {
                    logger.error(err);
                    return response.status(500).json(err);
                });
            }
        }
    });
}


function getInternalSuggestionsByQueryString(req, res) {
    var response = res;
    var query = decodeURI(decodeURI(query));
    var query = req.swagger.params.query.value;
    var threshold = req.swagger.params.threshold.value;
    if(!threshold){
        threshold = 1.0;
    }

    // the search function offers an interface to elastic
    try{
        mongoBr.search({
            multi_match: {
                query: query,
                fields: [
                    "title",
                    "subtitle",
                    "contributors.heldBy.nameString",
                    "contributors.heldBy.givenName",
                    "contributors.heldBy.familyName"
                ]
            }
        }, {hydrate: true, hydrateWithESResults: true}, function (err, brs) {
            var result = [];
            if (err) {
                logger.error(err);
                return res.status(500).json(err);
            }
            if (brs.hits && brs.hits.hits) {
                for (var i in brs.hits.hits) {
                    var br = brs.hits.hits[i];

                    // we check, whether the result is good enough
                    if(br._esResult._score > threshold){
                        result.push(br.toObject());
                    }
                }
            }
            return response.status(200).json(result);
        });
    }catch (err) {
        logger.error(err);
        return response.json("Something went wrong with the internal suggestions");
    }
}

function getExternalSuggestions(req, res) {
    var response = res;
    var searchObject = req.swagger.params.bibliographicEntry.value;
    var title = searchObject.ocrData.title;

    async.parallel([
            function (callback) {
                swbHelper.queryByTitle(title, function (err, res) {
                    if (err) {
                        return callback(err, null);
                    }
                    return callback(null, res);
                });
            },
            function (callback) {
                googleScholarHelper.query(title, function (err, res) {
                    if (err) {
                        return callback(err, null);
                    }
                    return callback(null, res);
                });
            },
            function (callback) {
                crossrefHelper.query(title, function (err, res) {
                    if (err) {
                        return callback(err, null);
                    }
                    return callback(null, res);
                });
            }
        ],
        function (err, res) {
            if (err) {
                logger.error(err);
                return response.status(500).json(err);
            }
            var result = [];
            for(var sourceResults of res){
                if (sourceResults.length > 0) {
                    for (var br of sourceResults) {
                        if (Object.keys(br).length !== 0) { //&& natural.LevenshteinDistance(be.title, title) <= 10) {
                            result.push(br);
                        }
                    }
                }
            }
            return response.json(result);
        }
    );
}


function getExternalSuggestionsByQueryString(req, res) {
    var response = res;
    var query = req.swagger.params.query.value;
    query = decodeURI(decodeURI(query));
    var threshold = req.swagger.params.threshold.value;
    if(!threshold){
        threshold = 0.45;
    }

    async.parallel([
            function (callback) {
                swbHelper.queryByQueryString(query, function (err, res) {
                    if (err) {
                        return callback(err, null);
                    }
                    return callback(null, res);
                });
            },
            /*function (callback) {
                googleScholarHelper.query(query, function (err, res) {
                    if (err) {
                        return callback(err, null);
                    }
                    return callback(null, res);
                });
            },*/
            function (callback) {
                crossrefHelper.query(query, function (err, res) {
                    if (err) {
                        return callback(err, null);
                    }
                    return callback(null, res);
                });
            }
        ],
        function (err, res) {
            if (err) {
                logger.error(err);
                return response.status(500).json(err);
            }
            var result = [];
            for(var sourceResults of res){
                if (sourceResults.length > 0) {
                    for (var br of sourceResults) {
                        if (Object.keys(br).length !== 0 && stringSimilarity.compareTwoStrings(br.title + br.subtitle + br.contributors, query) >= threshold) {
                            result.push(br);
                        }
                    }
                }
            }
            return response.json(result);
        }
    );
}

function addTargetBibliographicResource(req, res) {
    var response = res;
    var bibliographicEntryId = req.swagger.params.bibliographicEntryId.value;
    var bibliographicResourceId = req.swagger.params.bibliographicResourceId.value;

    // first check whether we received valid mongo ids
    if (!mongoose.Types.ObjectId.isValid(bibliographicEntryId) || !mongoose.Types.ObjectId.isValid(bibliographicResourceId)) {
        logger.error("Invalid value for parameter id.", {
            bibliographicEntryId: bibliographicEntryId,
            bibliographicResourceId: bibliographicResourceId
        });
        return response.status(400).json({"message": "Invalid parameter."});
    }


    // check whether the target br exists.. just to be sure
    mongoBr.findById(bibliographicResourceId, function (err, br) {
        if(!br){
            logger.error("The target bibliographic resource cannot be found.");
            return response.status(400).json("The target bibliographic resource cannot be found.");
        }

        // load the source br which also contains the source be
        mongoBr.findOne({'parts._id': bibliographicEntryId}, function (err, br) {
            if (err){
                logger.error(err);
                return response.status(500).json(err);
            }
            // check also whether the resource id belongs to the source resource, we do not want circles
            if(br._id == bibliographicResourceId){
                logger.error("The target and source bibliographic resource are identical.");
                return response.status(400).json("The target and source bibliographic resource are identical.");
            }
            // project to corresponding be and
            // 1. update status
            // 2. update references prop
            for(var be of br.parts){
                if(be._id == bibliographicEntryId){
                    // but update only if references is still empty
                    if(!be.references || be.references == ""){
                        be.references = bibliographicResourceId;
                        be.status = enums.status.valid;
                        break;
                    }else{
                        // entry is apparently already linked
                        logger.error("The entry is already linked.");
                        return response.status(400).json("The entry is already linked.");
                    }
                }
            }
            // 3. update cites prop
            br.cites.push(bibliographicResourceId);

            // save the updated br in the db
            br.save(function (err, br) {
                if (err){
                    logger.error(err);
                    return response.status(500).json(err);
                }
                response.status(200).json(br);
            });
        });
    });
}

function removeTargetBibliographicResource(req, res) {
    var response = res;
    var bibliographicEntryId = req.swagger.params.bibliographicEntryId.value;

    // first check whether we received valid mongo ids
    if (!mongoose.Types.ObjectId.isValid(bibliographicEntryId)) {
        logger.error("Invalid value for parameter id.", {
            bibliographicEntryId: bibliographicEntryId
        });
        return response.status(400).json({"message": "Invalid parameter."});
    }

    // load the source br which also contains the source be
    mongoBr.findOne({'parts._id': bibliographicEntryId}, function (err, br) {
        if (err) {
            logger.error(err);
            return response.status(500).json(err);
        }

        // project to corresponding be and
        // 1. update status
        // 2. clear references prop
        var idTarget = "";
        for (var be of br.parts) {
            if (be._id == bibliographicEntryId) {
                idTarget = be.references;
                be.references = "";
                be.status = enums.status.ocrProcessed; // Is that correct?
                break;
            }
        }
        // 3. update cites prop
        if(idTarget != ""){
            var index = br.cites.indexOf(idTarget);
            if (index > -1) {
                br.cites.splice(index, 1);
            }
        }

        // save the updated br in the db
        br.save(function (err, br) {
            if (err) {
                logger.error(err);
                return response.status(500).json(err);
            }
            response.status(200).json(br);
        });
    });

}

module.exports = {
    getToDoBibliographicEntries: getToDoBibliographicEntries,
    update: update,
    remove: remove,
    getExternalSuggestions: getExternalSuggestions,
    addTargetBibliographicResource: addTargetBibliographicResource,
    removeTargetBibliographicResource : removeTargetBibliographicResource,
    getInternalSuggestionsByQueryString : getInternalSuggestionsByQueryString,
    getExternalSuggestionsByQueryString : getExternalSuggestionsByQueryString
};