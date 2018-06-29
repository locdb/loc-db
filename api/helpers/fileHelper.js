/**
 * Created by anlausch on 9/8/2017.
 */

'use strict';
const fs = require('fs');
const fileType = require('file-type');
const logger = require('./../util/logger.js');
const config = require('./../../config/config.js');

var FileHelper = function(){
};

FileHelper.prototype.saveBinaryFile = function(fileName, fileBuffer, callback){
    var fileExtension = fileType(fileBuffer).ext;
    var fileName = fileName + '.' + fileExtension;

    if (!fs.existsSync(config.PATHS.UPLOAD)){
        logger.info("Create dir", {name: config.PATHS.UPLOAD});
        fs.mkdir(config.PATHS.UPLOAD, function(err, res){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            fs.writeFile(config.PATHS.UPLOAD + fileName, fileBuffer, 'binary', function(err){
                if(err){
                    logger.error(err);
                    return callback(err, null);
                }
                return callback(null, fileName);
            });
        });
    }else{
        fs.writeFile(config.PATHS.UPLOAD + fileName, fileBuffer, 'binary', function(err){
            if(err){
                logger.error(err);
                return callback(err, null);
            }
            return callback(null, fileName);
        });
    }
};

FileHelper.prototype.saveStringFile = function(fileName, fileString, callback){
    fs.writeFile(config.PATHS.UPLOAD + fileName, fileString, 'utf-8', function(err){
        if(err){
            logger.error(err);
            return callback(err, null)
        }
        callback(null,null);
    });
};

/**
 * Factory function
 *
 * @returns {FileHelper}
 */
function createFileHelper() {
    return new FileHelper();
}

module.exports = {
    createFileHelper : createFileHelper
};