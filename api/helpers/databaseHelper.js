/**
 * Created by anlausch on 9/8/2017.
 */

'use strict';
const mongoBr = require('./../models/bibliographicResource.js');
const BibliographicResource = require('./../schema/bibliographicResource.js');
const mongoose = require('mongoose');
const enums = require('./../schema/enum.json');
const logger = require('./../util/logger');
const ocrHelper = require('./ocrHelper').createOcrHelper();
const swbHelper = require('./swbHelper').createSwbHelper();
const crossrefHelper = require('./crossrefHelper').createCrossrefHelper();
const async = require('async');
const Scan = require('./../schema/scan');
const ResourceEmbodiment = require('./../schema/resourceEmbodiment');

var DatabaseHelper = function(){
};

DatabaseHelper.prototype.findScanByScanName = function(br, scanName, callback){
    // now search for the scanId
    for(var embodiment of br.embodiedAs){
        for(var scan of embodiment.scans){
            if(scan.scanName === scanName){
                return callback(null, scan);
            }
        }
    }
    return callback(null, null);
};

DatabaseHelper.prototype.saveScan = function(scan, textualPdf, callback){
    // get unique id from mongo which we use as filename
    var scanId = mongoose.Types.ObjectId().toString();

    ocrHelper.saveBinaryFile(scanId, scan.buffer, function (err, scanName) {
        // if there is an error, log it and return
        if (err) {
            errorlog.error(err);
            return callback(err, null)
        }
        // if not, create a scan object
        var scan = new Scan({_id: scanId, scanName: scanName, status: enums.status.notOcrProcessed, textualPdf: textualPdf});

        // return scan object to the caller
        callback(null, scan);
    });
}


DatabaseHelper.prototype.resourceExists = function (identifier, resourceType, firstPage, lastPage, callback) {
    var self = this;

    // TODO: We have to make 100% sure, that we find the match. Therefore, it would be better to search just in all identifier properties
    //if(resourceType === enums.resourceType.bookChapter && identifier.scheme === enums.identifier.swb_ppn){
    //    resourceType = enums.resourceType.editedBook;
    //}
    //var propertyPrefix = new BibliographicResource().getPropertyPrefixForType(resourceType);
    // check whether a resource with the given identifier and type is in the db

    //mongoBr.where(propertyPrefix.concat("identifiers.scheme"), identifier.scheme)
    //    .where(propertyPrefix.concat("identifiers.literalValue"), identifier.literalValue)
        //.where("type", resourceType)
    mongoBr.find().or([
        {$and: [
            {"monograph_identifiers.scheme": identifier.scheme},
            {"monograph_identifiers.literalValue": identifier.literalValue},
            {"type": enums.resourceType.monograph}
            ]
        },
        {$and: [
            {"book_identifiers.scheme": identifier.scheme},
            {"book_identifiers.literalValue": identifier.literalValue},
            {"type": enums.resourceType.book}
        ]
        },
        {$and: [
            {"journal_identifiers.scheme": identifier.scheme},
            {"journal_identifiers.literalValue": identifier.literalValue},
            {"type": enums.resourceType.journal}
        ]
        },
        {$and: [
            {"journalArticle_identifiers.scheme": identifier.scheme},
            {"journalArticle_identifiers.literalValue": identifier.literalValue},
            {"type": enums.resourceType.journalArticle}
        ]
        },
        {$and: [
            {"bookChapter_identifiers.scheme": identifier.scheme},
            {"bookChapter_identifiers.literalValue": identifier.literalValue},
            {"type": enums.resourceType.bookChapter}
        ]
        },
        {$and: [
            {"editedBook_identifiers.scheme": identifier.scheme},
            {"editedBook_identifiers.literalValue": identifier.literalValue},
            {"type": enums.resourceType.editedBook}
        ]
        }

        ]).exec(function (err, resources) {
            if(err){
                logger.error(err);
                return callback(err, null);
            }else if(resources.length === 0){
                // nothing like this can be found; therefore, we can be sure that there is nothing to consider
                logger.log("Resource with given identifier and resourceType does not exist.",
                    {
                        identifier: identifier,
                        resourceType: resourceType
                    });
                return callback(null, null);
            } else if(firstPage && lastPage){
                // something could be found and firstPage and lastPage are given; therefore, the identifier relates to the parent; we have to retrieve the children and check their page numbers (dependent resource)
                async.map(resources, function(parent, callback){
                    // retrieve children of this thing
                    mongoBr.where('partOf', parent._id)
                        .exec(function (err, children) {
                            if(err){
                                logger.error(err);
                                callback(err, null);
                            }else if(children.length === 0) {
                                callback(null, null);
                            }else {
                                for(var child of children){
                                    var child = new BibliographicResource(child);
                                    for(var embodiment of child.getResourceEmbodimentsForType(child.type)){
                                        if(embodiment.firstPage === firstPage && embodiment.lastPage === lastPage){
                                            return callback(null, [child, parent]);
                                        }
                                    }
                                }
                                callback(null, null);
                            }
                        });
                }, function(err, matches){
                    for(var match of matches){
                        if(match !== null){
                            logger.log("Resource with given identifier and resourceType, firstPage, lastPage does exist.",
                                {
                                    identifier: identifier,
                                    resourceType: resourceType,
                                    firstPage: firstPage,
                                    lastPage: lastPage
                                });
                            return callback(null, match);
                        }
                    }
                    logger.log("Resource with given identifier and resourceType, firstPage, lastPage does not exist.",
                        {
                            identifier: identifier,
                            resourceType: resourceType,
                            firstPage: firstPage,
                            lastPage: lastPage
                        });
                    return callback(null, null);
                });
            }else{
                // first page and last page are not given; therefore, the identifier relates directly to the resource; we have a match (independent resource)!
                logger.log("Resource with given identifier and resourceType does exist.",
                    {
                        identifier: identifier,
                        resourceType: resourceType
                    });
                return callback(null, resources);
            }
        }
    );
};

