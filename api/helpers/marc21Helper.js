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
        var controlFields = records[1]._controlFields;

        var cleanedObject = {};
        cleanedObject.identifiers = [];

        for(var field of dataFields){
            //title statement MARC21 245
            if(field._tag == "245"){
                for(var subfield of field._subfields){
                    //title MARC21 245 $a
                    if(subfield._code == "a"){
                        cleanedObject.title = subfield._data;
                    //remainder of title MARC21 245 $b
                    }else if(subfield._code == "b"){
                        cleanedObject.subtitle = subfield._data;
                    }
                }
            // identifiers
            }else if(field._tag == "020"){
                for(var subfield of field._subfields){
                    if(subfield._code == "a"){
                        cleanedObject.identifiers.push({"literalValue": subfield._data,
                                "scheme": "ISBN"});
                    }
                }
            }else if(field._tag == "022"){
                for(var subfield of field._subfields){
                    if(subfield._code == "a"){
                        cleanedObject.identifiers.push({"literalValue": subfield._data,
                                "scheme": "ISSN"});
                    }
                }
            }else if(field._tag == "024"){
                for(var subfield of field._subfields){
                    if(subfield._code == "a"){
                        cleanedObject.identifiers.push({"literalValue": subfield._data,
                                "scheme": "TBD"});
                    }
                }
            }
            else if(field._tag == "655"){
                for(var subfield of field._subfields){
                    if(subfield._code == "a"){
                        cleanedObject.type = subfield._data;
                    }
                }
            }
        }
        
        for(var field of controlFields){
            if(field._tag == "008"){
                cleanedObject.publicationYear = Number(field._data.substring(7,11));
            }
        }
        console.log(cleanedObject);
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