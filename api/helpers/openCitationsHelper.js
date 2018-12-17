'use strict';

const BibliographicResourceOC = require('./../schema/bibliographicResourceOpenCitations.js');
const BibliographicResource = require('./../schema/bibliographicResource.js');
const logger = require('./../util/logger');
const mongoose = require('mongoose');
const async = require('async');

var OpenCitationsHelper = function(){
};

OpenCitationsHelper.prototype.convertInternalBR2OC = function(br, callback){
    var self = this;
    // conversion for access to helper functions
    var br = new BibliographicResource(br);

    if(br.partOf && br.partOf != ""){
        // The resource is a child resource; we can directly map it to a single br
        self._convertInternalBR2OCSimple(br, null, function(err, child){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            return callback(null, [child]);
        });
    }else{
        // The resource is a container resource; we have to create 1-3 brs out of it
        // the most lower level resource is the one associated with the type
        self._convertInternalBR2OCSimple(br, null, function(err, lowest){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            // at this point in time, at most 2 levels are left to convert
            // we should now collect the types and guess the order
            var types = br.getAllTypesOfThis();

            var index = types.indexOf(lowest.type);
            if (index > -1) {
                types.splice(index, 1);
            }
            // if the types array is now of length 0, we are done
            // else we have to specify the order of the two types correctly
            // important: we need artificial identifiers
            if(types.length === 0){
                return callback(null, [lowest]);
            }else {
                async.map(types, function (type, cb) {
                        self._convertInternalBR2OCSimple(br, type, function (err, br) {
                            if (err) {
                                logger.error(err);
                                return cb(err, null);
                            }
                            return cb(null, br);
                        });
                    },
                    function (err, brs) {
                        if (err) {
                            logger.error(err);
                            return callback(err, null);
                        }
                        // create artificial ids for all of them
                        for(var br of brs){
                            br._id = mongoose.Types.ObjectId();
                        }
                        if (brs.length === 1) {
                            // create artificial ids for all of
                            lowest.partOf = brs[0]._id;
                            return callback(null, [lowest, brs[0]]);
                        } else if (brs.length === 2) {
                            // decide the order!!!!
                            var container1 = br.getContainerTypeForType(brs[0].type);
                            var container2 = br.getContainerTypeForType(brs[1].type);
                            if (container1[0] === brs[1].type) {
                                // types 1 is the parent
                                brs[0].partOf = brs[1]._id;
                                lowest.partOf = brs[0]._id;
                                return callback(null, [lowest, brs[0], brs[1]]);
                            } else if (container2[0] === brs[0].type) {
                                // types 0 is the parent
                                brs[1].partOf = brs[0]._id;
                                lowest.partOf = brs[1]._id;
                                return callback(null, [lowest, brs[1], brs[0]]);
                            } else if (container1.length > 1 && container1[1] === brs[1].type) {
                                // types 1 is the parent
                                brs[0].partOf = brs[1]._id;
                                lowest.partOf = brs[0]._id;
                                return callback(null, [lowest, brs[0], brs[1]]);
                            } else if (container2.length > 1 && container2[1] === brs[0].type) {
                                // types 0 is the parent
                                brs[1].partOf = brs[0]._id;
                                lowest.partOf = brs[1]._id;
                                return callback(null, [lowest, brs[1], brs[0]]);
                            } else if (container1.length > 2 && container1[2] === brs[1].type) {
                                // types 1 is the parent
                                brs[0].partOf = brs[1]._id;
                                lowest.partOf = brs[0]._id;
                                return callback(null, [lowest, brs[0], brs[1]]);
                            } else if (container2.length > 2 && container2[2] === brs[0].type) {
                                // types 0 is the parent
                                brs[1].partOf = brs[0]._id;
                                lowest.partOf = brs[1]._id;
                                return callback(null, [lowest, brs[1], brs[0]]);
                            } else {
                                // arbitrary order
                                logger.error("Problems deciding order of types: " + types);
                                // types 1 is the parent
                                brs[0].partOf = brs[1]._id;
                                lowest.partOf = brs[0]._id;
                                return callback(null, [lowest, brs[0], brs[1]]);
                            }

                        }else{
                            return callback(new Error("Problem with conversion."), null);
                        }
                    }
                );
            }
        });
    }
};


OpenCitationsHelper.prototype._convertInternalBR2OCSimple = function(br, type, callback){
    var types = br.getAllTypes();
    if(!type || types.indexOf(type) === -1){
        var ocBr = new BibliographicResourceOC({
            identifiers: br.getIdentifiersForType(br.type),
            type: br.type,
            title: br.getTitleForType(br.type),
            subtitle: br.getSubtitleForType(br.type),
            edition: br.getEditionForType(br.type),
            number: br.getNumberForType(br.type),
            contributors: br.getContributorsForType(br.type),
            publicationDate: br.getPublicationDateForType(br.type),
            status: br.status,
            cites: br.cites,
            partOf: br.partOf,
            parts: br.parts,
            embodiedAs: br.getResourceEmbodimentsForType(br.type),
        });
    }else{
        var ocBr = new BibliographicResourceOC({
            identifiers: br.getIdentifiersForType(type),
            type: type,
            title: br.getTitleForType(type),
            subtitle: br.getSubtitleForType(type),
            edition: br.getEditionForType(type),
            number: br.getNumberForType(type),
            contributors: br.getContributorsForType(type),
            publicationDate: br.getPublicationDateForType(type),
            embodiedAs: br.getResourceEmbodimentsForType(type),
        });
    }

    return callback(null, ocBr);
};


/**
 * Factory function
 *
 * @returns {OpenCitationsHelper}
*/
function createOpenCitationsHelper() {
    return new OpenCitationsHelper();
}


module.exports = {
        createOpenCitationsHelper : createOpenCitationsHelper
};