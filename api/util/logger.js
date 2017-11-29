const winston = require('winston');
const winstonRotator = require('winston-daily-rotate-file');

const consoleConfig = [
  new winston.transports.Console({
    'colorize': true
  })
];

const customLevels = {
    levels: {
        evaluation: 0
    }
};

const createLogger = new winston.Logger({
  'transports': consoleConfig
});

const createEvaluationLogger = new winston.Logger({
    'levels': customLevels.levels,
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

const evaluationLogger = createEvaluationLogger;
evaluationLogger.add(winstonRotator, {
    'name': 'evaluation-file',
    'level': 'evaluation',
    'filename': './log/evaluation.log',
    'json': false,
    'datePattern': 'yyyy-MM-dd',
    'prepend': true
});

module.exports = {
  'accesslog': accessLogger,
  'errorlog': errorLogger,
  'evaluationlog': evaluationLogger
};