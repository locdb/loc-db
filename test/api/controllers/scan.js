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
          
          it('should save a scan in the file system and create a br in the db', function(done) {
            request(server)
              .post('/saveScan')
              .type('form')
              .field('ppn', '400433052')
              .attach('scan', './test/api/data/ocr_example_1/0001.png')
              //.attach('xml', './test/api/data/ocr_example_1/Output021511065733891448X_Verf_Literatruverz.pdf-14.png.xml')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                should.not.exist(err);
                res.body.should.have.property("title", "The handbook of the neuropsychology of language");
                res.body.should.have.property("scans");
                res.body.scans.should.be.Array;
                done();
              });
          });
      });
      
      describe('GET /getNotOcrProcessedScans', function() {
          
          it('should retrieve one br', function(done) {
            request(server)
              .get('/getNotOcrProcessedScans')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                should.not.exist(err);
                res.body.should.be.Array;
                res.body.should.have.lengthOf(1);
                res.body[0].should.have.property("scans");
                res.body[0].scans.should.be.Array;
                res.body[0].scans.should.have.lengthOf(1);
                done();
              });
          });
      });
  });
});
