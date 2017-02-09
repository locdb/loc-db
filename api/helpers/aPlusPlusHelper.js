"use strict";

const sax = require('sax');
const fs = require('fs');
var result= {};

var APlusPlusHelper = function(){
}

APlusPlusHelper.prototype.sax = sax.createStream(true);

APlusPlusHelper.prototype.sax.currentTag = "";


APlusPlusHelper.prototype.sax.on("error", function (e) {
    // unhandled errors will throw, since this is a proper node 
    // event emitter. 
    console.error("error!", e)
    // clear the error 
    this._parser.error = null
    this._parser.resume()
});
  
  
APlusPlusHelper.prototype.sax.on("opentag", function (node) {
    // same object as above
    this.currentTag = node.name;
});


APlusPlusHelper.prototype.sax.on("closetag", function (node) {
    // same object as above
    this.currentTag = "";
});


APlusPlusHelper.prototype.sax.on("text", function (text) {
    var identifier = {};
    if(this.currentTag == "PublisherName"){
        result.publisher = text;
    }else if(this.currentTag == "ArticleTitle"){
        result.title = text;
    }else if(this.currentTag == "ArticleDOI"){
        identifier.scheme = "DOI";
        identifier.literalValue = text;
        result.identifiers.push(identifier);
    }else if(this.currentTag == "ArticleDOI"){

    }
});


APlusPlusHelper.prototype.parseFile = function(path, callback){
    // TODO: I need another model class..
    result.identifiers = [];
    result.contributors = [];
    // TODO: Is this always right?
    result.type = "Article";
    var stream = fs.createReadStream(path).pipe(this.sax);
    stream.on("end", function(){
        callback(result)
    });
};


/**
 * Factory function
 *
 * @returns {APlusPlusHelper}
*/
function createAPlusPlusHelper() {
    return new APlusPlusHelper();
}


module.exports = {
        createAPlusPlusHelper : createAPlusPlusHelper
};