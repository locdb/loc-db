const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();
const status = require('./../../../api/schema/enum.json').status;


describe('controllers', function() {

  describe('bibliographicEntry', function() {
      
      before(function(done) {
          setup.loadBibliographicEntry();
          done();
      });
      
      after(function(done) {
          setup.dropDB();
          done();
      });
      
      
      describe('GET /getToDoBibliographicEntries', function() {
          
          it('should return a list of not ocr processed bibliographic entries of length 54', function(done) {
              request(server)
                  .get('/getToDoBibliographicEntries')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res) {
                      console.log(res.body)
                      should.not.exist(err);
                      res.body.should.be.Array;
                      res.body.should.have.lengthOf(54);
                      for(var be of res.body){
                          be.should.have.property("status", status.ocrProcessed);
                      }
                      done();
                  });
          });

          it('should return a list of not ocr processed bibliographic entries by scanId of length 53', function(done) {
              var scanId = "58cb91fa5452691cd86bc940";
              request(server)
                  .get('/getToDoBibliographicEntries')
                  .query({scanId: "58cb91fa5452691cd86bc940"})
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res) {
                      console.log(res.body)
                      should.not.exist(err);
                      res.body.should.be.Array;
                      res.body.should.have.lengthOf(53);
                      for(var be of res.body){
                          be.should.have.property("scanId", scanId);
                          be.should.have.property("status", status.ocrProcessed);
                      }
                      done();
                  });
          });

          it('should return a list of not ocr processed bibliographic entries by scanId of length 1', function(done) {
              var scanId = "58cb91fa5452691cd86bc941";
              request(server)
                  .get('/getToDoBibliographicEntries')
                  .query({scanId: scanId})
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res) {
                      console.log(res.body);
                      should.not.exist(err);
                      res.body.should.be.Array;
                      res.body.should.have.lengthOf(1);
                      res.body[0].should.have.property("bibliographicEntryText", "TEST ENTRY 1");
                      res.body[0].should.have.property("status", status.ocrProcessed);
                      res.body[0].should.have.property("scanId", scanId);
                      done();
                  });
          });
      });
  });
});
