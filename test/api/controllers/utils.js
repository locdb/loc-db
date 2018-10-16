const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup').createSetup();

var agent = request.agent(server);

describe('controllers', function () {
    describe('utils', function () {

        before(function (done) {
            setup.dropDB(function(err){
                setup.login(agent, function(err, res){
                    if(err) return done(err);
                    done();
                });
            });
        });

        after(function (done) {
            setup.dropDB(function(err){
                done();
            });
        });


        describe('POST /log', function () {
                it('should log something', function (done) {
                    var logObject = {logObject: {message: "This should be logged"}};
                    agent
                        .post('/log')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send(logObject)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            should.not.exist(err);
                            done();
                        });
                });

            it('should log something', function (done) {
                var logObject = {testing: "This should be logged", action_performed: {click: "test"}};
                agent
                    .post('/log')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send(logObject)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });

            it('should log something even if logged out', function (done) {
                setup.logout(agent, function(err, res){
                    if(err) return done(err);
                    var logObject = {testing: "I am not logged in"};
                    agent
                        .post('/log')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send(logObject)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            should.not.exist(err);
                            done();
                        });
                });
            });
        });

        describe.only('GET /stats', function () {
            it('should get statistics', function (done) {
                agent
                    .get('/stats')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });
        });
    });
});
