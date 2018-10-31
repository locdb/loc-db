'use strict';

const SwaggerExpress = require('swagger-express-mw');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const app = require('express')();
const mongoose = require('mongoose');
const logger = require('./api/util/logger.js');
const cors = require('cors');
const morgan = require('morgan');
const agendash = require('agendash');
const agenda = require('./api/jobs/jobs');


module.exports = app; // for testing
mongoose.set('debug', function (collectionName, method, query, doc){
    logger.info("MONGOOSE", collectionName + "." + method + "(" + JSON.stringify(query) + ")");
});
let db = mongoose.connection;

db.on('error', console.error);
db.once('open', function() {
    logger.info("DB successfully opened.")
});

// Configuring Passport
let passport = require('./api/util/passport.js');
const expressSession = require('express-session');
const MongoStore = require('connect-mongo')(expressSession);

let config = require("./config/config.js");

if(process.argv.indexOf("test") > 0 ){
    config = Object.assign(config, require("./test/api/config.js"));
}

logger.info("Running config:", {config : JSON.stringify(config)});

let uri = "mongodb://" + config.DB.HOST + ":" + config.DB.PORT + "/" + config.DB.SCHEMA;

//mongoose.connect(uri);
const options = {
    useNewUrlParser: true,
    //useCreateIndex: true,
    //useFindAndModify: false,
    //autoIndex: false, // Don't build indexes
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 500, // Reconnect every 500ms
    poolSize: 10, // Maintain up to 10 socket connections
    // If not connected, return errors immediately rather than waiting for reconnect
    bufferMaxEntries: 0,
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4,// Use IPv4, skip trying IPv6
    useMongoClient: true
};

//     global.Promise;
mongoose.Promise = require('bluebird');
mongoose.connect(uri, options);

let swaggerDocument = yaml.safeLoad(fs.readFileSync('./api/swagger/swagger.yaml', 'utf8'));
swaggerDocument.host = config.HOST;
swaggerDocument.basePath = config.BASEPATH;
swaggerDocument.securityDefinitions = null;
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, false, {validatorUrl : null, }));
app.use('/agendash', agendash(agenda));

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
    app.use(expressSession({secret: 'mySecretKey', resave: false, saveUninitialized: false, store: new MongoStore({mongooseConnection: mongoose.connection })}));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(cors({origin: "http://localhost:4200", credentials: true}));

    // enable http logging
    morgan.token('username', function (req, res) {
        return req.user ? req.user.username : "";
    });

    morgan.token('userid', function (req, res) {
        return req.user ? req.user._id : "";
    });

    morgan.token('body', function (req, res) {
        return req.body ? JSON.stringify(req.body) : "";
    });

    app.use(morgan(':method :url :status :response-time ms - :res[content-length] - :username :userid - :body',{
        skip: function (req, res) {
            return res.statusCode < 400
        }, stream: logger.streamError
    }));

    app.use(morgan(':method :url :status :response-time ms - :res[content-length] - :username :userid - :body',{
        skip: function (req, res) {
            return res.statusCode >= 400
        }, stream: logger.streamInfo
    }));

    swaggerExpress.register(app);
    app.listen(config.PORT);
});