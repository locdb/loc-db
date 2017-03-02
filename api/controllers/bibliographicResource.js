"use strict";
const swbHelper = require('./../helpers/swbHelper.js').createSwbHelper();
const br = require('./../models/bibliographicResource.js');


function list(req, res){
    br.find({},{},function(e,docs){
        res.json(docs);
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
        swbHelper.query(ppn, function(result){
            if(result == null){
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

module.exports = {
        list : list,
        get : get,
        deleteAll : deleteAll,
        deleteSingle : deleteSingle,
        createByPPN: createByPPN
};