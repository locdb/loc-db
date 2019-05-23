"use strict";

const fs = require('fs');
const pth = require('path');
const async = require('async');
const fh = require('../../api/helpers/fileHelper.js').createFileHelper();

var OCExporter = function(){
}

OCExporter.prototype.result = {};


OCExporter.prototype.parseFile = function(path, callback) {
    var brs = JSON.parse(fs.readFileSync(path));
    console.log(brs.length);

    var count = 0;
    var result = []
    for (var br of brs) {
        var oc = {}
        result.push(oc)
        count++;
        console.log(count + " " + JSON.stringify(oc));
        if (count > 10) {
            break;
        }
    }

    callback(result);
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