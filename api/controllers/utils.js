/**
 * Created by anlausch on 11/27/2017.
 */
'use strict';
const logger = require('./../util/logger.js');
const solrHelper = require('./../helpers/solrHelper').createSolrHelper();


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

function get(req, res){
    var response = res;
    var query = req.swagger.params.query.value;
    solrHelper.queryK10plusByQueryString(query, function(err,res){
        if(err){
            return response.json(err);
        }
        return response.json(res);
    });

}


module.exports = {
    log: log,
    get: get
};