/**
 * Created by anlausch on 5/18/2017.
 */
var mongoose = require('mongoose');

// We save no salt according to https://codahale.com/how-to-safely-store-a-password/
module.exports = mongoose.model('user',{
    username: String,
    password: String,
    feeds: [{
        name: String,
        url: String
    }]
});
