'use strict';

const SwaggerExpress = require('swagger-express-mw');
const SwaggerUi = require('swagger-tools/middleware/swagger-ui');
const app = require('express')();
const mongoose = require('mongoose');
const winston = require('winston');

module.exports = app; // for testing

//winston.level = process.env.LOG_LEVEL;
winston.level = 'info';
winston.log('info', 'Winston is logging.', {  
    level: winston.level
});

var db = mongoose.connection;

// TODO: Improve logging mechanisms
db.on('error', console.error);
db.once('open', function() {
    winston.log('info', 'DB opended.');
  // Create your schemas and models here.
});

// TODO: Is there a better solution to this?
var config = process.argv.indexOf("test") > 0 ? require("./test/api/config.json") : require("./config/config.json");
var uri = "mongodb://" + config.db.host + ":" + config.db.port + "/" + config.db.schema;

mongoose.connect(uri);

SwaggerExpress.create({appRoot: __dirname}, function(err, swaggerExpress) {
  if (err) { throw err; }
  
  // add swagger-ui
  app.use(SwaggerUi(swaggerExpress.runner.swagger));
  
  // install middleware
  swaggerExpress.register(app);

  var port = process.env.PORT || 80;
  app.listen(port);
  
});
