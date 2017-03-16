const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();
const status = require('./../../../api/schema/enum.json').status;


describe.skip('controllers', function() {

  describe('bibliographicEntry', function() {
      
      before(function(done) {
          setup.loadBibliographicResources();
          done();
      });
      
      after(function(done) {
          setup.dropDB();
          done();
      });
      
      
      describe('GET /getOcrProcessedBibliographicEntries', function() {
          
          it('should return a list of not ocr processed bibliographic entries', function(done) {
            request(server)
              .get('/getOcrProcessedBibliographicEntries')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                should.not.exist(err);
                res.body.should.be.Array;
                done();
              });
          });
      });
  });
});
