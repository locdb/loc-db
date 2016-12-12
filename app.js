'use strict';

const SwaggerExpress = require('swagger-express-mw');
const SwaggerUi = require('swagger-tools/middleware/swagger-ui');
const app = require('express')();
const mongoose = require('mongoose');
module.exports = app; // for testing

var db = mongoose.connection;

// TODO: Add logging mechanisms
db.on('error', console.error);
db.once('open', function() {
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

  var port = process.env.PORT || 10010;
  app.listen(port);
});
