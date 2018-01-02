"use strict";
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const br = require('./../models/bibliographicResource.js');
const logger = require('./../util/logger');
const _ = require('lodash');
const mongoose = require('mongoose');
const crossrefHelper = require('./../helpers/crossrefHelper.js').createCrossrefHelper();
const enums = require('./../schema/enum.json');
const Identifier = require('./../schema/identifier');


function list(req, res){
    br.find({},{},function(err,docs){
        if(err){
            logger.error(err);
            return res.status(500).json(err);
        }
        return res.status(200).json(docs);
    }); 
}

function save(req, res){
    var bibliographicResource = req.swagger.params.bibliographicResource.value;
    // check if an _id is given
    if(bibliographicResource._id){
        logger.error("The br already exists (field _id is given).");
        return res.status(400).json("The br already exists (field _id is given, use put endpoint).");
    }else{
        // check if there is already an identical entry in the db
        var query = {};
        for(var key in bibliographicResource) {
            if(!Array.isArray(bibliographicResource[key]) && typeof bibliographicResource[key] !== 'object'){
                query[key] = bibliographicResource[key];
            }
        }
        br.find(query, function(err, docs){
            if(err){
                logger.error(err);
                return res.status(500).json(err);
            }else if(docs && docs.length > 0){
                for(var doc of docs){
                    if(_.isMatch(doc, bibliographicResource)){
                        logger.error("The br already exists (entry with exactly the same fields is in the database).");
                        return res.status(400).json({error: "The br already exists (entry with exactly the same fields is in the database, use put endpoint)."});
                    }
                }
            }else{
                // if not create a new entry for the br
                br.create(bibliographicResource, function(err,doc){
                    if(err){
                        logger.error(err);
                        return res.status(500).json(err);
                    }
                    return res.status(200).json(doc);
                });
            }
        })
    }
}


function update(req, res){
    var id = req.swagger.params.id.value;
    var bibliographicResource = req.swagger.params.bibliographicResource.value;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.error("Invalid value for parameter id.", {id: id});
        return res.status(400).json({"message": "Invalid parameter id."});
    }
    br.findById(id, function (err, doc) {
        if (err){
            logger.error(err);
            return res.status(500).json(err);
        }

        _.assign(doc, bibliographicResource);

        doc.save(function (err, doc) {
            if (err){
                logger.error(err);
                return res.status(500).json(err);
            }
            res.status(200).json(doc);
        });
    });
}


function get(req, res){
    var id = req.swagger.params.id.value.trim();
    br.findOne({_id: id},{},function(e,docs){
        res.json(docs);
    }); 
}


function deleteAll(req, res){
    var response = res;
    return br.remove({}, function(err, res){
        if(err){
            logger.error(err);
            return response.status(500).json({"message":'Delete operation failed.'});
        }
        return br.esTruncate(function(err){
            if(err){
                logger.error(err);
                return response.status(500).json({"message":'Delete operation failed.'});
            }
            return response.status(200).send({"message":'Delete operation succeeded.'});
        });
    });
}


function deleteSingle(req, res){
    var id = req.swagger.params.id.value.trim();
    var response = res;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.error("Invalid value for parameter id.", {
            id: id
        });
        return response.status(400).json({"message": "Invalid parameter id."});
    }

    // we should first have a handle to the instance itself, because then elastic will update the removal automatically
    br.findOne({_id: id}, function(err, doc){
        if(err){
            logger.error(err);
            return response.status(500).json(err);
        }
        if(!doc){
            logger.error("Document could not be found. ", {_id: id});
            return response.status(400).json({"message" : "Document could not be found."});
        }
        return doc.remove(function(err){
            if(err){
                logger.error(err);
                return response.status(500).json(err);
            }
            return response.status(200).send({"message":'Delete operation succeeded.'});
        });
    });
}


function createByPPN(req, res){
    // Get PPN param from request
    var ppn = req.swagger.params.ppn.value;
    var resourceType = req.swagger.params.resourceType.value;
    var response = res;
    if(typeof ppn == "undefined"){
        response.status(400).send('PPN undefined.');
    }else{
        // Call Swb Helper
        swbHelper.query(ppn, resourceType, function(err, result){
            if(err){
                logger.error(err);
                return response.status(500).json(err);
            }
            if(result.length == 0){
                response.status(400).send('No entry found.');
                return;
            }
            br.findOne({title: result.title}).then((doc) => {
                if(doc  != null){
                    response.json(doc);
                    return;
                }else{
                    new br(result).save().then(function(result){
                        response.json(result);
                    }, function(err){
                        response.status(400).send(err);
                    });
                }
            });
        })
    }
}


