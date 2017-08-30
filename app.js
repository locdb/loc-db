'use strict';

const SwaggerExpress = require('swagger-express-mw');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const app = require('express')();
const mongoose = require('mongoose');
const errorlog = require('./api/util/logger.js').errorlog;
const accesslog = require('./api/util/logger.js').accesslog;
const cors = require('cors')



module.exports = app; // for testing

var db = mongoose.connection;

db.on('error', console.error);
db.once('open', function() {
    accesslog.info("DB successfully opened.")
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

accesslog.info("Running config:", {config : JSON.stringify(config)});

var uri = "mongodb://" + config.DB.HOST + ":" + config.DB.PORT + "/" + config.DB.SCHEMA;

mongoose.connect(uri);

var swaggerDocument = yaml.safeLoad(fs.readFileSync('./api/swagger/swagger.yaml', 'utf8'));
swaggerDocument.host = config.HOST;
swaggerDocument.basePath = config.BASEPATH;
swaggerDocument.securityDefinitions = null;
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, false, {validatorUrl : null, }));
// Allow CORS
//app.use(function(req, res, next) {
//    res.setHeader("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
//    res.setHeader("Access-Control-Allow-Credentials", "true");
//    next();
//});

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
    app.options('*',cors({credentials: true, origin: "http://localhost:4200"})); // include before other routes
    app.get('*',cors({credentials: true, origin: "http://localhost:4200"}));
    app.post('*',cors({credentials: true, origin: "http://localhost:4200"}));
    app.put('*',cors({credentials: true, origin: "http://localhost:4200"}));
    app.delete('*',cors({credentials: true, origin: "http://localhost:4200"}));
    app.use(expressSession({secret: 'mySecretKey'}));
    app.use(passport.initialize());
    app.use(passport.session());
    swaggerExpress.register(app);
    app.listen(config.PORT);
});
