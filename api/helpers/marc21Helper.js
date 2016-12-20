"use strict";

const marc4js = require('marc4js');

var Marc21Helper = function(){
}


/**
 * Parses a given String in MARC21 format and returns a bibliographic resource
 * 
 * 
 */
Marc21Helper.prototype.parseBibliographicResource = function(xmlString, fnCallback){
    marc4js.parse(xmlString, {format: 'marcxml'}, function(err, records) {
        if(typeof records[1] == "undefined"){
            fnCallback(null);
            return;
        }
        
        var dataFields = records[1]._dataFields;
        var cleanedObject = {};
        cleanedObject.keywords = [];

        for(var field in dataFields){
            //title statement MARC21 245
            if(dataFields[field]._tag == "245"){
                for(var subfield in dataFields[field]._subfields){
                    //title MARC21 245 $a
                    if(dataFields[field]._subfields[subfield]._code == "a"){
                        cleanedObject.title = dataFields[field]._subfields[subfield]._data;
                    //remainder of title MARC21 245 $b
                    }else if(dataFields[field]._subfields[subfield]._code == "b"){
                        cleanedObject.subTitle = dataFields[field]._subfields[subfield]._data;
                    //rmedium MARC21 245 $h
                    }//else if(dataFields[field]._subfields[subfield]._code == "h"){
                     //   cleanedObject.medium = dataFields[field]._subfields[subfield]._data;
                    //}
                }
            // subject added entry - topical term MARC21 650
            }else if(dataFields[field]._tag == "650"){
                for(var subfield in dataFields[field]._subfields){
                    //topical term or geographic name entry element $a
                    if(dataFields[field]._subfields[subfield]._code == "a"){
                        cleanedObject.keywords.push(dataFields[field]._subfields[subfield]._data);
                    }
                }
            }
        }
        
        fnCallback(cleanedObject);
    });
}


/**
 * Factory function
 *
 * @returns {Marc21Helper}
*/
function createMarc21Helper() {
    return new Marc21Helper();
}


module.exports = {
        createMarc21Helper : createMarc21Helper
};