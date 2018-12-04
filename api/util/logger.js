const winston = require('winston');
const level = require('./../../config/config').LOG_LEVEL;
const file = require('./../../config/config').LOG_FILE;


const logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: level,
            timestamp: function () {
                return (new Date()).toISOString();
            }
        }),
        new winston.transports.File({
            filename: file,
            level: level,
            timestamp: function () {
                return (new Date()).toISOString();
            }
        })
    ]
});

logger.streamInfo = {
    write: function(message, encoding){
        logger.info(message);
    }
};
logger.streamError = {
    write: function(message, encoding){
        logger.error(message);
    }
};

module.exports = logger;

