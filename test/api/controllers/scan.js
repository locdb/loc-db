const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();
const status = require('./../../../api/schema/enum.json').status;


describe('controllers', function() {

  describe.only('scan', function() {
      var id = "58c01713ea3c8d32f0f80a75";
      
      before(function(done) {
          setup.loadBibliographicResources();
          setup.mockOcrServer();
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
              .field('pages', '2-3')
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
                id = res.body[0].scans[0]._id;
                res.body[0].scans.should.be.Array;
                res.body[0].scans.should.have.lengthOf(1);
                done();
              });
          });
      });
      
      describe('GET /triggerOcrProcessing', function() {
          
          it('should trigger OCR processing', function(done) {
            request(server)
              .get('/triggerOcrProcessing')
              .query({ id: id })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                console.log(res.body);
                should.not.exist(err);
                res.body.should.not.be.Array;
                res.body.should.have.property("_id");
                res.body.should.have.property("title", "The handbook of the neuropsychology of language");
                res.body.should.have.property("publicationYear", 2012);
                res.body.should.have.property("scans");
                res.body.should.have.property("parts");
                res.body.scans.should.be.Array;
                res.body.scans.should.have.lengthOf(1);
                res.body.parts.should.be.Array;
                res.body.parts.should.have.lengthOf(53);
                res.body.scans[0].status.should.be.exactly(status.ocrProcessed);
                res.body.parts[0].should.have.property("coordinates");
                res.body.parts[0].should.have.property("bibliographicEntryText");
                //res.body.parts[0].should.have.property("xmlName");
                res.body.parts[0].should.have.property("scanId");
                done();
              });
          });
      });
      
      describe('GET /getOcrProcessedScans', function() {
          
          it('should retrieve one br', function(done) {
            request(server)
              .get('/getOcrProcessedScans')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                should.not.exist(err);
                res.body.should.be.Array;
                res.body.should.have.lengthOf(1);
                res.body[0].should.have.property("scans");
                id = res.body[0].scans[0]._id;
                res.body[0].scans.should.be.Array;
                res.body[0].scans.should.have.lengthOf(1);
                done();
              });
          });
      });
      
      describe('GET /get', function() {
          
          it('should retrieve a file', function(done) {
            request(server)
              .get('/scans/' + id)
              .set('Accept', 'image/png')
              .expect('Content-Type', 'image/png')
              .expect(200)
              .end(function(err, res) {
                console.log(res.body);
                should.not.exist(err);
                done();
              });
          });
      });
  });
});
