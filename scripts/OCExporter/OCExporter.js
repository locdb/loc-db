"use strict";

const fs = require('fs');
const pth = require('path');
const async = require('async');
const fh = require('../../api/helpers/fileHelper.js').createFileHelper();

var OCExporter = function(){
}

OCExporter.prototype.result = {};


OCExporter.prototype.parseFile = function(path, callback) {
    console.log(pth.resolve());
    var brs = JSON.parse(fs.readFileSync(path));
    console.log(brs.length);
    callback(brs);
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