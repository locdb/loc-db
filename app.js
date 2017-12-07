'use strict';

const SwaggerExpress = require('swagger-express-mw');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const app = require('express')();
const mongoose = require('mongoose');
const logger = require('./api/util/logger.js');
const cors = require('cors');



module.exports = app; // for testing

var db = mongoose.connection;

db.on('error', console.error);
db.once('open', function() {
    logger.info("DB successfully opened.")
});

// Configuring Passport
var passport = require('./api/util/passport.js');
var expressSession = require('express-session');
//app.use(expressSession({secret: 'mySecretKey'}));
//app.use(passport.initialize());
//app.use(passport.session());

//var config = process.argv.indexOf("test") > 0 ? require("./test/api/config.js") : require("./config/config.js");
var config = require("./config/config.js");

if(process.argv.indexOf("test" >0)){
    config = Object.assign(config, require("./test/api/config.js"));
}

logger.info("Running config:", {config : JSON.stringify(config)});

var uri = "mongodb://" + config.DB.HOST + ":" + config.DB.PORT + "/" + config.DB.SCHEMA;

mongoose.connect(uri);

var swaggerDocument = yaml.safeLoad(fs.readFileSync('./api/swagger/swagger.yaml', 'utf8'));
swaggerDocument.host = config.HOST;
swaggerDocument.basePath = config.BASEPATH;
swaggerDocument.securityDefinitions = null;
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, false, {validatorUrl : null, }));

SwaggerExpress.create({appRoot: __dirname, securityHandlers: {
    basicAuth: function (req, authOrSecDef, callback){
        passport.isAuthenticated(req, req.res, callback);
    },
    login: function (req, authOrSecDef, callback){
        passport.authenticate('local', function (err, user, info) {
            if (err) {
                callback(new Error('Error in passport authenticate'));
            } else if (!user) {
                callback(new Error('Failed to authenticate'));
            } else {
                req.user = user;
                callback();
            }
        })(req, null, callback);
    }
}}, function(err, swaggerExpress) {
    if (err) { throw err; }
    app.use(expressSession({secret: 'mySecretKey'}));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(cors({origin: "http://localhost:4200", credentials: true}));
    swaggerExpress.register(app);
    app.listen(config.PORT);
});