DatabaseHelper.prototype.transformIdentifiers = function(identifiers){
    var literalValues = [];
    for(var identifier of identifiers){
        literalValues.push(identifier.literalValue);
    }
    return literalValues;
};


DatabaseHelper.prototype.createResourceIfNotExists = function(br, callback){
    // I should check the identifiers --> some preferred ones, such as DOI, ISSN, SWB_PPN, OLC_PPN,
    // but also some additional properties depending on the resource type, .. propaply for journals/ journal Issues, I should chekc all number properties

    var self = this;
    var identifiers = self.transformIdentifiers(br.getIdentifiersForType(br.type));
    var title = br.getTitleForType(br.type);
    var number = br.getNumberForType(br.type);
    var edition = br.getEditionForType(br.type);
    var propertyPrefix = br.getPropertyPrefixForType(br.type);

    if(br.type === enums.resourceType.journalIssue){
        var volumeNumber = br.getNumberForType(enums.resourceType.journalVolume);
        var journalTitle = br.getTitleForType(enums.resourceType.journal);
        var journalIdentifiers = self.transformIdentifiers(br.getIdentifiersForType(enums.resourceType.journal));

        mongoBr//.where(propertyPrefix.concat("title"), title)
            .where(propertyPrefix.concat("number"), number)
            //.where(propertyPrefix.concat("edition"), edition)
            //.all(propertyPrefix.concat("identifiers.literalValue"), identifiers)
            .where("journalVolume_number", volumeNumber)
            .where("journal_title", journalTitle)
            .all("journal_identifiers.literalValue", journalIdentifiers)
            .exec(function (err, docs) {
                if (docs && docs.length !== 0){
                    logger.log('Br exists: ', docs[0]._id);
                    return callback(null, docs[0]);
                }else{
                    br = new mongoBr(br);
                    br.save(function(err, res){
                        if(err){
                            logger.log(err);
                        }
                        return callback(null, res);
                    });
                }
            });
    }else{
        mongoBr.where(propertyPrefix.concat("title"), title)
            .where(propertyPrefix.concat("number"), number)
            .where(propertyPrefix.concat("edition"), edition)
            .all(propertyPrefix.concat("identifiers.literalValue"), identifiers)
            .exec(function (err, docs) {
                if (docs.length !== 0){
                    logger.log('Br exists: ', docs[0]._id);
                    return callback(null, docs[0]);
                }else{
                    br = new mongoBr(br);
                    br.save(function(err, res){
                        if(err){
                            logger.log(err);
                        }
                        return callback(null, res);
                    });
                }
            });
    }
};

DatabaseHelper.prototype.convertSchemaResourceToMongoose = function(schemaResource, callback){
    var id = schemaResource._id;
    if(typeof id !== "string"){
        id = id.toString();
    }
    return mongoBr.findById(schemaResource._id, function(err, br){
        if(err){
            logger.error(err);
            return callback(err, null);
        }
        for(var property in schemaResource.toObject()){
            br[property] = schemaResource.toObject()[property];
        }
        return callback(null, br);
    });
};


