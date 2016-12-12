const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();

describe('controllers', function() {

  describe('bibliographicResource', function() {
      
      before(function(done) {
          setup.loadBibliographicResources();
          done();
      });
      
      after(function(done) {
          setup.dropDB();
          done();
      });
      
      
      describe('GET /bibliographicResources', function(){
          it('should return a list of bibliographic Resources of length 1', function(done){
              request(server)
                  .get('/bibliographicResources')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.be.an.Array();
                      res.body.should.have.length(1);
                      done();
                  });
          });
      });
      
      
      describe('GET /createBibliographicResourceByPPN', function() {
          
          it('should return a new bibliographic resouce', function(done) {
            request(server)
              .get('/createBibliographicResourceByPPN')
              .query({ ppn: '400433052'})
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                should.not.exist(err);
                res.body.should.not.be.Array();
                res.body.should.have.property("title");
                res.body.title.should.equal("The handbook of the neuropsychology of language");
                done();
              });
          });
          
          it('should return an error', function(done) {
              request(server)
                .get('/createBibliographicResourceByPPN')
                .query({ ppn: ''})
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                  should.exist(err);
                  done();
                });
            });

      });
      
      describe('GET /bibliographicResources', function(){
          it('should return a list of bibliographic Resources of length 2', function(done){
              request(server)
                  .get('/bibliographicResources')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.be.an.Array();
                      res.body.should.have.length(2);
                      done();
                  });
          });
      });
  });

});
