"use strict";

const marc4js = require('marc4js');
const enums = require('./../schema/enum.json');
const async = require('async');
const logger = require('./../util/logger');
const BibliographicResource = require('./../schema/bibliographicResource');
const Identifier = require('./../schema/identifier');
const AgentRole = require('./../schema/agentRole');
const Readable = require('stream').Readable;

let Marc21Helper = function(){
};


/**
 * Parses a given String in MARC21 format and returns a bibliographic resource
 * @param xmlString
 * @param fnCallback
 */
Marc21Helper.prototype.parseBibliographicResource = function(xmlString, format, callback){
    let self = this;
    let stream = new Readable;
    stream.push(xmlString);
    stream.push(null);

    let parser = marc4js.parse({objectMode: true, fromFormat: format});
    stream.pipe(parser);

    parser.on('error', function (error) {
        logger.error(error);
    });

    let records = [];
    parser.on('data', function (record) {
        records.push(record);
    });

    parser.on('end', function () {
       self.extractData(records, null, function(err, result){
           if(err){
               logger.error(err);
               return callback(err, null);
           }
           return callback(null, result);
       });
    });
};


/**
 * Parses an xml record consisting of multiple bibliographicResources in marc21 format
 * @param xmlString
 * @param fnCallback
 */
Marc21Helper.prototype.parseBibliographicResources = function(xmlString, callback){
    // apparently, when having multiple resources in the xml, marc4js parses it such that every second
    // entry in the array really belongs to a bibliographic resource
    let self = this;
    let stream = new Readable;
    stream.push(xmlString);
    stream.push(null);

    let parser = marc4js.parse({objectMode: true, fromFormat: 'marcxml'});
    stream.pipe(parser);

    parser.on('error', function (error) {
        logger.error(error);
    });

    let records = [];
    parser.on('data', function (record) {
        records.push(record);
    });

    parser.on('end', function () {
        let temp = [];
        let chunk = 2;
        let splittedRecords = [];
        for (let i=0, j=records.length; i<j; i+=chunk) {
            temp = records.slice(i,i+chunk);
            splittedRecords.push(temp);
        }
        async.map(splittedRecords,
            function(rec, callback) {
                self.extractData(rec, null, function (err, result) {
                    callback(null, result);
                });
            },
            function (err, results) {
                if (err) {
                    logger.log(err);
                    return callback(err, null);
                }
                return callback(null, results);
            }
        );
    });
};


/**
 * Extracts the data needed to fill a bibliographicResource from records of length 2
 * @param records
 * @param fnCallback
 */
Marc21Helper.prototype.extractData = function(records, type, callback){
    // apparently, when having multiple resources in the xml, marc4js parses it such that every second
    // entry in the array really belongs to a bibliographic resource
    if(typeof records[1] == "undefined") {
        if(typeof records[0] == "undefined"){
            return callback(null, []);
        }else{
            records = [[], records[0]];
        }
    }
    if(!type){
        type = this.guessResourceType(records);
    }
    if(this.isDependentResource(records)){
        return this.extractDependentResource(records, type, function(err,result){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            return callback(null, result);
        });
    }else{
        return this.extractIndependentResource(records, type, function (err, result){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            return callback(null, result);
        });
    }
}

/**
 * If Marc21 field 773 is given, then we are  dealing with a child resource
 * @param records
 * @returns {boolean}
 */
Marc21Helper.prototype.isDependentResource = function(records){
    for (let field of records[1]._dataFields) {
        if (field._tag === "773") {
            return true;
        }
    }
    return false;
}

/**
 * Given some binary features of the data (e.g. does the resource have an ISBN?) this function guesses the resource type (rule-based classification)
 * @param records
 */
