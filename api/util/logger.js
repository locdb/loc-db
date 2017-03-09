const winston = require('winston');
const winstonRotator = require('winston-daily-rotate-file');

const consoleConfig = [
  new winston.transports.Console({
    'colorize': true
  })
];

const createLogger = new winston.Logger({
  'transports': consoleConfig
});

const accessLogger = createLogger;
accessLogger.add(winstonRotator, {
  'name': 'access-file',
  'level': 'info',
  'filename': './log/access.log',
  'json': false,
  'datePattern': 'yyyy-MM-dd',
  'prepend': true
});

const errorLogger = createLogger;
errorLogger.add(winstonRotator, {
  'name': 'error-file',
  'level': 'error',
  'filename': './log/error.log',
  'json': false,
  'datePattern': 'yyyy-MM-dd',
  'prepend': true
});

module.exports = {
  'accesslog': accessLogger,
  'errorlog': errorLogger
};