DatabaseHelper.prototype.setScanStatus = function(id, status, name, callback){
    var self = this;

    // check if id is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.error("Invalid value for parameter id.", {id: id});
        return callback(new Error("Invalid value for parameter id."), null);
    }

    return self.createSimpleEqualsConditions('embodiedAs', id, '.scans._id', function(err,conditions) {
        if (err) {
            logger.error(err);
            return callback(new Error("Something weird happened."), null);
        }
        return mongoBr.findOne({'$or': conditions}, function (err, br) {
            // do error handling
            if (err) {
                logger.error(err);
                return callback(err, null);
            } else if (!br) {
                logger.error("No entry found for parameter id.", {id: id});
                return callback(null, null);
            }
            var embodiments = new BibliographicResource(br).getResourceEmbodimentsForType(br.type);
            for (var embodiment of embodiments) {
                for (var scan of embodiment.scans) {
                    if (scan._id == id) {
                        // set the status
                        scan.status = status;
                        // set also the scan name if it is given
                        if(name){
                            scan.scanName = name;
                        }
                        var embodimentIndex = embodiments.indexOf(embodiment);
                        var scanIndex = embodiment.scans.indexOf(scan);
                        embodiments[embodimentIndex].scans[scanIndex] = scan;
                        var helperBr = new BibliographicResource(br);
                        helperBr.setResourceEmbodimentsForType(br.type, embodiments);
                        return self.convertSchemaResourceToMongoose(helperBr, function (err, br) {
                            return br.save(function (err, res) {
                                if (err) {
                                    logger.error(err);
                                    return callback(err, null);
                                }
                                return callback(null, [br,scan]);
                            });
                        });
                    }
                }
            }
        });
    });
};


DatabaseHelper.prototype.saveReferencesPageForResource = function(resource, binaryFile, textualPdf, stringFile, embodimentType, callback){
    var self = this;
    if(binaryFile && textualPdf !== undefined){
        //2a. A binary file is given; We also need to have the information if it's a textual pdf; Save it
        self.saveScan(binaryFile, textualPdf, function(err, scan){
            if(err){
                logger.error(err);
                return callback(err,null);
            }
            self.saveScanInResourceEmbodiment(resource, scan, embodimentType, function(err, resource){
                // 3. We saved the file and we modified the br accordingly; Now we need to save it in mongo
                self.convertSchemaResourceToMongoose(resource, function(err, resource){
                    if (err) {
                        logger.error(err);
                        return callback(err, null)
                    }
                    resource.save(function(err, resource){
                        if(err){
                            logger.error(err);
                            return callback(err,null);
                        }
                        return callback(null,[resource, scan]);
                    });
                });
            });
        });
    }else if(stringFile) {
        //2b. A string file is given; Save it
        self.saveStringScan(stringFile, function (err, scan) {
            if (err) {
                logger.error(err);
                return callback(err, null);
            }
            self.saveScanInResourceEmbodiment(resource, scan, embodimentType, function (err, resource) {
                // 3. We saved the file and we modified the br accordingly; Now we need to save it in mongo
                self.convertSchemaResourceToMongoose(resource, function(err, resource) {
                    if (err) {
                        logger.error(err);
                        return callback(err, null)
                    }
                    resource.save(function (err, resource) {
                        if (err) {
                            logger.error(err);
                            return callback(err, null)
                        }
                        return callback(null, [resource, scan]);
                    });
                });
            });
        });
    }else{
        return callback(new Error("Information missing.", null));
    }
};


DatabaseHelper.prototype.saveStringScan = function(scan, callback){
    // get unique id from mongo which we use as filename
    var scanId = mongoose.Types.ObjectId().toString();

    ocrHelper.saveStringFile(scanId, scan, function (err, scanName) {
        // if there is an error, log it and return
        if (err) {
            logger.error(err);
            return callback(err, null)
        }
        // if not, create a scan object
        var scan = new Scan({_id: scanId, scanName: scanName, status: enums.status.notOcrProcessed, textualPdf: false});

        // return scan object to the caller
        return callback(null, scan);
    });
};


DatabaseHelper.prototype.saveScanInResourceEmbodiment = function(resource, scan, embodimentType, callback){
    // check whether embodiment of type embodimentType already exists in resource
    var resource = new BibliographicResource(resource);
    for(var embodiment of resource.getResourceEmbodimentsForType(resource.type)){
        if(embodiment.type === embodimentType || embodimentType == undefined){
            // a matching embodiment was found; save scan and return resource
            embodiment.scans.push(scan);
            return callback(null, resource);
        }
    }
    // a matching embodiment type was not found; create a new one and return the resource
    var embodiment = new ResourceEmbodiment({type: embodimentType, scans: [scan]});
    resource.pushResourceEmbodimentForType(resource.type, embodiment);
    return callback(null, resource);
};


