"use strict";

const xpath = require('xpath');
const dom = require('xmldom').DOMParser;
const fs = require('fs');

var APlusPlusHelper = function(){
}

APlusPlusHelper.prototype.result = {};

APlusPlusHelper.prototype.parseFile = function(path, callback){
    var self = this;

    fs.readFile(path, "utf-8", function(err, xmlString){
        if (err) {
            return console.log(err);
        }
        // TODO: I need another model class..
        self.result.identifiers = [];
        self.result.contributors = [];
        self.result.embodiedAs = [];
        // TODO: Is this always right?
        self.result.type = "Article";

        var doc = new dom().parseFromString(xmlString);
        
        // IDENTIFIERS
        var identifier = {}
        identifier.scheme = "DOI";
        identifier.literalValue = xpath.select("//ArticleDOI/text()", doc)[0].data;
        self.result.identifiers.push(identifier);
        
        // TITLE
        self.result.title = xpath.select("//ArticleTitle/text()", doc)[0].data;
        
        // PUBLICATIONYEAR
        self.result.title = xpath.select("//ArticleHistory/OnlineDate/Year/text()", doc)[0].data;
        
        // CONTRIBUTORS
        var publisher = {};
        publisher.roleType = "Publisher";
        publisher.heldBy = {};
        publisher.heldBy.nameString = xpath.select("//PublisherName/text()", doc)[0].data;
        self.result.contributors.push(publisher);

        for(var authorNode of xpath.select("//AuthorGroup/Author/*", doc)){
            var author = {};
            author.roleType = "Author";
            author.heldBy = {};
            author.heldBy.firstName = "";
            author.heldBy.lastName = "";
            if(authorNode.nodeName == "AuthorName"){
                for(var i=0; i < authorNode.childNodes.length; i++){
                    var nameNode = authorNode.childNodes[i];
                    if(nameNode.nodeName == "GivenName"){
                        author.heldBy.firstName = nameNode.childNodes[0].data;
                    }else if(nameNode.nodeName == "FamilyName"){
                        author.heldBy.lastName = nameNode.childNodes[0].data;
                    }
                }
                self.result.contributors.push(author);
            }
        }
        
        // EMBODIMENT
        
        callback(self.result);
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