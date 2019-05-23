"use strict";

const fs = require('fs');
const pth = require('path');
const async = require('async');

var OCExporter = function(){
}

OCExporter.prototype.result = {};


OCExporter.prototype.parseFile = function(path, callback){
    var brs = JSON.parse(fs.readFileSync(path));
    console.log(brs.length);
};




/**
 * Factory function
 *
 * @returns {OCExporter}
 */
function createOCExporter() {
    return new OCExporter();
}


module.exports = {
    createOCExporter : createOCExporter
};