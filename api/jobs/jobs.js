// Jobs
// ====
// The scheduled tasks setup
// and startup script.
const Agenda = require('agenda');
const config = require('./../../config/config');
const logger = require('./../util/logger');
const mongoUri = "mongodb://" + config.DB.HOST + ":" + config.DB.PORT + "/" + config.DB.SCHEMA;
const agenda = new Agenda({db: {address: mongoUri, collection: 'agenda'}});
const util = require('util');

require('./precalculateSuggestions')(agenda);
require('./extractReferences')(agenda);


agenda.on('ready', function() {
    agenda.start();
});

// Error reporting and retry logic
agenda.on('fail', function(err, job) {

    var extraMessage = '';

    if (job.attrs.failCount >= 2) {

        extraMessage = util.format('too many failures, giving up');

    } else if (shouldRetry(err)) {

        job.attrs.nextRunAt = secondsFromNowDate(2);

        extraMessage = util.format('will retry in %s seconds at %s',
            2, job.attrs.nextRunAt.toISOString());

        job.save();
    }

    if (process.env.NODE_ENV !== 'test') {
        logger.error('Agenda job [%s] %s failed with [%s] %s failCount:%s',
            job.attrs.name, job.attrs._id, err.message || 'Unknown error', extraMessage, job.attrs.failCount);
    }

});

function shouldRetry(err) {

    // Retry on connection errors as they may just be temporary
    if (/(ECONNRESET|ECONNREFUSED)/.test(err.message)) {
        return false;
    }
    return false;
}

function secondsFromNowDate(seconds) {
    return new Date(new Date().getTime() + (seconds * 1000));
}




module.exports = agenda;