DatabaseHelper.prototype.curateHierarchy = function(resources, callback){
    var parent = resources[1];
    var child = resources[0];
    var self = this;
    // create the parent if it does not exist
    self.createResourceIfNotExists(parent, function (err, parent) {
        if(err){
            logger.error(err);
            return callback(err, null);
        }
        if(parent === null){
           logger.error("Something went wrong with retrieving the parent");
           return callback(err, null);
        }
        // res should be the mongo instance of the parent
        // set the child partOf accordingly
        child.partOf = parent._id.toString();
        // can the child already exist? No, otherwise we wouldn't have checked correctly in the very beginning
        // save the child
        child = new mongoBr(child);
        child.save(function(err, child){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            return callback(err, [child, parent]);
        });
    });
};

// TODO: This is not used so far
DatabaseHelper.prototype.retrieveParent = function(child, callback){
    if(child.partOf && child.partOf != ""){
        mongoBr.findById(child.partOf, function(err, parent){
            if(err){
                logger.error(err);
                return callback(err, null)
            }
            if(parent){
                return callback(null, parent);
            }else{
                return callback(null, null);
            }
        });
    }else{
        return callback(null, null);
    }
};

DatabaseHelper.prototype.createSimpleEqualsConditions = function(propertyStem, value, extension, callback){
    var helper = new BibliographicResource();
    var stemProperties = helper.getPropertyForTypes(propertyStem, helper.getAllTypes());
    var conditions = [];
    for(var stemProperty of stemProperties){
        if(extension){
            stemProperty = stemProperty + extension;
        }

        var condition = {};
        condition[stemProperty] = value;
        conditions.push(condition);
    }
    return callback(null, conditions);
};


DatabaseHelper.prototype.retrieveToDos = function(status, callback){
    var self = this;
    if(status === enums.status.ocrProcessed || status === enums.status.ocrProcessing || status === enums.status.notOcrProcessed) {
        self.createSimpleEqualsConditions('embodiedAs', status, '.scans.status', function(err,conditions){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            return mongoBr.find({'$or': conditions}, function (err, children) {
                if (err) {
                    logger.error(err);
                    return callback(err, null);
                }
                return self.mapChildrenAndParents(children, function(err, result){
                    if (err) {
                        logger.error(err);
                        return callback(err, null);
                    }
                    return callback(null, result);
                });

            });
        });
    }else if (status == enums.status.external){
        // this case applies only to electronic journals at the moment and only if there is no scan uploaded yet
        mongoBr.find({'status': status}, function (err, children) {
            if (err) {
                logger.error(err);
                return callback(err, null);
            }
            return self.mapChildrenAndParents(children, function(err, result){
                if (err) {
                    logger.error(err);
                    return callback(err, null);
                }
                return callback(null, result);
            });
        });
    }
};


DatabaseHelper.prototype.mapChildrenAndParents = function(children, callback){
    var resultArray = [];
    var resultObject;
    for (var child of children) {
        // check here whether it is really a child
        if (child.partOf) {
            // this applies to dependent resources
            var alreadyIn = false;
            if (resultArray.length !== 0) {
                for (var i of resultArray) {
                    if (i._id == child.partOf) {
                        alreadyIn = true;
                        resultObject = i;
                        break;
                    } else {
                        resultObject = {};
                        resultObject._id = child.partOf;
                        resultObject.children = [];
                    }
                }
            } else {
                resultObject = {};
                resultObject._id = child.partOf;
                resultObject.children = [];
            }
            var resultChild = child.toObject();

            if (!resultObject.children) {
                resultObject.children = [];
            }
            resultObject.children.push(resultChild);
            if (!alreadyIn) {
                resultArray.push(resultObject);
            }
        } else {
            // This applies to independent resources
            var resultObject = child.toObject();
            resultArray.push(child);
        }
    }
    // add additional information for displaying it to the user
    async.map(resultArray, function (parent, callback) {
        // check first whether it is really a parent
        if (parent.children) {
            mongoBr.findOne({'_id': parent._id}, function (err, br) {
                if (err) {
                    logger.error(err);
                    return callback(err, null)
                }
                if (!br) {
                    return callback(null, parent);
                }
                // copy all properties
                for(var k in br.toObject()){
                    parent[k] = br.toObject()[k];
                }
                callback(null, parent);
            });
        } else {
            callback(null, parent);
        }
    }, function (err, res) {
        return callback(err, res);
    });
};


/**
 * Factory function
 *
 * @returns {DatabaseHelper}
 */
function createDatabaseHelper() {
    return new DatabaseHelper();
}

module.exports = {
    createDatabaseHelper : createDatabaseHelper
};