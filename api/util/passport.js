/**
 * Created by anlausch on 5/18/2017.
 */

'use strict';
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./../models/user.js');
const bcrypt = require('bcrypt');
const errorlog = require('./logger').errorlog;
const accesslog = require('./logger').accesslog;

passport.serializeUser(function(user, done) {
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

var isValidPassword = function(user, password){
    return bcrypt.compareSync(password, user.password);
}

// passport/login.js
passport.use(new LocalStrategy({
        passReqToCallback : true
    },
    function(req, username, password, done) {
        // check in mongo if a user with username exists or not
        User.findOne({ 'username' :  username },
            function(err, user) {
                // In case of any error, return using the done method
                if (err)
                    return done(err);
                // Username does not exist, log error & redirect back
                if (!user){
                    errorlog.error('User not found:', {username: username, password: password});
                    return done(null, false);
                }
                // User exists but wrong password, log the error
                if (!isValidPassword(user, password)){
                    errorlog.error('Invalid Password:', {username: username, password: password});
                    return done(null, false);
                       // req.res.json('Invalid Password'));
                }
                // User and password both match, return user from
                // done method which will be treated like success
                req.login(user, function(error) {
                    if (error) return next(error);
                    accesslog.log("Request Login supossedly successful.");
                    return done(null, user);
                });

            }
        );
    })
);

passport.isAuthenticated = function(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();
    // if they aren't redirect them to the home page
    res.status(401).json('Not authenticated.');
};

module.exports = passport;