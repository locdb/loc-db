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

var config = process.argv.indexOf("test") > 0 ? require("./test/api/config.json") : require("./config/config.json");
var uri = "mongodb://" + config.db.host + ":" + config.db.port + "/" + (process.env.SCHEMA || config.db.schema);

mongoose.connect(uri);

var swaggerDocument = yaml.safeLoad(fs.readFileSync('./api/swagger/swagger.yaml', 'utf8'));

// hack for making port mapping work with swagger ui
if(process.env.PORT_MAPPED === "true" && process.env.NODE_ENV === "production"){
    swaggerDocument.basePath = "/locdb";
}else if (process.env.PORT_MAPPED === "true" && process.env.NODE_ENV === "development"){
    swaggerDocument.basePath = "/locdb-dev";
}



swaggerDocument.host = process.env.HOST || "localhost";
var options = {
    validatorUrl : null
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, false, options));

SwaggerExpress.create({appRoot: __dirname}, function(err, swaggerExpress) {
    if (err) { throw err; }
    // Allow CORS
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        next();
    });

    // install middleware
    swaggerExpress.register(app);

    var port = process.env.PORT || 80;
    app.listen(port);
});
