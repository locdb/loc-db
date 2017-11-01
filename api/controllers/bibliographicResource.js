"use strict";
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const br = require('./../models/bibliographicResource.js');
const errorlog = require('./../util/logger').errorlog;
const _ = require('lodash');
const mongoose = require('mongoose');
const crossrefHelper = require('./../helpers/crossrefHelper.js').createCrossrefHelper();
const enums = require('./../schema/enum.json');
const Identifier = require('./../schema/identifier');


function list(req, res){
    br.find({},{},function(err,docs){
        if(err){
            errorlog.error(err);
            return res.status(500).json(err);
        }
        return res.status(200).json(docs);
    }); 
}

function save(req, res){
    var bibliographicResource = req.swagger.params.bibliographicResource.value;
    // check if an _id is given
    if(bibliographicResource._id){
        errorlog.error("The br already exists (field _id is given).");
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
                errorlog.error(err);
                return res.status(500).json(err);
            }else if(docs && docs.length > 0){
                for(var doc of docs){
                    if(_.isMatch(doc, bibliographicResource)){
                        errorlog.error("The br already exists (entry with exactly the same fields is in the database).");
                        return res.status(400).json({error: "The br already exists (entry with exactly the same fields is in the database, use put endpoint)."});
                    }
                }
            }else{
                // if not create a new entry for the br
                br.create(bibliographicResource, function(err,doc){
                    if(err){
                        errorlog.error(err);
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
        errorlog.error("Invalid value for parameter id.", {id: id});
        return res.status(400).json({"message": "Invalid parameter id."});
    }
    br.findById(id, function (err, doc) {
        if (err){
            errorlog.error(err);
            return res.status(500).json(err);
        }

        _.assign(doc, bibliographicResource);

        doc.save(function (err, doc) {
            if (err){
                errorlog.error(err);
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
    br.remove({}, function(err, res){
        err ? response.status(400).json({"message":'Delete operation failed.'}) : response.status(200).send({"message":'Delete operation succeeded.'});
    });
}


function deleteSingle(req, res){
    var id = req.swagger.params.id.value.trim();
    var response = res;
    br.remove({_id: id},function(err,res){
        err ? response.status(400).json({"message":'Delete operation failed.'}) : response.status(200).send({"message":'Delete operation succeeded.'});
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
                errorlog.error(err);
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


function getCrossrefReferences(req, res){
    var br = req.swagger.params.bibliographicResource.value;
    var response = res;
    // first check whether it has a doi, because then it is way easier to retrieve the data
    var doi = null;
    var query = null;
    for(var identifier of br.identifiers){
        if(identifier.scheme == enums.identifier.doi){
            doi = identifier.literalValue;
            break;
        }
    }
    // if there is no doi given, we prepare a query string
    if(!doi){
        // TODO: Improve query?
        query = br.title + " " + br.subtitle;
    }
    crossrefHelper.queryReferences(doi, query, function(err,res){
        if(err){
            errorlog.error(err);
            return response.status(500).json(err);
        }
        response.json(res);
    });
}


function getPublisherUrl(req, res){
    var ppn = req.swagger.params.ppn.value;
    var resourceType = req.swagger.params.resourceType.value;
    var response = res;

    swbHelper.query(ppn, resourceType, function(err, result) {
        if (err) {
            errorlog.error(err);
            return response.status(500).json(err);
        }else{
            for (var identifier of result.identifiers){
                // TODO: Shall we save the resource? Shall we return the whole resource?
                if(identifier.scheme === "URI"){
                    return response.status(200).json(identifier);
                }
            }
            return response.status(200).json({message: "No URI found."});
        }
    });
}


function saveElectronicJournal(req, res) {
    var doi = req.swagger.params.doi.value;
    var ppn = req.swagger.params.ppn.value;
    var response = res;

    if(doi && !ppn) {
        crossrefHelper.queryByDOI(doi, function (err, result) {
            if (err) {
                errorlog.error(err);
                return response.status(500).json(err);
            } else {
                if (!result) {
                    errorlog.error("No entry found in crossref for doi", {"doi": doi});
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
                                errorlog.error(err);
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
                                                        errorlog.error(err);
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
                                        errorlog.error(err);
                                        return response.status(500).json(err);
                                    }
                                    resource.partOf = parent._id;
                                    resource.save(function (err, resource) {
                                        if (err) {
                                            errorlog.error(err);
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
                                errorlog.error(err);
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
                errorlog.error(err);
                return response.status(500).json(err);
            } else {
                if (!result || result.length == 0) {
                    errorlog.error("No entry found in olc for ppn", {"ppn": ppn});
                    return response.status(400).json("No entry found in olc for ppn.");
                } else {
                    var resource = new br(result);
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
                    if (issns.length > 0) {
                        br.find({'identifiers.literalValue': issns[0]}, function (err, parents) {
                            if (err) {
                                errorlog.error(err);
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
                                                errorlog.error(err);
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
                                        errorlog.error(err);
                                        return response.status(500).json(err);
                                    }
                                    resource.partOf = parent._id;
                                    return resource.save(function (err, resource) {
                                        if (err) {
                                            errorlog.error(err);
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
                                errorlog.error(err);
                                return response.status(500).json(err);
                            } else {
                                return response.status(200).json(result);
                            }
                        });
                    }
                }
            }
        });
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
        getCrossrefReferences: getCrossrefReferences,
        getPublisherUrl: getPublisherUrl,
        saveElectronicJournal: saveElectronicJournal
};