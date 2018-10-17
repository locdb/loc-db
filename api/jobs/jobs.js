// Jobs
// ====
// The scheduled tasks setup
// and startup script.
const Agenda = require('agenda');
const config = require('./../../config/config');
const logger = require('./../util/logger');
const mongoUri = "mongodb://" + config.DB.HOST + ":" + config.DB.PORT + "/" + config.DB.SCHEMA;
const agenda = new Agenda({db: {address: mongoUri, collection: 'agenda'}});
const MongoClient = require('mongodb').MongoClient;
const util = require('util');

require('./precalculateSuggestions')(agenda);
require('./extractReferences')(agenda);


agenda.on('ready', function() {
    agenda.unlockAgendaJobs(function(err, res){
        if(err){
            logger.error(err);
        }
        agenda.start();
    });
    //agenda.start();

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

/**
 * Attempt to unlock Agenda jobs that were stuck due server restart
 * See https://github.com/agenda/agenda/issues/410
 */
agenda.unlockAgendaJobs = function (callback) {
    logger.info('Attempting to unlock locked Agenda jobs...');

    // Use connect method to connect to the server
    MongoClient.connect(mongoUri, function (err, client) {
        if (err) {
            logger.error(err);
            return callback(err);
        }

        var agendaJobs = client.db().collection('agenda');

        agendaJobs.update({
            lockedAt: {
                $exists: true
            },
            lastFinishedAt: {
                $exists: false
            }
        }, {
            $unset: {
                lockedAt: undefined,
                lastModifiedBy: undefined,
                lastRunAt: undefined
            },
            $set: {
                nextRunAt: new Date()
            }
        }, {
            multi: true
        }, function (err, numUnlocked) {
            if (err) {
                logger.error(err);
            }
            logger.info('[Worker] Unlocked %d Agenda jobs.', numUnlocked);
            client.close(callback);
        });

    });
};



module.exports = agenda;