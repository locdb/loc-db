"use strict";

const marc4js = require('marc4js');
const enums = require('./../schema/enum.json');
const async = require('async');
const logger = require('./../util/logger');
const BibliographicResource = require('./../schema/bibliographicResource');
const Identifier = require('./../schema/identifier');
const AgentRole = require('./../schema/agentRole');

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
                logger.error(err);
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
                logger.log(err);
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
    if(typeof records[1] == "undefined") {
        return callback(null, []);
    }

    //if(source == enums.externalSources.zdb || ){
        return this.extractIndependentResource(records, function (err, result){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            return callback(null, result);
        });
    //}
}

Marc21Helper.prototype.guessResourceType = function (records) {
    var dataFields = records[1]._dataFields;
    var controlFields = records[1]._controlFields;
    var leader = records[1]._leader;

    // if 773 is given, we have a dependent resource
        // journalArticle
        // book
    // if 773 is not given, we have an independent resource
        // journal
        // monograph
        // edited book
        // bookSeries
    for(var field of dataFields) {

    }

}

Marc21Helper.prototype.extractIndependentResource = function(records, callback){
    // apparently, when having multiple resources in the xml, marc4js parses it such that every second
    // entry in the array really belongs to a bibliographic resource
    if(typeof records[1] == "undefined"){
        return callback(null, []);
    }

    var resource = new BibliographicResource();
    //if(source === enums.externalSources.zdb){
    resource.type = enums.resourceType.journal;
    //}

    var dataFields = records[1]._dataFields;
    var controlFields = records[1]._controlFields;
    var leader = records[1]._leader;

    for(var field of dataFields) {
        //Titles
        if (field._tag === "245") {
            for (var subfield of field._subfields) {
                if (subfield._code === "a") {
                    resource.setTitleForType(resource.type, subfield._data);
                } else if (subfield._code === "b") {
                    resource.setSubtitleForType(resource.type, subfield._data);
                }
            }
            // Identifiers
        } else if (field._tag === "020") {
            for (var subfield of field._subfields) {
                if (subfield._code === "a") {
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: subfield._data,
                        scheme: enums.identifier.isbn
                    }));
                }
            }
        } else if (field._tag === "016" && field._indicator1 && field._indicator1 === "7") {
            if (field.subfields.length >= 2 && field.subfields[0]._code === "2" && field.subfields[0]._data === "DE-600") {
                resource.pushIdentifierForType(resource.type, new Identifier({
                    literalValue: field.subfields[1]._data,
                    scheme: enums.identifier.zdb_id
                }));
            }
        }else if(field._tag === "022"){
            for(var subfield of field._subfields){
                if(subfield._code === "a"){
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: subfield._data,
                        scheme: enums.identifier.issn}));
                }
            }
        }else if(field._tag === "010"){
            for(var subfield of field._subfields){
                if(subfield._code === "a"){
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: subfield._data,
                        scheme: enums.identifier.lccn}));
                }
            }
        }else if (field._tag === "024" && field._indicator1 && field._indicator1 === "7") {
            for(var subfield of field._subfields) {
                if(subfield._code === "2" && subfield._data.toLowerCase() === "doi"){
                    for(var subf of field._subfields) {
                        if(subf._code === "a"){
                            resource.pushIdentifierForType(resource.type, new Identifier({
                                literalValue: subf._data,
                                scheme: enums.identifier.doi
                            }));
                        }
                    }
                }
            }
        }else if (field._tag === "035") {
            for(var subfield of field._subfields){
                if(subfield._code === "a" && subfield._data.split("(OCoLC)").length === 2){
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: subfield._data.split("(OCoLC)")[1],
                        scheme: enums.identifier.oclcId}));
                }
            }
        }else if(field._tag === "856"){
            for(var subfield of field._subfields){
                if(subfield._code === "u"){
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: subfield._data,
                        scheme: enums.identifier.uri}));
                }
            }
        }
        //Genre/Form
