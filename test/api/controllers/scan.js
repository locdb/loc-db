const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();

describe('controllers', function() {

  describe('scan', function() {
      
      before(function(done) {
          setup.loadBibliographicResources();
          done();
      });
      
      after(function(done) {
          setup.dropDB();
          done();
      });
      
      
      describe('POST /saveScan', function() {
          
          it.only('save a file in the file system', function(done) {
            request(server)
              .post('/saveScan')
              .type('form')
              //.send({ppn: '400433052'})
              .attach('image', './test/api/data/ocr_example_1/0001.png')
              .attach('xml', './test/api/data/ocr_example_1/Output021511065733891448X_Verf_Literatruverz.pdf-14.png.xml')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                should.not.exist(err);
                done();
              });
          });
      });
  });
});
