// Jobs
// ====
// The scheduled tasks setup
// and startup script.
const Agenda = require('agenda');
const config = require('./../../config/config');
const mongoUri = "mongodb://" + config.DB.HOST + ":" + config.DB.PORT + "/" + config.DB.SCHEMA;
const suggestionHelper = require('./../helpers/suggestionHelper').createSuggestionHelper();

var agenda = new Agenda({db: {address: mongoUri, collection: 'agenda'}});

agenda.define('precalculate suggestions', function(job, done) {
    var br = job.attrs.data.br;
    suggestionHelper.precalculateExternalSuggestions(br, function(err,res){
       if(err){
           logger.error(err);
       }
    });
});

agenda.on('ready', function() {
    agenda.start();
});




module.exports = agenda;