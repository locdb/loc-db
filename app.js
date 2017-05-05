'use strict';

const SwaggerExpress = require('swagger-express-mw');
//const SwaggerUi = require('swagger-tools/middleware/swagger-ui');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
//const swaggerDocument = require('./api/swagger/swagger.yaml');

const app = require('express')();
const mongoose = require('mongoose');
const errorlog = require('./api/util/logger.js').errorlog;
const accesslog = require('./api/util/logger.js').accesslog;

module.exports = app; // for testing

var db = mongoose.connection;

db.on('error', console.error);
db.once('open', function() {
    accesslog.info("DB successfully opened.")
});

// TODO: Is there a better solution to this?
var config = process.argv.indexOf("test") > 0 ? require("./test/api/config.json") : require("./config/config.json");
var uri = "mongodb://" + config.db.host + ":" + config.db.port + "/" + config.db.schema;

mongoose.connect(uri);

var swaggerDocument = yaml.safeLoad(fs.readFileSync('./api/swagger/swagger.yaml', 'utf8'));

SwaggerExpress.create({appRoot: __dirname}, function(err, swaggerExpress) {
    if (err) { throw err; }

    // add swagger-ui
    //app.use(SwaggerUi(swaggerExpress.runner.swagger));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // install middleware
    swaggerExpress.register(app);

    var port = process.env.PORT || 80;
    app.listen(port);

});
