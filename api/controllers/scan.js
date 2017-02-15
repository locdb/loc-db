"use strict";
const request = require('ajax-request');
const config = require('./../../config/config.json');
const marc21Helper = require('./../helpers/marc21Helper.js').createMarc21Helper();
const br = require('./../models/bibliographicResource.js');
const fs = require('fs');

//TODO: Should I add this to bibliographicResource.js?
function saveScan(req, res){
    // Get PPN param from request
    var file = req.swagger.params.image.value;
    console.log(file);
    fs.writeFile(config.upload.imagePath + file.originalname, file.buffer, 'binary', function(err){
        if(err){
            console.log(err);
            return;
        }
        res.json("TEST");
    });
    
}

module.exports = {
        saveScan : saveScan
};