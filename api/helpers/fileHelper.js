/**
 * Created by anlausch on 9/8/2017.
 */

'use strict';
const fs = require('fs');
const fileType = require('file-type');
const logger = require('./../util/logger.js');
const config = require('./../../config/config.js');
const path = require('path');
//const extract = require('extract-zip');
const unzip = require('node-unzip-2');
const fstream = require('fstream');

var FileHelper = function(){
};

FileHelper.prototype.getAbsolutePath = function(pathName){
    return path.resolve(config.PATHS.UPLOAD, pathName);
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

FileHelper.prototype.saveStringFile = function(fileName, fileString, fileExtension, callback){
    fileName = fileName + fileExtension;
    fs.writeFile(config.PATHS.UPLOAD + fileName, fileString, 'utf-8', function(err){
        if(err){
            logger.error(err);
            return callback(err, null)
        }
        return callback(null, fileName);
    });
};

FileHelper.prototype.readFilesFromDir = function(dir, callback){
    fs.readdir(dir, function (err, files) {
        //handling error
        if (err) {
            logger.error(err);
            return callback(err, null);
        }
        return callback(null, files);
    });
};

FileHelper.prototype.extractZip = function(sourceDir, targetDir, callback){
    var self = this;
    targetDir = self.getAbsolutePath(targetDir);
    sourceDir = self.getAbsolutePath(sourceDir + ".zip");
    //if (!fs.existsSync(targetDir)){
    //    fs.mkdirSync(targetDir);
    //}

    //var readStream = fs.createReadStream(sourceDir);
    //var writeStream = fstream.Writer(targetDir);

    fs.createReadStream(sourceDir)
        .pipe(unzip.Extract({ path: targetDir }))
        .on('error', function(err, res){
            return callback(err, res)
        })
        .on('close', function(err, res) {
            return callback(err, res)
        }
    );


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