/**
 * Created by anlausch on 5/18/2017.
 */
var mongoose = require('mongoose');

module.exports = mongoose.model('user',{
    username: String,
    password: String
});
