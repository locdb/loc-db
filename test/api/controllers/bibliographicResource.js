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
          setup.loadBibliographicResources(function(err,res){
              setup.login(agent, function(err, res){
                  if(err) return done(err);
                  done();
              });
          });
      });
      
      after(function(done) {
          setup.dropDB(function(err){
              done();
          });
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
              .query({ ppn: '400433052', resourceType: enums.resourceType.collection})
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
                .query({ ppn: '', resourceType: enums.resourceType.monograph})
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
              publicationYear: "2017",
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


      describe('POST /getCrossrefReferences', function(){
          this.timeout(1000000000);

          it('should retrieve crossref references by doi', function(done){
              var data = new BibliographicResource({
                  identifiers: [{
                      literalValue: "10.1007/s11617-006-0056-1",
                      scheme: enums.identifier.doi
                  }],
                  title: "Perspektiven der Politischen Soziologie"
              });

              agent
                  .post('/getCrossrefReferences')
                  .send(data.toObject())
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.be.Array;
                      res.body.should.have.lengthOf(1);
                      res.body[0].should.have.property("title", "Perspektiven der Politischen Soziologie");
                      res.body[0].should.have.property("parts");
                      res.body[0].parts.should.be.Array;
                      res.body[0].parts.should.have.lengthOf(25);
                      done();
                  });
          });

          it('should retrieve crossref references by query', function(done){
              this.timeout(1000000000);
              var data = new BibliographicResource({
                  identifiers: [{
                      literalValue: "some ISBN",
                      scheme: enums.identifier.isbn
                  }],
                  title: "Perspektiven der Politischen Soziologie"
              });

              agent
                  .post('/getCrossrefReferences')
                  .send(data.toObject())
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.be.Array;
                      res.body.should.have.lengthOf(18);
                      res.body[0].should.have.property("title", "Perspektiven der Politischen Soziologie");
                      res.body[0].should.have.property("parts");
                      res.body[0].parts.should.be.Array;
                      res.body[0].parts.should.have.lengthOf(25);
                      done();
                  });
          });
      });


      describe('GET /getPublisherUrl', function(){
          this.timeout(1000000000);

          it('should retrieve the publisher url', function(done){
              var ppn = "429152140";
              var resourceType = enums.resourceType.monograph;

              agent
                  .get('/getPublisherUrl')
                  .query({ppn: ppn})
                  .query({resourceType: resourceType})
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.not.be.Array;
                      res.body.should.be.Object;
                      res.body.should.have.property("scheme", "URI");
                      res.body.should.have.property("literalValue", "http://dx.doi.org/10.1007/978-3-322-81004-5")
                      done();
                  });
          });
      });


      describe.only('GET /saveElectronicJournal', function(){
          this.timeout(1000000000);

          it('should retrieve the publisher url', function(done){
              var doi = "10.1007/s11617-006-0056-1";

              agent
                  .get('/saveElectronicJournal')
                  .query({doi: doi})
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .end(function(err, res){
                      should.not.exist(err);
                      res.body.should.not.be.Array;
                      res.body.should.be.Object;
                      res.body.should.have.property("status", enums.status.valid);
                      done();
                  });
          });
      });

  });

});
