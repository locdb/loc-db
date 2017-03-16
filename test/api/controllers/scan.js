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
          
          it('should save a scan in the file system and create two br (parent and child) in the db', function(done) {
            request(server)
              .post('/saveScan')
              .type('form')
              .field('ppn', '400433052')
              .field('pages', '2-3')
              .attach('scan', './test/api/data/ocr_example_1/0001.png')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(err, res) {
                  should.not.exist(err);
                  res.body[0].should.have.property("title", "The handbook of the neuropsychology of language");
                  res.body[0].should.have.property("scans");
                  res.body[0].scans.should.be.Array;
                  res.body[0].scans.should.have.lengthOf(0);
                  res.body[1].should.have.property("scans");
                  res.body[1].scans.should.be.Array;
                  res.body[1].scans.should.have.lengthOf(1);
                  res.body[0].should.have.property("parts");
                  res.body[0].parts.should.be.Array;
                  res.body[0].parts.should.have.lengthOf(1)
                  res.body[1].should.have.property("partOf");
                  res.body[0].parts[0].partId.should.be.exactly(res.body[1]._id);
                  res.body[0]._id.should.be.exactly(res.body[1].partOf);
                  done();
              });
          });
          
          it('should should return an error as the file has been already uploaded', function(done) {
              request(server)
                .post('/saveScan')
                .type('form')
                .field('ppn', '400433052')
                .field('pages', '2-3')
                .attach('scan', './test/api/data/ocr_example_1/0001.png')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    should.not.exist(err);
                    should.exist(res.body)
                    done();
                });
          });

          it('should should add a new part to an already existing br', function(done) {
              request(server)
                  .post('/saveScan')
                  .type('form')
                  .field('ppn', '400433052')
                  .field('pages', '4-10')
                  .attach('scan', './test/api/data/ocr_example_1/0002.png')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res) {
                      should.not.exist(err);
                      res.body[0].should.have.property("title", "The handbook of the neuropsychology of language");
                      res.body[0].should.have.property("scans");
                      res.body[0].scans.should.be.Array;
                      res.body[0].scans.should.have.lengthOf(0);
                      res.body[1].should.have.property("scans");
                      res.body[1].scans.should.be.Array;
                      res.body[1].scans.should.have.lengthOf(1);
                      res.body[0].should.have.property("parts");
                      res.body[0].parts.should.be.Array;
                      res.body[0].parts.should.have.lengthOf(2)
                      res.body[1].should.have.property("partOf");
                      res.body[0].parts[1].partId.should.be.exactly(res.body[1]._id);
                      res.body[0]._id.should.be.exactly(res.body[1].partOf);
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
                res.body.should.have.lengthOf(2);
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
                res.body.should.have.property("scans");
                res.body.should.have.property("partOf");
                res.body.scans.should.be.Array;
                res.body.scans.should.have.lengthOf(1);
                res.body.parts.should.be.Array;
                res.body.cites.should.be.Array;
                res.body.cites.should.have.lengthOf(53);
                res.body.scans[0].status.should.be.exactly(status.ocrProcessed);
                res.body.cites[0].should.have.property("coordinates");
                res.body.cites[0].should.have.property("bibliographicEntryText");
                res.body.cites[0].should.have.property("scanId");
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
