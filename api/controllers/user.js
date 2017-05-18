/**
 * Created by anlausch on 5/18/2017.
 */
'use strict';
const passport = require('./../util/passport.js');
const User = require('./../models/user.js');
const bcrypt = require('bcrypt');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;

// Generates hash using bCrypt
var createHash = function(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
}

function signup(req, res){
    var username = req.swagger.params.username.value;
    var password = req.swagger.params.password.value;
    var findOrCreateUser = function(){
        // find a user in Mongo with provided username
        User.findOne({'username':username},function(err, user) {
            // In case of any error return
            if (err){
                return errorlog.error(err);
            }
            // already exists
            if (user) {
                errorlog.error('User already exists');
                return res.json("User already exists.");
            } else {
                // if there is no user with that email
                // create the user
                var newUser = new User();
                // set the user's local credentials
                newUser.username = username;
                newUser.password = createHash(password);

                // save the user
                newUser.save(function(err) {
                    if (err){
                        errorlog.error(err);
                        return res.json('Error in Saving user: ' + err);
                    }
                    accesslog.log('User Registration successful');
                    return res.json(newUser);
                });
            }
        });
    };

    // Delay the execution of findOrCreateUser and execute
    // the method in the next tick of the event loop
    process.nextTick(findOrCreateUser);
}

function login(req, res){
    res.json("User logged in.");
}

module.exports = {
    signup: signup,
    login: login
};