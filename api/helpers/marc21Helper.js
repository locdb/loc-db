"use strict";

const marc4js = require('marc4js');
const enums = require('./../schema/enum.json');
const async = require('async');

var Marc21Helper = function(){
}


/**
 * Parses a given String in MARC21 format and returns a bibliographic resource
 * @param xmlString
 * @param fnCallback
 */
Marc21Helper.prototype.parseBibliographicResource = function(xmlString, callback){
    var self = this;
    marc4js.parse(xmlString, {format: 'marcxml'}, function(err, records) {
        self.extractData(records,function(err, result){
            if(err){
                errorlog.error(err);
                return callback(err, null);
            }
            return callback(null, result);
        })
    });
}


/**
 * Parses an xml record consisting of multiple bibliographicResources in marc21 format
 * @param xmlString
 * @param fnCallback
 */
Marc21Helper.prototype.parseBibliographicResources = function(xmlString, callback){
    // apparently, when having multiple resources in the xml, marc4js parses it such that every second
    // entry in the array really belongs to a bibliographic resource
    var self = this;
    marc4js.parse(xmlString, {format: 'marcxml'}, function(err, records) {
        var temp = [];
        var chunk = 2;
        var splittedRecords = [];
        for (var i=0, j=records.length; i<j; i+=chunk) {
            temp = records.slice(i,i+chunk);
            splittedRecords.push(temp);
        }
        async.map(splittedRecords, self.extractData, function(err, results){
            if(err){
                errorlog.log(err);
                return callback(err, null);
            }
            return callback(null,results);
        });

    });
}


/**
 * Extracts the data needed to fill a bibliographicResource from records of length 2
 * @param records
 * @param fnCallback
 */
Marc21Helper.prototype.extractData = function(records, callback){
    // apparently, when having multiple resources in the xml, marc4js parses it such that every second
    // entry in the array really belongs to a bibliographic resource
    if(typeof records[1] == "undefined"){
        return callback(null, []);
    }

    var dataFields = records[1]._dataFields;
    var controlFields = records[1]._controlFields;
    var leader = records[1]._leader;

    var cleanedObject = {};
    cleanedObject.identifiers = [];
    cleanedObject.contributors = [];

    for(var field of dataFields){
        //Titles
        if(field._tag == "245"){
            for(var subfield of field._subfields){
                if(subfield._code == "a"){
                    cleanedObject.title = subfield._data;
                }else if(subfield._code == "b"){
                    cleanedObject.subtitle = subfield._data;
                }
            }
            // Identifiers
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
                    var re = /10.\d{4,9}\/[-._;()\/:(a-z)(A-Z)\d]+$/;
                    if(re.test(subfield._data)){
                        cleanedObject.identifiers.push({"literalValue": subfield._data,
                            "scheme": "DOI"});
                    }else{
                        cleanedObject.identifiers.push({"literalValue": subfield._data,
                            "scheme": "TBA"});
                    }
                }
            }
        }else if(field._tag == "856"){
            for(var subfield of field._subfields){
                if(subfield._code == "u"){
                    cleanedObject.identifiers.push({"literalValue": subfield._data,
                        "scheme": "URI"});
                }
            }
        }
        //Genre/Form
        else if(field._tag == "655"){
            for(var subfield of field._subfields){
                if(subfield._code == "a"){
                    cleanedObject.type = subfield._data;
                }
            }
            // Edition
        }else if(field._tag == "250"){
            for(var subfield of field._subfields){
                if(subfield._code == "a"){
                    cleanedObject.edition = subfield._data;
                }
            }
            // Number
        }else if(field._tag == "773"){
            for(var subfield of field._subfields){
                if(subfield._code == "g"){
                    cleanedObject.number = subfield._data;
                }else if(subfield._code == "x"){
                    cleanedObject.identifiers.push({"literalValue": subfield._data,
                        "scheme": enums.identifier.issn});
                }
            }
            // Contributors
        }else if(field._tag == "100"){
            for(var subfield of field._subfields){
                if(subfield._code == "a"){
                    var contributor = {};
                    contributor.roleType = enums.roleType.author;
                    contributor.heldBy = {};
                    contributor.heldBy.identifiers = [];
                    contributor.heldBy.nameString = subfield._data;
                    var nameArray = subfield._data.split(',');
                    contributor.heldBy.givenName =  nameArray[1] ? nameArray[1].trim() : "";
                    contributor.heldBy.familyName =  nameArray[1] ? nameArray[0].trim() : "";
                    cleanedObject.contributors.push(contributor);
                }
            }
        }else if(field._tag == "110"){
            for(var subfield of field._subfields){
                if(subfield._code == "a"){
                    var contributor = {};
                    contributor.roleType = enums.roleType.corporate;
                    contributor.heldBy = {};
                    contributor.heldBy.identifiers = [];
                    contributor.heldBy.nameString = subfield._data;
                    cleanedObject.contributors.push(contributor);
                }
            }
        }else if(field._tag == "111"){
            for(var subfield of field._subfields){
                if(subfield._code == "a"){
                    var contributor = {};
                    contributor.roleType = enums.roleType.congress;
                    contributor.heldBy = {};
                    contributor.heldBy.identifiers = [];
                    contributor.heldBy.nameString = subfield._data;
                    cleanedObject.contributors.push(contributor);
                }
            }
        }else if(field._tag == "260"){
            for(var subfield of field._subfields){
                if(subfield._code == "b"){
                    var contributor = {};
                    contributor.roleType = enums.roleType.publisher;
                    contributor.heldBy = {};
                    contributor.heldBy.identifiers = [];
                    contributor.heldBy.nameString = subfield._data;
                    cleanedObject.contributors.push(contributor);
                }
            }
        }else if(field._tag == "264"){
            for(var subfield of field._subfields){
                if(subfield._code == "b"){
                    var contributor = {};
                    contributor.roleType = enums.roleType.publisher;
                    contributor.heldBy = {};
                    contributor.heldBy.identifiers = [];
                    contributor.heldBy.nameString = subfield._data;
                    cleanedObject.contributors.push(contributor);
                }
            }
        }
    }

    // publicationYear
    for(var field of controlFields){
        if(field._tag == "008"){
            cleanedObject.publicationYear = field._data.substring(7,11);
        }
    }

    //LEADER
    if(leader._typeOfRecord && leader._typeOfRecord.toLowerCase() == "m"){
        //TODO: Fix this mess --> adapt to new data model!
        // cleanedObject.embodiedAs = "Digital";
    }else if(leader._typeOfRecord
        && (leader._typeOfRecord.toLowerCase() == "a"
        || leader._typeOfRecord.toLowerCase() == "c"
        || leader._typeOfRecord.toLowerCase() == "e")){
        // cleanedObject.embodiedAs = "Print";
    }else if(leader._bibliographicLevel && leader._bibliographicLevel.toLowerCase() == "a"){
        //TODO: Fix this mess --> adapt to new data model!
        //cleanedObject.type = "Monograph";
    }else if(leader._bibliographicLevel && leader._bibliographicLevel.toLowerCase() == "s"){
        //TODO: Fix this mess --> adapt to new data model!
        //cleanedObject.type = "Serial";
    }
    callback(null, cleanedObject);
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