Marc21Helper.prototype.guessResourceType = function (records) {
    let dataFields = records[1]._dataFields;

    // here are all our features
    let resourceHasNumber = false;
    let resourceIsReport = false;
    let parentHasISSN = false;
    let parentHasISBN = true;
    let isDependent = false;
    let hasISBN = false;
    let hasDOI = false;
    let hasZDBId = false;
    let hasEdition = false;
    let hasEditor = false;
    let hasISSN = false;

    for (let field of dataFields) {
        if (field._tag === "773") {
            isDependent = true;
            for (let subfield of field._subfields) {
                if (subfield._code === "g") {
                    resourceHasNumber = true;
                } else if (subfield._code === "x") {
                    parentHasISSN = true;
                } else if (subfield._code === "r") {
                    resourceIsReport = true;
                } else if (subfield._code === "z"){
                    parentHasISBN = true;
                }
            }
        }
        else if (field._tag === "020") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a") {
                    hasISBN = true;
                }
            }
        }
        else if (field._tag === "016" && field._indicator1 && field._indicator1 === "7") {
            if (field.subfields.length >= 2 && field.subfields[0]._code === "2" && field.subfields[0]._data === "DE-600") {
                hasZDBId = true;
            }
        } else if (field._tag === "024" && field._indicator1 && field._indicator1 === "7") {
            for (let subfield of field._subfields) {
                if (subfield._code === "2" && subfield._data.toLowerCase() === "doi") {
                    for (let subf of field._subfields) {
                        if (subf._code === "a") {
                            hasDOI = true;
                        }
                    }
                }
            }
        }
        else if (field._tag === "250") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a") {
                    hasEdition = true;
                }
            }
        } else if (field._tag === "700") {
            for (let subfield of field._subfields) {
                if (subfield._code === "4" && subfield._data === "edt") {
                    hasEditor = true;
                }
            }
        } else if (field._tag === "022") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a") {
                    hasISSN = true;
                }
            }
        }
    }
    // Missing: journal from swb
    // edited book has editor and isbn
    // journal has issn
    // bookSeries has issn
    // journal Article has doi? parent has issn and has no edition
    // Here we make the final decision based on what we got
    // if 773 is not given, we have an independent resource
    // journal
    // monograph
    // edited book
    // bookSeries
    // if 773 is given, we have a dependent resource
    // journalArticle
    // book
    // resource is dependent
    // if there is subfield z we have an isbn --> parent is some kind of book, e.g. an edited book
    // and child is some part of a book, e.g. a book chapter
    // if there is subfield x we have an issn --> parent is some kind of a series, e.g. a book series or a journal
    if (hasZDBId && hasISSN && !isDependent) {
        return enums.resourceType.journal;
    } else if (resourceIsReport) {
        return enums.resourceType.report;
    } else if (parentHasISSN && isDependent && !hasISBN) {
        return enums.resourceType.journalArticle;
    } else if (hasISBN && hasEditor) {
        return enums.resourceType.editedBook;
    } else if (hasISBN) {
        return enums.resourceType.monograph;
    } else if(hasISSN){
        return enums.resourceType.journal;
    }
    else{
        return enums.resourceType.book;
    }
}

