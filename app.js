'use strict';

const SwaggerExpress = require('swagger-express-mw');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
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

//var config = process.argv.indexOf("test") > 0 ? require("./test/api/config.js") : require("./config/config.js");
var config = require("./config/config.js");

if(process.argv.indexOf("test" >0)){
    config = Object.assign(config, require("./test/api/config.js"));
}

accesslog.info("Running config:", {config : JSON.stringify(config)});

var uri = "mongodb://" + config.DB.HOST + ":" + config.DB.PORT + "/" + config.DB.SCHEMA;

mongoose.connect(uri);

var swaggerDocument = yaml.safeLoad(fs.readFileSync('./api/swagger/swagger.yaml', 'utf8'));
swaggerDocument.host = config.HOST;
swaggerDocument.basePath = config.BASEPATH;
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, false, {validatorUrl : null}));

SwaggerExpress.create({appRoot: __dirname}, function(err, swaggerExpress) {
    if (err) { throw err; }
    // Allow CORS
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        next();
    });

    // install middleware
    swaggerExpress.register(app);
    app.listen(config.PORT);
});
