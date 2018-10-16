const winston = require('winston');

const level = process.env.LOG_LEVEL || 'debug';

const logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: level,
            timestamp: function () {
                return (new Date()).toISOString();
            }
        }),
        new winston.transports.File({
            filename: 'error.log',
            level: 'error',
            timestamp: function () {
                return (new Date()).toISOString();
            }
        }),
        new winston.transports.File({
            filename: 'info.log',
            level: 'info',
            timestamp: function () {
                return (new Date()).toISOString();
            }
        }),
    ]
});

module.exports = logger;

module.exports.streamInfo = {
    write: function(message, encoding){
        logger.info(message);
    }
};
module.exports.streamError = {
    write: function(message, encoding){
        logger.error(message);
    }
};