// TODO: DELETE THIS! We just want to have it to check for the logic
function saveElectronicJournal(req, res) {
    var doi = req.swagger.params.doi.value;
    var ppn = req.swagger.params.ppn.value;
    var response = res;

    if(doi && !ppn) {
        crossrefHelper.queryByDOI(doi, function (err, result) {
            if (err) {
                logger.error(err);
                return response.status(500).json(err);
            } else {
                if (!result) {
                    logger.error("No entry found in crossref for doi", {"doi": doi});
                    return response.status(400).json("No entry found in crossref for doi.");
                } else {
                    var resource = new br(result[0]);
                    resource.type = enums.resourceType.journal;
                    resource.status = enums.status.external;
                    // we should try to find the parent resource in our system
                    // therefore we have to extract the issns if available
                    var issns = [];
                    for (var id of resource.identifiers) {
                        if (id.scheme == enums.identifier.issn) {
                            issns.push(id.literalValue);
                        }
                    }
                    // this is a precondition for finding or creating the parent resource.
                    // If we do not have the information, just save and return the article
                    if (issns.length > 0 && result[1]) {
                        br.find({'title': result[1]}, function (err, parents) {
                            if (err) {
                                logger.error(err);
                                return response.status(500).json(err);
                            }
                            if (parents.length > 0) {
                                // parent candidates exists
                                // check now for the issn if it exists in the article metadata
                                for (var parent of parents) {
                                    // check if it really seems to be a parent
                                    if (!parent.partOf || parent.partOf == "") {
                                        for (var identifier of parent.identifiers) {
                                            if (identifier.scheme == enums.identifier.issn && issns.indexOf(identifier.literalValue) > -1) {
                                                // we have a match
                                                // now we have to add the article to the parent journal by adding the property value accordingly
                                                resource.partOf = parent._id;

                                                // We save the resource and return it
                                                return resource.save(function (err, resource) {
                                                    if (err) {
                                                        logger.error(err);
                                                        return response.status(500).json(err);
                                                    } else {
                                                        var result = [];
                                                        result.push(parent);
                                                        result.push(resource);
                                                        return response.status(200).json(result);
                                                    }
                                                });

                                            }
                                        }
                                    }
                                }
                            }
                            // TODO: if no match was found, create new parent
                            if (!resource.partOf || resource.partOf == "") {

                                var parent = new br();
                                parent.title = result[1];
                                parent.identifiers = [];
                                parent.type = enums.resourceType.journal;
                                for (var issn of issns) {
                                    parent.identifiers.push(new Identifier({
                                        scheme: enums.identifier.issn,
                                        literalValue: issn
                                    }));
                                }
                                parent.save(function (err, parent) {
                                    if (err) {
                                        logger.error(err);
                                        return response.status(500).json(err);
                                    }
                                    resource.partOf = parent._id;
                                    resource.save(function (err, resource) {
                                        if (err) {
                                            logger.error(err);
                                            return response.status(500).json(err);
                                        } else {
                                            var result = [];
                                            result.push(parent);
                                            result.push(resource);
                                            return response.status(200).json(result);
                                        }
                                    });
                                });
                            }
                        });
                    } else {
                        // If we do not have the information, just save and return the article
                        resource.save(function (err, result) {
                            if (err) {
                                logger.error(err);
                                return response.status(500).json(err);
                            } else {
                                return response.status(200).json(result);
                            }
                        });
                    }
                }
            }
        });
    }else if (ppn && !doi){
        // TODO: Query OLCSSG
        swbHelper.queryOLC(ppn, function (err, result) {
            if (err) {
                logger.error(err);
                return response.status(500).json(err);
            } else {
                if (!result || result.length == 0) {
                    logger.error("No entry found in olc for ppn", {"ppn": ppn});
                    return response.status(400).json("No entry found in olc for ppn.");
                } else {
                    var resource = new br(result);
                    resource.type = enums.resourceType.journal;
                    resource.status = enums.status.external;
                    resource.identifiers.push({'scheme': enums.identifier.ppn, 'literalValue': ppn});
                    // we should try to find the parent resource in our system
                    // therefore we have to extract the issns if available
                    var issns = [];
                    var dois = [];
                    for (var id of resource.identifiers) {
                        if (id.scheme == enums.identifier.issn) {
                            issns.push(id.literalValue);
                        }else if(id.scheme == enums.identifier.doi) {
                            dois.push(id.literalValue);
                        }
                    }

                    // TODO: Try to find references for the article via Crossref and DOI
                    if(dois.length > 0 ){
                        crossrefHelper.queryReferences(dois[0], null, function(err, res){
                            if(err){
                                logger.error(err);
                                return response.status(500).json("Something went wrong with retrieving references");
                            }
                            resource.parts = res[0].parts;

                            // this is a precondition for finding or creating the parent resource.
                            // If we do not have the information, just save and return the article
                            if (issns.length > 0) {
                                br.find({'identifiers.literalValue': issns[0]}, function (err, parents) {
                                    if (err) {
                                        logger.error(err);
                                        return response.status(500).json(err);
                                    }
                                    if (parents.length > 0) {
                                        for (var parent of parents){
                                            if (!parent.partOf || parent.partOf == "") {
                                                // we have a match
                                                // now we have to add the article to the parent journal by adding the property value accordingly
                                                resource.partOf = parent._id;

                                                // We save the resource and return it
                                                return resource.save(function (err, resource) {
                                                    if (err) {
                                                        logger.error(err);
                                                        return response.status(500).json(err);
                                                    } else {
                                                        var result = [];
                                                        result.push(parent);
                                                        result.push(resource);
                                                        return response.status(200).json(result);
                                                    }
                                                });
                                            }

                                        }

                                    }
                                    if (!resource.partOf || resource.partOf == "") {

                                        var parent = new br();
                                        parent.identifiers = [];
                                        parent.type = enums.resourceType.journal;
                                        for (var issn of issns) {
                                            parent.identifiers.push(new Identifier({
                                                scheme: enums.identifier.issn,
                                                literalValue: issn
                                            }));
                                        }
                                        return parent.save(function (err, parent) {
                                            if (err) {
                                                logger.error(err);
                                                return response.status(500).json(err);
                                            }
                                            resource.partOf = parent._id;
                                            return resource.save(function (err, resource) {
                                                if (err) {
                                                    logger.error(err);
                                                    return response.status(500).json(err);
                                                } else {
                                                    var result = [];
                                                    result.push(parent);
                                                    result.push(resource);
                                                    return response.status(200).json(result);
                                                }
                                            });
                                        });
                                    }
                                });
                            } else {
                                // If we do not have the information, just save and return the article
                                return resource.save(function (err, result) {
                                    if (err) {
                                        logger.error(err);
                                        return response.status(500).json(err);
                                    } else {
                                        return response.status(200).json(result);
                                    }
                                });
                            }

                        });
                    }else{
                        // this is a precondition for finding or creating the parent resource.
                        // If we do not have the information, just save and return the article
                        if (issns.length > 0) {
                            br.find({'identifiers.literalValue': issns[0]}, function (err, parents) {
                                if (err) {
                                    logger.error(err);
                                    return response.status(500).json(err);
                                }
                                if (parents.length > 0) {
                                    for (var parent of parents){
                                        if (!parent.partOf || parent.partOf == "") {
                                            // we have a match
                                            // now we have to add the article to the parent journal by adding the property value accordingly
                                            resource.partOf = parent._id;

                                            // We save the resource and return it
                                            return resource.save(function (err, resource) {
                                                if (err) {
                                                    logger.error(err);
                                                    return response.status(500).json(err);
                                                } else {
                                                    var result = [];
                                                    result.push(parent);
                                                    result.push(resource);
                                                    return response.status(200).json(result);
                                                }
                                            });
                                        }

                                    }

                                }
                                if (!resource.partOf || resource.partOf == "") {

                                    var parent = new br();
                                    parent.identifiers = [];
                                    parent.type = enums.resourceType.journal;
                                    for (var issn of issns) {
                                        parent.identifiers.push(new Identifier({
                                            scheme: enums.identifier.issn,
                                            literalValue: issn
                                        }));
                                    }
                                    return parent.save(function (err, parent) {
                                        if (err) {
                                            logger.error(err);
                                            return response.status(500).json(err);
                                        }
                                        resource.partOf = parent._id;
                                        return resource.save(function (err, resource) {
                                            if (err) {
                                                logger.error(err);
                                                return response.status(500).json(err);
                                            } else {
                                                var result = [];
                                                result.push(parent);
                                                result.push(resource);
                                                return response.status(200).json(result);
                                            }
                                        });
                                    });
                                }
                            });
                        } else {
                            // If we do not have the information, just save and return the article
                            return resource.save(function (err, result) {
                                if (err) {
                                    logger.error(err);
                                    return response.status(500).json(err);
                                } else {
                                    return response.status(200).json(result);
                                }
                            });
                        }
                    }
                }
            }
        });
    }else{
        return response.status(400).json("Please enter identifiers correctly.");
    }
}


module.exports = {
        list : list,
        get : get,
        deleteAll : deleteAll,
        deleteSingle : deleteSingle,
        createByPPN: createByPPN,
        save: save,
        update: update,
        //getCrossrefReferences: getCrossrefReferences,
        //getPublisherUrl: getPublisherUrl,
        saveElectronicJournal: saveElectronicJournal
};