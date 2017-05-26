const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const enums = require('./../../../api/schema/enum.json');
const User = require('./../../../api/models/user');
const setup = require('./../setup').createSetup();

describe('controllers', function() {

  describe.only('user', function() {
      before(function(done) {
          setup.dropDB();
          done();
      });
      
      after(function(done) {
          setup.dropDB();
          done();
      });

      var user = {
          username: "Anne",
          password: "Test"
      };
      
      describe('POST /signup', function(){

          it('should signup a user', function(done){
              request(server)
                  .post('/signup')
                  .send(user)
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.be.an.Object();
                      done();
                  });
          });

          it('should not signup a user as the user is already registered', function(done){
              request(server)
                  .post('/signup')
                  .send(user)
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(400)
                  .end(function(err, res){
                      should.not.exist(err);
                      done();
                  });
          });
      });

      describe('POST /login', function(){
          it('should login a user', function(done){
              request(server)
                  .post('/login')
                  .send(user)
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.be.an.Object();
                      done();
                  });
          });

          it('should not login a user as the password is wrong', function(done){

              user.password = "Wrong";

              request(server)
                  .post('/login')
                  .send(user)
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(403)
                  .end(function(err, res){
                      should.not.exist(err);
                      done();
                  });
          });

          it('should not login a user as the user does not exist', function(done){

              user.username = "Wrong";

              request(server)
                  .post('/login')
                  .send(user)
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(403)
                  .end(function(err, res){
                      should.not.exist(err);
                      done();
                  });
          });
      });
  });
});
