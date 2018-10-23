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
            // res is now the result token, we actually don't need to job this
            // now we need a new job for polling
            if(res.indexOf("<LOCDBViewResults>") > -1){
                // the result was already cached by the ocr component, we can reuse it
                // we have the data and should start post-processing
                return ocrHelper.processOcrResult(scan, id, br, res, function(err, res){
                    if(err){
                        logger.error(err);
                        return done(err);
                    }else{
                        // this should then be done later
                        agenda.now('precalculate suggestions', {br: res});
                        return done();
                    }
                });
            }else{
                // if the result is not cached by the reference extraction component, we start polling
                agenda.every('2 minutes', 'poll reference extraction', {token: res, scan: scan, id: id, br: br});
                return done();
            }
        });
    });

    agenda.define('poll reference extraction',  {priority: 'high'}, function(job, done) {
        var scan = job.attrs.data.scan;
        var id = job.attrs.data.id;
        var br = job.attrs.data.br;
        var token = job.attrs.data.token;

        // Here we need a new function now, that just asks the component for results with a certain token
        return ocrHelper.getReferenceExtractionResults(token, function(err,res){
            if(err){
                logger.error(err);
                return done(err);
            }
            var content = res[0];
            var status = res[1];
            if(status == 202){
                // we need to continue polling
                return done();
            }else{
                // we have the data and should start post-processing
                return ocrHelper.processOcrResult(scan, id, br, content, function(err, res){
                    if(err){
                        logger.error(err);
                        return done(err);
                    }else{
                        // this should then be done later
                        return agenda.now('precalculate suggestions', {br: res}, function(err,res){
                            if(err){
                                logger.error(err);
                                done(err);
                                // job.remove(); removes the job completely; we would rather like to go with something softer
                                //return job.disable(); does not seem to work
                                return job.remove();
                            }
                            done();
                            return job.remove();
                        });
                    }
                });
            }
        });
    });
};