Marc21Helper.prototype.extractIndependentResource = function(records, type, callback){
    let resource = new BibliographicResource({type: type});

    let dataFields = records[1]._dataFields;
    let controlFields = records[1]._controlFields;
    //let leader = records[1]._leader;

    for (let field of dataFields) {
        //Titles
        if (field._tag === "245") {
            for (let subfield of field._subfields) {
                if (subfield._code !== "p") {
                    if (subfield._code === "a") {
                        resource.setTitleForType(resource.type, subfield._data);
                    } else if (subfield._code === "b") {
                        resource.setSubtitleForType(resource.type, subfield._data);
                    }
                }else{
                    // this is the special case for book sets: p Name of part/section of a work
                    resource.setTitleForType(resource.type, subfield._data);
                }
            }
            // Identifiers
        } else if (field._tag === "020") {
            for (let subfield of field._subfields) {
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
                    scheme: enums.identifier.zdbId
                }));
            }
        } else if (field._tag === "022") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a") {
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: subfield._data,
                        scheme: enums.identifier.issn
                    }));
                }
            }
        } else if (field._tag === "010") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a") {
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: subfield._data,
                        scheme: enums.identifier.lccn
                    }));
                }
            }
        } else if (field._tag === "024" && field._indicator1 && field._indicator1 === "7") {
            for (let subfield of field._subfields) {
                if (subfield._code === "2" && subfield._data.toLowerCase() === "doi") {
                    for (let subf of field._subfields) {
                        if (subf._code === "a") {
                            resource.pushIdentifierForType(resource.type, new Identifier({
                                literalValue: subf._data,
                                scheme: enums.identifier.doi
                            }));
                        }
                    }
                }
            }
        } else if (field._tag === "035") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a" && subfield._data.split("(OCoLC)").length === 2) {
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: subfield._data.split("(OCoLC)")[1],
                        scheme: enums.identifier.oclcId
                    }));
                }
            }
        } else if (field._tag === "856") {
            for (let subfield of field._subfields) {
                if (subfield._code === "u") {
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: subfield._data,
                        scheme: enums.identifier.uri
                    }));
                }
            }
        }
        else if (field._tag === "250") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a") {
                    resource.setEditionForType(resource.type, subfield._data);
                }
            }
            // Contributors
        } else if (field._tag === "100") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a") {
                    let nameArray = subfield._data.split(',');
                    let contributor = new AgentRole({
                        roleType: enums.roleType.author,
                        heldBy: {
                            givenName: nameArray[1] ? nameArray[1].trim() : "",
                            familyName: nameArray[1] ? nameArray[0].trim() : ""
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        } else if (field._tag === "110") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a") {

                    let contributor = new AgentRole({
                        roleType: enums.roleType.corporate,
                        heldBy: {
                            nameString: subfield._data
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        } else if (field._tag === "111") {
            for (let subfield of field._subfields) {
                if (subfield._code === "a") {
                    let contributor = new AgentRole({
                        roleType: enums.roleType.congress,
                        heldBy: {
                            nameString: subfield._data
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        } else if (field._tag === "260") {
            for (let subfield of field._subfields) {
                if (subfield._code === "b") {
                    let contributor = new AgentRole({
                        roleType: enums.roleType.publisher,
                        heldBy: {
                            nameString: subfield._data
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        } else if (field._tag === "264") {
            for (let subfield of field._subfields) {
                if (subfield._code === "b") {
                    let contributor = new AgentRole({
                        roleType: enums.roleType.publisher,
                        heldBy: {
                            nameString: subfield._data
                        }
                    });

                    resource.pushContributorForType(resource.type, contributor);
                }
            }
        } else if (field._tag === "700") {
            let contributor = new AgentRole();
            for(let subfield of field._subfields){
                if(subfield._code === '4' && subfield._data === "edt"){
                    contributor.roleType = enums.roleType.editor;
                }else if(subfield._code === 'e' && subfield._data === "aut"){
                    contributor.roleType = enums.roleType.author;
                }else{
                    contributor.roleType = enums.roleType.author;
                }
            }

            for (let subfield of field._subfields) {
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
                } else if (subfield._code === "a" && subfield._data) {
                    let nameArray = subfield._data.split(',');
                    if(nameArray && nameArray.length > 1){
                        contributor.heldBy.givenName = nameArray[1] ? nameArray[1].trim() : "";
                        contributor.heldBy.familyName = nameArray[1] ? nameArray[0].trim() : "";
                    }else if(nameArray.length == 1){
                        contributor.heldBy.nameString = nameArray[0];
                    }

                }
            }
            resource.pushContributorForType(resource.type, contributor);
        } else if (field._tag === "710") {
            let contributor = new AgentRole({
                roleType: enums.roleType.corporate
            });

            for (let subfield of field._subfields) {
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
                } else if (subfield._code === "a") {
                    contributor.heldBy.nameString = subfield._data;
                }
            }
            resource.pushContributorForType(resource.type, contributor);
        } else if (field._tag === "711") {
            let contributor = new AgentRole({
                roleType: enums.roleType.congress
            });

            for (let subfield of field._subfields) {
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
                } else if (subfield._code === "a") {
                    contributor.heldBy.nameString = subfield._data;
                }
            }
            resource.pushContributorForType(resource.type, contributor);
        }
    }


    for (let field of controlFields) {
        if (field._tag === "001") {
            // ppn
            for (let f of controlFields) {
                if (f._tag === "003" && f._data === "DE-576") {
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: field._data,
                        scheme: enums.identifier.swbPpn
                    }));
                } else if (f._tag === "003" && f._data === "DE-101") {
                    resource.pushIdentifierForType(resource.type, new Identifier({
                        literalValue: field._data,
                        scheme: enums.identifier.zdbPpn
                    }));
                }
            }
        } else if (field._tag === "008") {
            // publicationDate
            resource.setPublicationDateForType(resource.type, field._data.substring(7, 11));
        }
    }
    return callback(null, [resource]);
}


Marc21Helper.prototype.extractDependentResource = function(records, type, callback){

    this.extractIndependentResource(records, type, function(err, res){
        let child =res[0];
        let parentType = child.getContainerTypeForType(child.type);
        let parent = new BibliographicResource({type: parentType[0]});
        let dataFields = records[1]._dataFields;
        for (let field of dataFields) {
            if (field._tag === "245" && parent.type === enums.resourceType.bookSet) {
                for (let subfield of field._subfields) {
                    if (subfield._code === "a") {
                        parent.setTitleForType(parent.type, subfield._data);
                    } else if (subfield._code === "b") {
                        parent.setSubtitleForType(parent.type, subfield._data);
                    }
                }
            }else if (field._tag === "773") {
                for (let subfield of field._subfields) {
                    if (subfield._code === "g" && parent.type !== enums.resourceType.bookSet) {
                        parent.setNumberForType(parent.type, subfield._data);
                    }else if (subfield._code === "g" && parent.type === enums.resourceType.bookSet){
                        child.setNumberForType(child.type, subfield._data);
                    } else if (subfield._code === "x") {
                        let type;
                        if(child.type === enums.resourceType.journalArticle || child.type === enums.resourceType.journalIssue || child.type === enums.resourceType.journalVolume){
                            type = enums.resourceType.journal;
                        }else{
                            type = parent.type;
                        }
                        parent.pushIdentifierForType(type, new Identifier({
                            literalValue: subfield._data,
                            scheme: enums.identifier.issn
                        }));
                    } else if (subfield._code === "z") {
                        parent.pushIdentifierForType(parent.type, new Identifier({
                            literalValue: subfield._data,
                            scheme: enums.identifier.isbn
                        }));
                    } else if (subfield._code === "t") {
                        let type;
                        if(child.type === enums.resourceType.journalArticle || child.type === enums.resourceType.journalIssue || child.type === enums.resourceType.journalVolume){
                            type = enums.resourceType.journal;
                        }else{
                            type = parent.type;
                        }
                        parent.setTitleForType(type, subfield._data);
                    } else if (subfield._code === "a") {
                        let type;
                        if(child.type === enums.resourceType.journalArticle || child.type === enums.resourceType.journalIssue || child.type === enums.resourceType.journalVolume){
                            type = enums.resourceType.journal;
                        }else{
                            type = parent.type;
                        }
                        parent.setTitleForType(type, subfield._data);
                        parent.setTitleForType(parent.type, subfield._data);
                    } else if (subfield._code === "b") {
                        parent.setEditionForType(parent.type, subfield._data);
                    }
                }
            // Contributors
            } else if (field._tag === "260") {
                for (let subfield of field._subfields) {
                    if (subfield._code === "b") {
                        let contributor = new AgentRole({
                            roleType: enums.roleType.publisher,
                            heldBy: {
                                nameString: subfield._data
                            }
                        });

                        parent.pushContributorForType(parent.type, contributor);
                    }
                }
            } else if (field._tag === "264") {
                for (let subfield of field._subfields) {
                    if (subfield._code === "b") {
                        let contributor = new AgentRole({
                            roleType: enums.roleType.publisher,
                            heldBy: {
                                nameString: subfield._data
                            }
                        });

                        parent.pushContributorForType(parent.type, contributor);
                    }
                }
            } else if (field._tag === "100" && parent.type === enums.resourceType.bookSet) {
                for (let subfield of field._subfields) {
                    if (subfield._code === "a") {
                        let nameArray = subfield._data.split(',');
                        let contributor = new AgentRole({
                            roleType: enums.roleType.author,
                            heldBy: {
                                givenName: nameArray[1] ? nameArray[1].trim() : "",
                                familyName: nameArray[1] ? nameArray[0].trim() : ""
                            }
                        });

                        parent.pushContributorForType(parent.type, contributor);
                    }
                }
            }
        }
        return callback(null, [child, parent]);
    });
};

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