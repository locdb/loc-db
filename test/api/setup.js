"use strict";
const config = require("./config.js");
const mongoose = require('mongoose');
const br = require('./../../api/models/bibliographicResource.js').mongoBr;
const brSuggestions = require('./../../api/models/bibliographicResourceSuggestions.js').mongoBrSuggestions;
const user = require('./../../api/models/user.js');
const signup = require('./../../api/controllers/user.js').findOrCreateUser;
const dataBibliographicResource = require('./data/bibliographicResource');
const dataBookChapter = require('./data/bookChapter.json');
const dataBibliographicEntry = require('./data/bibliographicEntry');
const dataToDo = require('./data/todo.json');
const dataSearch = require('./data/searchEngine.json');
const nock = require('nock');
const async = require('async');


var Setup = function(){};


Setup.prototype.loadBibliographicResources = function(cb){
        async.each(dataBibliographicResource, function(bibliographicResource, callback){
            var bibliographicResource = new br(bibliographicResource);
            bibliographicResource.save(function(err, res){
                if(err) console.log(err);
                bibliographicResource.on('es-indexed', function(err, res){
                    if (err) console.log(err);
                    console.log('es-indexed');
                    callback(err,bibliographicResource);
                });
            });
        }, function(err, results) {
            console.log("Data loaded");
            return cb(err, results);
        });

};

Setup.prototype.loadBookChapter = function(cb){
    async.each(dataBookChapter, function(bibliographicResource, callback){
        var bibliographicResource = new br(bibliographicResource);
        bibliographicResource.save(function(err, res){
            if(err) console.log(err);
            bibliographicResource.on('es-indexed', function(err, res){
                if (err) console.log(err);
                console.log('es-indexed');
                callback(err,bibliographicResource);
            });
        });
    }, function(err, results) {
        console.log("Data loaded");
        return cb(err, results);
    });

};


Setup.prototype.loadBibliographicEntry = function(cb){
        async.each(dataBibliographicEntry, function(bibliographicResource, callback){
            var bibliographicResource = new br(bibliographicResource);
            bibliographicResource.save(function(err, res){
                if(err) console.log(err);
                bibliographicResource.on('es-indexed', function(err, res){
                    if (err) console.log(err);
                    callback(err, bibliographicResource);
                });
            });
        }, function(err, results) {
            cb(err, results);
        });

};

Setup.prototype.loadAdditionalToDo = function(cb){
    async.each(dataToDo, function(bibliographicResource, callback){
        var bibliographicResource = new br(bibliographicResource);
        bibliographicResource.save(function(err, res){
            if(err) console.log(err);
            bibliographicResource.on('es-indexed', function(err, res){
                // this event idicates, that elasticsearch has received the indexing request,
                // but according to [1] it only refreshes once per second, so the new elems might not be indexed yet
                // [1] https://github.com/elastic/elasticsearch-js/issues/231
                if (err) console.log(err);
                callback(err, bibliographicResource);
            });
        });
    }, function(err, results) {
        cb(err, results);
    });
};

Setup.prototype.loadSearchData = function(cb){
    var parent = new br(dataSearch[0]);
    parent.save(function (err, parent) {
        if (err) return console.log(err);
        var id = parent._id.toString();

        var child = new br(dataSearch[1]);
        child.partOf = id;
        child.save(function (err, child) {
            if (err) return console.log(err);
            child.on('es-indexed', function (err, res) {
                if (err) console.log(err);
                console.log('es-indexed');
                return cb(err, res);
            });
        });
    });
};

Setup.prototype.mockOCRFileUpload = function(){
    nock("https://locdb-dev.opendfki.de")
        .post('/fileupload/')
        .replyWithFile(200, __dirname + '/data/ocr_data/ocrOutput.xml')
        .persist();
};

Setup.prototype.mockOCRError = function(){
    nock("https://locdb-dev.opendfki.de")
        .post('/fileupload/')
        .reply('500');
};


Setup.prototype.mockOCRGetImage = function(){
    nock("https://locdb-dev.opendfki.de")
        .post('/getimage/')
        .replyWithFile(200, __dirname + '/data/ocr_data/references.png')
        .persist();
};

Setup.prototype.mockGVI = function(){
    nock("http://gvi.bsz-bw.de")
        .get('/solr/GVI/select')
        .query({q: 'allfields:test', rows:10, wt:'json'})
        .replyWithFile(200, __dirname + '/data/gvi/queryTest.txt')
        .persist();
};

Setup.prototype.mockGVISuggestions = function(){
    nock("http://gvi.bsz-bw.de")
        .get('/solr/GVI/select')
        .query(function(actualQueryObject){
            if(actualQueryObject.q.indexOf("test") == -1 ) { //|| actualQueryObject.q.indexOf("crime") !== -1 || actualQueryObject.q.indexOf("Campuses") !== -1 || actualQueryObject.q.indexOf("Demokratie") !== -1){
                return true;
            }
            //}else{
            //    return false;
            //}
        })
        .replyWithFile(200, __dirname + '/data/gvi/querySuggestions.txt')
        .persist();
};

Setup.prototype.mockK10Plus = function(){
    nock("http://findex.gbv.de")
        .get('/index/180/select')
        .query({q: 'allfields:test', rows:5, wt:'json'})
        .query(function(actualQueryObject){
            //if(actualQueryObject.q.indexOf("Hannah") !== -1 || actualQueryObject.q.indexOf("crime") !== -1 || actualQueryObject.q.indexOf("Campuses") !== -1 || actualQueryObject.q.indexOf("Demokratie") !== -1){
            return true;
            //}else{
            //    return false;
            //}
        })
        .replyWithFile(200, __dirname + '/data/k10plus/queryTest.txt')
        .persist();
};

Setup.prototype.mockK10PlusSuggestions = function(){
    nock("http://findex.gbv.de")
        .get('/index/180/select')
        .query(function(actualQueryObject){
            if(actualQueryObject.q.indexOf("test") == -1 ) { //|| actualQueryObject.q.indexOf("crime") !== -1 || actualQueryObject.q.indexOf("Campuses") !== -1 || actualQueryObject.q.indexOf("Demokratie") !== -1){
                return true;
            }
            //}else{
            //    return false;
            //}
        })
        .replyWithFile(200, __dirname + '/data/k10plus/querySuggestions.txt')
        .persist();
};


Setup.prototype.dropDB = function(callback){
    brSuggestions.remove({}, function(err) {
        console.log('Collection BR removed');
        br.remove({}, function (err) {
            console.log('Collection BR removed');
            br.esTruncate(function (err) {
                console.log('Elastic BR index cleaned.');
                user.remove({}, function (err) {
                    console.log('Collection User removed');
                    callback(err)
                });
            });
        });
    });
};


Setup.prototype.login = function(agent,callback){
    var dummy = {
        username: "dummy",
        password: "dummy"
    };

    signup(dummy.username, dummy.password, function(err, res){
        if(err){
            console.log(err);
            agent
                .post('/login')
                .send(dummy)
                .end(function (err, res) {
                    if(err){
                        return callback(err, null);
                    }
                    return callback(null, agent);
                });
        }
        else{
            agent
                .post('/login')
                .send(dummy)
                .end(function (err, res) {
                    if(err){
                        return callback(err, null);
                    }
                    return callback(null, agent);
                });
        }
    });
};


Setup.prototype.logout = function(agent,callback){
    agent
        .get('/logout')
        .end(function (err, res) {
            if(err){
                return callback(err, null);
            }
            return callback(null, agent);
        });
};

function createSetup(){
    return new Setup();
}


module.exports = {
        createSetup : createSetup
};
