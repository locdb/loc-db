/**
 * Created by anlausch on 11/27/2017.
 */
'use strict';
const logger = require('./../util/logger.js');



function log(req, res){
    var response = res;
    var logObject = req.swagger.params.logObject.value;
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
    logObject.status="EVALUATION";
    logObject.ip = ip;
    logObject.user = req.user ? {username: req.user.username, userid: req.user._id.toString()} : "";
    logger.info(logObject);
    return response.json({message: "Logging suceeded."});
}


module.exports = {
    log: log
};