/**
 * Created by anlausch on 29.06.2018.
 */
const ocrHelper = require('./../helpers/ocrHelper').createOcrHelper();
const logger = require('./../util/logger');

module.exports = function(agenda) {
    agenda.define('extract references', function(job, done) {
        var scan = job.attrs.data.scan;
        var id = job.attrs.data.id;
        var br = job.attrs.data.br;
        ocrHelper.triggerOcrProcessing(scan, id, br, function(err,res){
            if(err){
                logger.error(err);
                return done(err);
            }

            agenda.now('precalculate suggestions', {br: res}, function(err,res){
                if(err){
                    logger.error(err);
                    return done(err);
                }
                return done();
            });
        });
    });
};