// Jobs
// ====
// The scheduled tasks setup
// and startup script.
const Agenda = require('agenda');
const config = require('./../../config/config');
const logger = require('./../util/logger');
const mongoUri = "mongodb://" + config.DB.HOST + ":" + config.DB.PORT + "/" + config.DB.SCHEMA;
const agenda = new Agenda({db: {address: mongoUri, collection: 'agenda'}});

require('./precalculateSuggestions')(agenda);
require('./extractReferences')(agenda);


agenda.on('ready', function() {
    agenda.start();
});




module.exports = agenda;