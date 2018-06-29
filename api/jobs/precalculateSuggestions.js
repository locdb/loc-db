/**
 * Created by anlausch on 29.06.2018.
 */
const suggestionHelper = require('./../helpers/suggestionHelper').createSuggestionHelper();
const logger = require('./../util/logger');

module.exports = function(agenda) {
    agenda.define('precalculate suggestions', function(job, done) {
        var br = job.attrs.data.br;
        suggestionHelper.precalculateExternalSuggestions(br, function(err,res){
            if(err){
                logger.error(err);
                return done(err);
            }
            return done();
        });
    });

};