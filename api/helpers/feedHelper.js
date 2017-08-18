/**
 * Created by anlausch on 8/18/2017.
 */
'use strict';
const request = require('request');
const Feedparser = require('feedparser');
const errorlog = require('./../util/logger.js').errorlog;

var FeedHelper = function(){
};


FeedHelper.prototype.fetchSingle = function(feedUrl, callback){
    var self = this;
    // Define our streams
    var req = request(feedUrl, {timeout: 10000});
    var feedparser = new Feedparser();
    var posts = [];

    // Define our handlers
    req.on('error', self.handleErrors);

    req.on('response', function(res) {
        // And boom goes the dynamite
        res.pipe(feedparser);
    });

    feedparser.on('error', self.handleErrors);
    feedparser.on('end', function(){
        return callback(null, posts);
    });

    feedparser.on('readable', function() {
        var post;

        while (post = this.read()) {
            posts.push(post);
        }
    });
};

FeedHelper.prototype.handleErrors = function(err, callback){
   errorlog.error(err);
   return callback(null, err);
};

/**
 * Factory function
 *
 * @returns {FeedHelper}
 */
function createFeedHelper() {
    return new FeedHelper();
}


module.exports = {
    createFeedHelper : createFeedHelper
};