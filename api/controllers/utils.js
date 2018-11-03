/**
 * Created by anlausch on 11/27/2017.
 */
'use strict';
const logger = require('./../util/logger.js');
const solrHelper = require('./../helpers/solrHelper').createSolrHelper();
const crossrefHelper = require('./../helpers/crossrefHelper').createCrossrefHelper();
const swbHelper = require('./../helpers/swbHelper').createSwbHelper();
const ocHelper = require('./../helpers/openCitationsHelper').createOpenCitationsHelper();
const async = require('async');
const mongoBr = require('./../models/bibliographicResource').mongoBr;
const statsHelper = require('./../helpers/statsHelper').createStatsHelper();
const fileHelper = require('./../helpers/fileHelper').createFileHelper();
const config = require('./../../config/config.js');
const fs = require('fs');

function log(req, res){
    var response = res;
    var logObject = req.swagger.params.logObject.value;
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
    logObject._ip = ip;
    logObject._user = req.user ? {username: req.user.username, userid: req.user._id.toString()} : "USER_UNKNOWN";
    logger.info("EVALUATION_LOG", logObject);
    return response.json({message: "Logging suceeded."});
}

function getK10Plus(req, res){
    var response = res;
    var query = req.swagger.params.query.value;
    solrHelper.queryK10plusByQueryString(query, function(err,res){
        if(err){
            logger.error(err);
            return response.json(err);
        }
        logger.log(res);
        return response.json(res);
    });
}

function getGVI(req, res){
    var response = res;
    var query = req.swagger.params.query.value;
    solrHelper.queryGVIByQueryString(query, function(err,res){
        if(err){
            logger.error(err);
            return response.json(err);
        }
        logger.log(res);
        return response.json(res);
    });
}

function getCrossref(req, res){
    var response = res;
    var query = req.swagger.params.query.value;
    crossrefHelper.query(query, function(err,res){
        if(err){
            logger.error(err);
            return response.json(err);
        }
        logger.log(res);
        return response.json(res);
    });
}

function getSWB(req, res){
    var response = res;
    var query = req.swagger.params.query.value;
    swbHelper.queryByQueryString(query, function(err,res){
        if(err){
            logger.error(err);
            return response.json(err);
        }
        logger.log(res);
        return response.json(res);
    });
}

function getOC(req, res){
    var response = res;
    var query = req.swagger.params.query.value;
    ocHelper.queryByQueryString(query, function(err,res){
        if(err){
            logger.error(err);
            return response.json(err);
        }
        logger.log(res);
        return response.json(res);
    });
}

function loadBibliographicResources(req, res){
    var file = req.swagger.params.file.value;
    var brs = JSON.parse(file.buffer.toString('utf8'));
    async.each(brs, function(br, cb){
        br = new mongoBr(br);
        br.save(function(err, result){
            if(err){
                logger.error(err);
                return cb(err);
            }else{
                return cb(null);
            }
        })
    }, function(err){
        if(err){
            logger.error(err);
            return res.status(500).json(err);
        }else{
            return res.status(200).json("Successfully loaded BRs into DB");
        }
    });
}

function triggerStats(req, response){
    response.status(200).json("Stats computation triggered.");
    async.series([
        function(cb){
            statsHelper.brStats(function(err,res){
                cb(err, res);
            });
        },
        function(cb){
            statsHelper.mandatoryFieldsStats(function(err,res){
                cb(err, res);
            });
        },
        // function(cb){
        //     statsHelper.logStats(function(err,res){
        //         cb(err, res);
        //     });
        // },
    ], function(err, res){
        if(err){
            return logger.error(err);
        }
        fileHelper.saveStringFile("stats", JSON.stringify(res), ".json", function(err, res){
            return res;
        });
    });
}

function stats(req, response){
    let fileName = "stats.json";
    let filePath = config.PATHS.UPLOAD + "/" + fileName;

    // Check if file specified by the filePath exists
    fs.exists(filePath, function(exists){
        if (exists) {
            let rawdata = fs.readFileSync(filePath);
            let data = JSON.parse(rawdata);
            return response.json(data);
        } else {
            response.writeHead(400, {"Content-Type": "text/plain"});
            return response.end("ERROR File does not exist");
        }
    });
}


module.exports = {
    log: log,
    getK10Plus: getK10Plus,
    getGVI: getGVI,
    getCrossref: getCrossref,
    getSWB: getSWB,
    getOC: getOC,
    loadBibliographicResources: loadBibliographicResources,
    stats: stats,
    triggerStats: triggerStats
};