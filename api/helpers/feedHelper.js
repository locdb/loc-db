/**
 * Created by anlausch on 8/18/2017.
 */
'use strict';
const request = require('request');
const Feedparser = require('feedparser');
const logger = require('./../util/logger.js');
const async = require('async');
const FeedEntry = require('./../schema/feedEntry');

var FeedHelper = function(){
};


FeedHelper.prototype.fetchMultiple = function(feeds, callback){
    var self = this;
    async.map(feeds, self.fetchSingle, function(err, results) {
        if(err){
            logger.log(err);
            return callback(err, null);
        }
        else{
            return callback(null, results);
        }
        console.log(results);
    });
};


FeedHelper.prototype.fetchSingle = function(feed, callback){
    var self = this;
    // Define our streams
    var req = request(feed.url, {timeout: 10000});
    var feedparser = new Feedparser({normalize: true, addmeta:true});
    var posts = [];

    // Define our handlers
    req.on('error', function(err, callback){
        logger.error(err);
        return callback(null, err);
    });

    req.on('response', function(res) {
        // And boom goes the dynamite
        res.pipe(feedparser);
    });

    feedparser.on('error', function(err, callback){
        logger.error(err);
        return callback(null, err);
    });
    feedparser.on('end', function(){
        return callback(null, posts);
    });

    feedparser.on('readable', function() {
        var post;

        while (post = this.read()) {
            post = new FeedEntry(post);
            posts.push(post);
        }
    });
};

/*FeedHelper.prototype.handleErrors = function(err, callback){
   logger.error(err);
   return callback(null, err);
};*/

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