/*        else if(field._tag === "655"){
            for(var subfield of field._subfields){
                if(subfield._code === "a"){
                    cleanedObject.type = subfield._data;
                }
            }
            // Edition
        }*/
        else if(field._tag === "250"){
            for(var subfield of field._subfields){
                if(subfield._code === "a"){
                    resource.setEditionForType(resource.type, subfield._data);
                }
            }
            // Number && ISSN
        }else if(field._tag === "773"){
            for(var subfield of field._subfields){
                if(subfield._code === "g"){
                    resource.setNumberForType(resource.type, subfield._data);
                }else if(subfield._code === "x"){
                    resource.pushIdentifierForType(new Identifier({
                        literalValue: subfield._data,
                        scheme: enums.identifier.issn}));
                }
            }
            // Contributors
        }else if(field._tag === "100"){
            for(var subfield of field._subfields){
                if(subfield._code === "a"){
                    var nameArray = subfield._data.split(',');
                    var contributor = new AgentRole({
                        roleType: enums.roleType.author,
                        heldBy:{
                            givenName: nameArray[1] ? nameArray[1].trim() : "",
                            familyName: nameArray[1] ? nameArray[0].trim() : ""
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        }else if(field._tag === "110"){
            for(var subfield of field._subfields){
                if(subfield._code === "a"){

                    var contributor = new AgentRole({
                        roleType : enums.roleType.corporate,
                        heldBy : {
                            nameString: subfield._data
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        }else if(field._tag === "111"){
            for(var subfield of field._subfields){
                if(subfield._code === "a"){
                    var contributor = new AgentRole({
                        roleType: enums.roleType.congress,
                        heldBy: {
                            nameString: subfield._data
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        }else if(field._tag === "260"){
            for(var subfield of field._subfields){
                if(subfield._code === "b"){
                    var contributor = new AgentRole({
                        roleType: enums.roleType.publisher,
                        heldBy: {
                            nameString: subfield._data
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        }else if(field._tag === "264"){
            for(var subfield of field._subfields){
                if(subfield._code === "b"){
                    var contributor = new AgentRole({
                        roleType: enums.roleType.publisher,
                        heldBy: {
                            nameString: subfield._data
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        }else if(field._tag === "700"){
            var contributor = new AgentRole({
                roleType : enums.roleType.author
            });

            for(var subfield of field._subfields) {
                if (subfield._code === "0" && (subfield._data.split("(DE-588)").length === 2 || subfield._data.split("(DE-576)").length === 2)) {
                    if (subfield._data.split("(DE-588)").length === 2) {
                        contributor.heldBy.identifiers.push({
                            scheme: enums.identifier.gndId,
                            literalValue: subfield._data.split("(DE-588)")[1]
                        });
                    } else if (subfield._data.split("(DE-576)").length === 2) {
                        contributor.heldBy.identifiers.push({
                            scheme: enums.identifier.swbGndId,
                            literalValue: subfield._data.split("(DE-576)")[1]
                        });
                    }
                }else if (subfield._code === "a") {
                    var nameArray = subfield._data.split(',');
                    contributor.heldBy.givenName = nameArray[1] ? nameArray[1].trim() : "";
                    contributor.heldBy.familyName = nameArray[1] ? nameArray[0].trim() : "";
                }
            }
            resource.pushContributorForType(resource.type, contributor);
        }else if(field._tag === "710"){
            var contributor = new AgentRole({
                roleType: enums.roleType.corporate
            });

            for(var subfield of field._subfields) {
                if (subfield._code === "0" && (subfield._data.split("(DE-588)").length === 2 || subfield._data.split("(DE-576)").length === 2)) {
                    if (subfield._data.split("(DE-588)").length === 2) {
                        contributor.heldBy.identifiers.push({
                            scheme: enums.identifier.gndId,
                            literalValue: subfield._data.split("(DE-588)")[1]
                        });
                    } else if (subfield._data.split("(DE-576)").length === 2) {
                        contributor.heldBy.identifiers.push({
                            scheme: enums.identifier.swbGndId,
                            literalValue: subfield._data.split("(DE-576)")[1]
                        });
                    }
                }else if (subfield._code === "a") {
                    contributor.heldBy.nameString = subfield._data;
                }
            }
            resource.pushContributorForType(resource.type, contributor);
        }else if(field._tag === "711"){
            var contributor = new AgentRole({
                roleType: enums.roleType.congress
            });

            for(var subfield of field._subfields) {
                if (subfield._code === "0" && (subfield._data.split("(DE-588)").length === 2 || subfield._data.split("(DE-576)").length === 2)) {
                    if (subfield._data.split("(DE-588)").length === 2) {
                        contributor.heldBy.identifiers.push({
                            scheme: enums.identifier.gndId,
                            literalValue: subfield._data.split("(DE-588)")[1]
                        });
                    } else if (subfield._data.split("(DE-576)").length === 2) {
                        contributor.heldBy.identifiers.push({
                            scheme: enums.identifier.swbGndId,
                            literalValue: subfield._data.split("(DE-576)")[1]
                        });
                    }
                }else if (subfield._code === "a") {
                    contributor.heldBy.nameString = subfield._data;
                }
            }
            resource.pushContributorForType(resource.type, contributor);
        }
    }


    for(var field of controlFields){
        if(field._tag === "001"){
            // ppn
            for (var f of controlFields){
                if(f._tag === "003" && f._data === "DE-576"){
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: field._data,
                        scheme: enums.identifier.swb_ppn}));
                }else if(f._tag === "003" && f._data === "DE-101"){
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: field._data,
                        scheme: enums.identifier.zdb_ppn}));
                }
            }
        }else if(field._tag === "008"){
            // publicationYear
            resource.setPublicationYearForType(resource.type, field._data.substring(7,11));
        }
    }

    /*    //LEADER
     if(leader._typeOfRecord && leader._typeOfRecord.toLowerCase() === "m"){
     // cleanedObject.embodiedAs = "Digital";
     }else if(leader._typeOfRecord
     && (leader._typeOfRecord.toLowerCase() === "a"
     || leader._typeOfRecord.toLowerCase() === "c"
     || leader._typeOfRecord.toLowerCase() === "e")){
     // cleanedObject.embodiedAs = "Print";
     }else if(leader._bibliographicLevel && leader._bibliographicLevel.toLowerCase() === "a"){
     //cleanedObject.type = "Monograph";
     }else if(leader._bibliographicLevel && leader._bibliographicLevel.toLowerCase() == "s"){
     //cleanedObject.type = "Serial";
     }*/
     callback(null, [resource]);
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