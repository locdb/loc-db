'use strict';
const mongoBr = require('./../models/bibliographicResource.js');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;
const enums = require('./../schema/enum.json');
const bibliographicResource = require('./../schema/bibliographicResource');
const mongoose = require('mongoose');
const extend = require('extend');
const async = require('async');
const googleScholarHelper = require('./../helpers/googleScholarHelper.js').createGoogleScholarHelper();
const crossrefHelper = require('./../helpers/crossrefHelper.js').createCrossrefHelper();
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
//const natural = require('natural');
var ObjectId = require('mongoose').Types.ObjectId;


function getToDoBibliographicEntries(req, res) {
    var response = res;
    var scanId = req.swagger.params.scanId.value;

    if (scanId) {
        // check if id is valid
        if (!mongoose.Types.ObjectId.isValid(scanId)) {
            errorlog.error("Invalid value for parameter id.", {scanId: scanId});
            return response.status(400).json({"message": "Invalid parameter."});
        }
        mongoBr.find({'parts.status': enums.status.ocrProcessed, 'parts.scanId': scanId}, function (err, brs) {
            if (err) {
                errorlog.error(err);
                return res.status(500).json({"message": "DB query failed."});
            }
            response.json(createBibliographicEntriesArray(brs));
        });
    } else {
        mongoBr.find({'parts.status': enums.status.ocrProcessed}, function (err, brs) {
            if (err) {
                errorlog.error(err);
                return res.status(500).json({"message": "DB query failed."});
            }
            response.json(createBibliographicEntriesArray(brs));
        });
    }
}


function createBibliographicEntriesArray(brs) {
    // Loop over BEs and take only the scans that are really OCR processed
    if (brs.length > 0) {
        var result = [];
        for (var br of brs) {
            for (var be of br.parts) {
                if (be.status === enums.status.ocrProcessed) {
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
        errorlog.error("Invalid value for parameter id.", {id: id});
        return response.status(400).json({"message": "Invalid parameter."});
    }

    mongoBr.findOne({'parts._id': id}, function (err, br) {
        if (err) {
            errorlog.error(err);
            return res.status(500).json({"message": "DB query failed."});
        }
        if (!br) {
            errorlog.error("No bibliographic entry found for id.", {id: id});
            return res.status(500).json({"message": "No bibliographic entry found for id."});
        }


        for (var be of br.parts) {
            if (be._id.toString() === id) {
                var index = br.parts.indexOf(be);
                extend(true, be, update);
                br.parts[index] = be;
                br.save().then(function (result) {
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


function getInternalSuggestions(req, res) {
    var response = res;
    var title = req.swagger.params.bibliographicEntry.value.ocrData.title.replace(/:/g, ' ');
    var authors = req.swagger.params.bibliographicEntry.value.ocrData.authors
    authors = authors.join(' ').replace(/:/g, ' ');
    var bibliographicEntryText = req.swagger.params.bibliographicEntry.value.bibliographicEntryText.replace(/:/g, ' ')

    // the search function offers an interface to elastic
    mongoBr.search({
        multi_match: {
            query: title + " " + authors + " " + bibliographicEntryText,
            fields: [
                "title",
                "subtitle",
                "contributors.heldBy.nameString",
                "contributors.heldBy.givenName",
                "contributors.heldBy.familyName"
            ]
        }
    }, {hydrate: true}, function (err, brs) {
        var result = [];
        if (err) {
            errorlog.error(err);
            return res.status(500).json(err);
        }
        if (brs.hits && brs.hits.hits) {
            for (var i in brs.hits.hits) {
                var br = brs.hits.hits[i];
                // return only the top 5 result
                // but only if they do not only exist in elastic but also in mongo
                if (br && result.length <= 5) {
                    result.push(br.toObject());
                }
            }
        }
        return response.status(200).json(result);
    });
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
                errorlog.error(err);
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


function addTargetBibliographicResource(req, res) {
    var response = res;
    var bibliographicEntryId = req.swagger.params.bibliographicEntryId.value;
    var bibliographicResourceId = req.swagger.params.bibliographicResourceId.value;

    // first check whether we received valid mongo ids
    if (!mongoose.Types.ObjectId.isValid(bibliographicEntryId) || !mongoose.Types.ObjectId.isValid(bibliographicResourceId)) {
        errorlog.error("Invalid value for parameter id.", {
            bibliographicEntryId: bibliographicEntryId,
            bibliographicResourceId: bibliographicResourceId
        });
        return response.status(400).json({"message": "Invalid parameter."});
    }

    // check also whether the resource id belongs to the source resource, we do not want circles
    // and check whether the target br exists.. just to be sure

    // load the source br which also contains the source be
    mongoBr.findOne({'parts._id': bibliographicEntryId}, function (err, br) {
        if (err){
            errorlog.error(err);
            return response.status(500).json(err);
        }

        // project to corresponding be and
        // 1. update status
        // 2. update references prop
        for(var be of br.parts){
            if(be._id == bibliographicEntryId){
                be.references = bibliographicResourceId;
                be.status = enums.status.valid;
                break;
            }
        }
        // 3. update cites prop
        br.cites.push(bibliographicResourceId);

        // save the updated br in the db
        br.save(function (err, br) {
            if (err){
                errorlog.error(err);
                return response.status(500).json(err);
            }
            response.status(200).json(br);
        });
    });


}

module.exports = {
    getToDoBibliographicEntries: getToDoBibliographicEntries,
    update: update,
    getInternalSuggestions: getInternalSuggestions,
    getExternalSuggestions: getExternalSuggestions,
    addTargetBibliographicResource: addTargetBibliographicResource
};