"use strict";
const request = require('ajax-request');
const config = require('./../../config/config.json');
const marc21Helper = require('./../helpers/marc21Helper.js').createMarc21Helper();
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

function createByPPN(req, res){
    // Get PPN param from request
    var ppn = req.swagger.params.ppn.value.trim();
    var response = res;
    if(typeof ppn == "undefined"){
        response.status(400).send('PPN undefined.');
    }else{
        var url = config.urls.swbUrl + '?query=pica.ppn+%3D+"' 
            + ppn 
            + '"&version=1.1&operation=searchRetrieve&recordSchema=marc21'
            + '&maximumRecords=1&startRecord=1&recordPacking=xml&sortKeys=none'
            +'&x-info-5-mg-requestGroupings=none';
        request({
            url: url,
            method: 'GET',
        }, function(err, res, body) {
              marc21Helper.parseBibliographicResource(body ,function(result){
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
              });
        });
    }
}

module.exports = {
        list : list,
        get : get,
        createByPPN: createByPPN
};