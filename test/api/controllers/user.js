const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup').createSetup();

var dummyUser = request.agent(server);
var dummyUser2 = request.agent(server);

describe('controllers', function () {

    describe.only('user', function () {
        before(function (done) {
            setup.dropDB(function(err){
                done();
            });
        });

        after(function (done) {
            setup.dropDB(function(err){
                done();
            });
        });

        var user = {
            username: "Anne",
            password: "Test"
        };

        describe('POST /signup', function () {

            it('should signup a user', function (done) {
                request(server)
                    .post('/signup')
                    .send(user)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.not.have.property("password");
                        res.body.should.be.an.Object();
                        done();
                    });
            });

            it('should not signup a user as the user is already registered', function (done) {
                request(server)
                    .post('/signup')
                    .send(user)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });
        });

        describe('POST /login', function () {
            it('should login a user', function (done) {
                dummyUser
                    .post('/login')
                    .send(user)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.an.Object();
                        res.body.should.not.have.property("password");
                        done();
                    });
            });

            it('user should now be able to access a service', function (done) {
                dummyUser
                    .get('/bibliographicResources')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });

            it('another user should still be unable to access a protected endpoint', function (done) {
                dummyUser2
                    .get('/bibliographicResources')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(401)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });

            it('should not login a user as the password is wrong', function (done) {

                user.password = "Wrong";

                request(server)
                    .post('/login')
                    .send(user)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(403)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });

            it('should not login a user as the user does not exist', function (done) {

                user.username = "Wrong";

                request(server)
                    .post('/login')
                    .send(user)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(403)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });
        });

        describe('POST /addFeed', function() {
            it('should add a feed object to the user', function (done) {

                var feed = {
                    name: "Tagesschau",
                    url: "http://www.tagesschau.de/xml/rss2"
                };

                dummyUser
                    .post('/addFeed')
                    .send(feed)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.ok;
                        res.body.should.have.property("feeds");
                        res.body.feeds.should.be.Array;
                        res.body.feeds.should.have.lengthOf(1);
                        res.body.feeds[0].should.have.property("name", "Tagesschau");
                        res.body.feeds[0].should.have.property("url", "http://www.tagesschau.de/xml/rss2");
                        done();
                    });
            });

            it('should add another feed object to the user', function (done) {

                var feed = {
                    name: "Die Zeit",
                    url: "http://newsfeed.zeit.de/index"
                };

                dummyUser
                    .post('/addFeed')
                    .send(feed)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.ok;
                        res.body.should.have.property("feeds");
                        res.body.feeds.should.be.Array;
                        res.body.feeds.should.have.lengthOf(2);
                        res.body.feeds[1].should.have.property("name", "Die Zeit");
                        res.body.feeds[1].should.have.property("url", "http://newsfeed.zeit.de/index");
                        done();
                    });
            });

            it('should not add the same feed object to user again', function (done) {

                var feed = {
                    name: "Die Zeit2",
                    url: "http://newsfeed.zeit.de/index"
                };

                dummyUser
                    .post('/addFeed')
                    .send(feed)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });
        });

        describe('GET /logout', function() {
            it('should logout a user', function (done) {
                dummyUser
                    .get('/logout')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });

            it('user should not be able to access a protected endpoint anymore', function (done) {
                dummyUser
                    .get('/bibliographicResources')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(401)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });
        });
    });
});
