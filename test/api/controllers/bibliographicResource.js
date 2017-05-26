const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const enums = require('./../../../api/schema/enum.json');
const setup = require('./../setup.js').createSetup();
const BibliographicResource = require('./../../../api/schema/bibliographicResource');

var agent = request.agent(server);

describe('controllers', function() {

  describe('bibliographicResource', function() {
      var id = "";
      before(function(done) {
          setup.loadBibliographicResources();
          setup.login(agent, function(err, res){
              if(err) return done(err);
              done();
          });
      });
      
      after(function(done) {
          setup.dropDB();
          done();
      });
      
      
      describe('GET /bibliographicResources', function(){
          it('should return a list of bibliographic Resources of length 1', function(done){
              agent
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
            agent
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
              agent
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
              agent
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
      
      describe('DELETE /bibliographicResources', function(){
          it('should return response code 200', function(done){
              agent
                  .delete('/bibliographicResources')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      done();
                  });
          });
      });
      
      describe('GET /bibliographicResources', function(){
          it('should return a list of bibliographic resources of length 0', function(done){
              agent
                  .get('/bibliographicResources')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.be.an.Array();
                      res.body.should.have.length(0);
                      done();
                  });
          });
      });

      describe('POST /bibliographicResources', function(){

          var data = new BibliographicResource({
              identifiers: [{
                  literalValue: "978-3-86680-192-9",
                  scheme: enums.identifier.isbn
              }],
              title: "Test Bibliographic Resource",
              subtitle: "Testing is fun",
              number: 2,
              contributors: [{
                  roleType: enums.roleType.author,
                  heldBy:{
                      givenName: "Anne",
                      familyName: "Lauscher"
                  },
              }],
              publicationYear: 2017,
              status: enums.status.valid,
          });

          it('should add a new bibliographicResource to the db', function(done){
              agent
                  .post('/bibliographicResources')
                  .send(data.toObject())
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.be.an.Object();
                      res.body.should.containDeepOrdered(data.toObject());
                      res.body.should.have.property("_id");
                      id = res.body._id;
                      done();
                  });
          });

          it('should not add a new bibliographicResource to the db', function(done){
              agent
                  .post('/bibliographicResources')
                  .send(data.toObject())
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(400)
                  .end(function(err, res){
                      should.not.exist(err);
                      done();
                  });
          });
      });


      describe('PUT /bibliographicResources/<id>', function(){

          var data = new BibliographicResource({
              identifiers: [{
                  literalValue: "978-3-86680-192-9",
                  scheme: enums.identifier.isbn
              }],
              title: "Title changed",
              subtitle: "Testing is fun",
              number: 2,
              contributors: [{
                  roleType: enums.roleType.author,
                  heldBy:{
                      givenName: "Anne",
                      familyName: "Lauscher"
                  },
              },
              {
                  roleType: enums.roleType.author,
                  heldBy:{
                      nameString: "Second author added",
                      givenName: "Kai",
                      familyName: "Eckert"
                  },
              }],
              publicationYear: 2017,
              status: enums.status.valid,
              parts: [{
                  bibliographicEntryText: "Test test test",
                  status: enums.status.ocrProcessed,
                  ocrData:{
                      title: "Test be title"
                  }
              }]
          });

          it('should update the bibliographicResource', function(done){
              agent
                  .put('/bibliographicResources/' + id)
                  .send(data.toObject())
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.be.an.Object();
                      res.body.should.containDeepOrdered(data.toObject());
                      res.body.should.have.property("_id");
                      done();
                  });
          });

          it('should not update the bibliographicResource', function(done){
              // add illegal property to data
              data = data.toObject();
              data.test = "Test";
              agent
                  .put('/bibliographicResources/' + id)
                  .send(data)
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.not.containDeepOrdered(data);
                      done();
                  });
          });
      });
  });

});
