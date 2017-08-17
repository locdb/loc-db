"use strict";
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const br = require('./../models/bibliographicResource.js');
const errorlog = require('./../util/logger').errorlog;
const _ = require('lodash');
const mongoose = require('mongoose');
const crossrefHelper = require('./../helpers/crossrefHelper.js').createCrossrefHelper();
const enums = require('./../schema/enum.json');


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
    var ppn = req.swagger.params.ppn.value.trim();
    var response = res;
    if(typeof ppn == "undefined"){
        response.status(400).send('PPN undefined.');
    }else{
        // Call Swb Helper
        swbHelper.query(ppn, function(err, result){
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

module.exports = {
        list : list,
        get : get,
        deleteAll : deleteAll,
        deleteSingle : deleteSingle,
        createByPPN: createByPPN,
        save: save,
        update: update,
        getCrossrefReferences: getCrossrefReferences
};