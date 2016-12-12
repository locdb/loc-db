"use strict";
const config = require("./config.json");
const mongoose = require('mongoose');
const br = require('./../../api/models/bibliographicResource.js');
const dataBibliographicResource = require('./data/bibliographicResource');


var Setup = function(){};


Setup.prototype.loadBibliographicResources = function(){
    br.remove({}, function(err, res){
        if(err) console.log(err);
        for (var bibliographicResource of dataBibliographicResource){
            new br(bibliographicResource).save(function(err, res){
                if(err) console.log(err);
            });
        }
    });

};

Setup.prototype.dropDB = function(){
    br.remove({});
};


function createSetup(){
    return new Setup();
}


module.exports = {
        createSetup : createSetup
};
