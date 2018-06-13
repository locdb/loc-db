const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();
const status = require('./../../../api/schema/enum.json').status;
const resourceType = require('./../../../api/schema/enum.json').resourceType;
const externalSources = require('./../../../api/schema/enum.json').externalSources;

var agent = request.agent(server);

describe('controllers', function() {

    describe('bibliographicEntry', function () {
        var id = "";

        before(function (done) {
            this.timeout(8000);
            setup.dropDB(function(){
                setup.loadBibliographicEntry(function(err, result){
                    if(err) return done(err);
                    setup.loadBibliographicResources(function(err, result){
                        if(err) return done(err);
                        setup.loadSearchData(function(err, result) {
                            if (err) return done(err);
                            setup.login(agent, function (err, result) {
                                if (err) return done(err);
                                setup.mockGVISuggestions();
                                setup.mockK10PlusSuggestions();
                                setTimeout(function () {
                                    done();
                                }, 2000);
                            });
                        });
                    });
                });
            });
        });

        after(function (done) {
            setup.dropDB(function(err){
                done();
            });
        });


        describe('GET /getToDoBibliographicEntries', function () {

            it.skip('should return a list of not ocr processed bibliographic entries of length 54', function (done) {
                agent
                    .get('/getToDoBibliographicEntries')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body)
                        should.not.exist(err);
                        res.body.should.be.Array;
                        res.body.should.have.lengthOf(54);
                        for (var be of res.body) {
                            be.should.have.property("status", status.ocrProcessed);
                        }
                        done();
                    });
            });

            it('should return a list of not ocr processed bibliographic entries by scanId of length 53', function (done) {
                var scanId = "58cb91fa5452691cd86bc940";
                agent
                    .get('/getToDoBibliographicEntries')
                    .query({scanId: "58cb91fa5452691cd86bc940"})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body)
                        should.not.exist(err);
                        res.body.should.be.Array;
                        res.body.should.have.lengthOf(53);
                        for (var be of res.body) {
                            be.should.have.property("scanId", scanId);
                            be.should.have.property("status", status.ocrProcessed);
                        }
                        done();
                    });
            });

            it('should return a list of not ocr processed bibliographic entries by scanId of length 3', function (done) {
                var scanId = "58cb91fa5452691cd86bc941";
                agent
                    .get('/getToDoBibliographicEntries')
                    .query({scanId: scanId})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        should.not.exist(err);
                        res.body.should.be.Array;
                        res.body.should.have.lengthOf(3);
                        res.body[1].should.have.property("bibliographicEntryText", "TEST ENTRY 1");
                        res.body[1].should.have.property("status", status.ocrProcessed);
                        res.body[1].should.have.property("scanId", scanId);
                        id = res.body[0]._id;
                        done();
                    });
            });
        });

        describe('PUT /bibliographicEntries/{id}', function () {

            it('should return a single updated bibliographic entry', function (done) {
                this.timeout(10000000);
                var update = `{
                        "identifiers":[
                            {"scheme":"DOI", "literalValue": "Test"}
                        ],
                        "bibliographicEntryText": "TEST ENTRY 1 -- UPDATED",
                        "ocrData": {
                            "_id": "5ae9a62b34f532213443fe87",
                            "coordinates": "714 317 2238 356",
                            "title": "2Zur Ausgestaltung des Mehrheitsprinzips in der unmittelbaren Demokratie. In: Bayerische Verwaltungsbl&ttcr S. 33--43, 74-79. TmFENBACH, Paul: Sinn oder Unsinn von Abstimmungsquoren. Im Internet:",
                            "date": "2000",
                            "marker": "THUM, 2000",
                            "authors": [ "Cornelius THUM" ]
                            },
                        "scanId": "58cb91fa5452691cd86bc941",
                        "status": "VALID"
                    }`;
                update = JSON.parse(update);
                agent
                    .put('/bibliographicEntries/' + id)
                    .set('Accept', 'application/json')
                    .send(update)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        res.body.should.have.property("identifiers");
                        res.body.identifiers.should.have.lengthOf(1);
                        update._id = res.body._id;
                        update.identifiers[0]._id = res.body.identifiers[0]._id;
                        res.body.should.deepEqual(update);
                        should.not.exist(err);
                        done();
                    });
            });

            it('should return a single updated bibliographic entry', function (done) {

                var update = `{
                        "bibliographicEntryText": "TEST ENTRY 1 -- UPDATED TWICE",
                        "ocrData":{
                            "coordinates": "714 317 2238 356",
                            "title": "2Zur Ausgestaltung des Mehrheitsprinzips in der unmittelbaren Demokratie. In: Bayerische Verwaltungsbl&ttcr S. 33--43, 74-79. TmFENBACH, Paul: Sinn oder Unsinn von Abstimmungsquoren. Im Internet:"
                        },
                        "scanId": "58cb91fa5452691cd86bc941",
                        "status": "OCR_PROCESSED"
                    }`;
                update = JSON.parse(update);
                agent
                    .put('/bibliographicEntries/' + id)
                    .set('Accept', 'application/json')
                    .send(update)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        res.body.should.not.deepEqual(update);
                        res.body.should.containDeep(update);
                        should.not.exist(err);
                        done();
                    });
            });
        });

        describe('GET /getInternalSuggestionsByQueryString', function () {

            it('should return 1 internal suggestions for a bibliographic entry', function (done) {


                var query = "The Semantic Web";
                agent
                    .get('/getInternalSuggestionsByQueryString')
                    .query({ query: query })
                    .query({ k: 1 })
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        res.body.should.have.lengthOf(1);
                        should.not.exist(err);
                        done();
                    });
            });

            it('should return 1 internal suggestions for a bibliographic entry', function (done) {
                this.timeout(3000);

                var query = "The Semantic Web - ISWC 2015";
                agent
                    .get('/getInternalSuggestionsByQueryString')
                    .query({ query: query })
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        res.body.should.have.lengthOf(1);
                        res.body[0].should.have.lengthOf(1);
                        should.not.exist(err);
                        done();
                    });
            });

            it('this should be the first test specific to problems with the search engine', function (done) {
                this.timeout(3000);

                var query = "child";
                agent
                    .get('/getInternalSuggestionsByQueryString')
                    .query({ query: query })
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        res.body.should.have.lengthOf(1);
                        res.body[0].should.have.lengthOf(2);
                        should.not.exist(err);
                        done();
                    });
            });

            it('this should internally search for a given doi', function (done) {
                this.timeout(3000);

                var query = "10.1080/00313830802184608 ";
                agent
                    .get('/getInternalSuggestionsByQueryString')
                    .query({ query: query })
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        res.body.should.have.lengthOf(1);
                        res.body[0].should.have.lengthOf(2);
                        should.not.exist(err);
                        done();
                    });
            });
        });


        describe('GET /getExternalSuggestionsByQueryString', function () {

            it('should return 8 suggestion for a query string', function (done) {
                this.timeout(1000000);
                var query = "The association between social capital and juvenile crime: The role of individual and structural factors.";

                agent
                    .get('/getExternalSuggestionsByQueryString')
                    .set('Accept', 'application/json')
                    .query({ query: query })
                    .query({ k: 8 })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array;
                        //res.body.should.have.lengthOf(1);
                        res.body.should.have.lengthOf(8);
                        //res.body[0].should.have.property("title", "Direkte Demokratie in der Schweiz: Entwicklungen, Debatten und Wirkungen");
                        res.body[0][0].should.have.property("status", status.external);
                        //res.body[0][1].should.have.property("journal_title");
                        //res.body[0][0].should.have.property("journalArticle_identifiers");
                        //res.body[0][0].journalArticle_identifiers.should.be.Array;
                        //res.body[0][0].journalArticle_identifiers.should.have.lengthOf(3);
                        done();
                    });
            });


                it('should return a match from SWB', function (done) {
                    this.timeout(1000000);
                    var query = "Academically%2520Adrift:" +
                        "%2520Limited%2520Learning%2520on%2520College%2520Campuses";

                    agent
                        .get('/getExternalSuggestionsByQueryString')
                        .set('Accept', 'application/json')
                        .query({ query: query })
                        .query({ k: 3 })
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            should.not.exist(err);
                            res.body.should.be.Array;
                            //res.body.should.have.lengthOf(1);
                            res.body.should.have.lengthOf(3);
                            //res.body[0].should.have.property("title", "Direkte Demokratie in der Schweiz: Entwicklungen, Debatten und Wirkungen");
                            res.body[0][0].should.have.property("status", status.external);
                            res.body[0][0].should.have.property("monograph_identifiers");
                            res.body[0][0].monograph_identifiers.should.be.Array;
                            res.body[0][0].monograph_identifiers.should.have.lengthOf(5);
                            done();
                        });
                });

            it('should return 18 external suggestion for a bibliographic entry', function (done) {
                this.timeout(100000);
                var query = "Direkte Demokratie";

                agent
                    .get('/getExternalSuggestionsByQueryString')
                    .set('Accept', 'application/json')
                    .query({ query: query })
                    .query({ k: 18 })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array;
                        //res.body.should.have.lengthOf(2);
                        res.body.should.have.lengthOf(18);
                        res.body[1][0].should.have.property("status", status.external);
                        done();
                    });
            });

            it('should search by doi', function (done) {
                this.timeout(100000);
                var query = "10.1007/s00148-005-0056-5";

                agent
                    .get('/getExternalSuggestionsByQueryString')
                    .set('Accept', 'application/json')
                    .query({ query: query })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array;
                        //res.body.should.have.lengthOf(2);
                        res.body.should.have.lengthOf(1);
                        res.body[0][0].should.have.property("status", status.external);
                        done();
                    });
            });

            it('should search by doi 2 (doi and other words are given)', function (done) {
                this.timeout(100000);
                var query = "DOI: 10.1007/s00148-005-0056-5";

                agent
                    .get('/getExternalSuggestionsByQueryString')
                    .set('Accept', 'application/json')
                    .query({ query: query })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array;
                        //res.body.should.have.lengthOf(2);
                        res.body.should.have.lengthOf(1);
                        res.body[0][0].should.have.property("status", status.external);
                        done();
                    });
            });

            it('should return a match from swb', function (done) {
                this.timeout(100000);
                var query = "1963 Hannah Arendt Über die Revolution";

                agent
                    .get('/getExternalSuggestionsByQueryString')
                    .set('Accept', 'application/json')
                    .query({ query: query })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array;
                        //res.body.should.have.lengthOf(2);
                        res.body.should.have.lengthOf(10);
                        res.body[0][0].should.have.property("status", status.external);
                        done();
                    });
            });
        });


        describe('GET /addTargetBibliographicResource', function () {

            it('should add a target resource to a bibliographic entry', function (done) {
                var  bibliographicResourceId = '592420955e7d7f3e54934304';
                var bibliographicEntryId = '58cb92465452691cd86bc94b';

                agent
                    .get('/addTargetBibliographicResource')
                    .set('Accept', 'application/json')
                    .query({bibliographicEntryId: bibliographicEntryId,
                        bibliographicResourceId: bibliographicResourceId}) // arbitrary ids from our test data, this would be nicer with actual matching entries
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Object;
                        res.body.should.have.property("cites");
                        res.body.cites.should.be.Array;
                        res.body.cites.should.have.lengthOf(1);
                        res.body.cites[0].should.equal(bibliographicResourceId);
                        res.body.should.have.property("parts");
                        res.body.parts.should.be.Array;
                        res.body.parts.should.have.lengthOf(53);
                        res.body.parts.should.containDeep([{"_id": bibliographicEntryId}]);
                        for(var be of res.body.parts){
                            if(be._id == bibliographicEntryId){
                                be.should.have.property("references", bibliographicResourceId);
                                be.should.have.property("status", status.valid);
                            }
                        }
                        done();
                    });
            });

            it('should not add a target resource to a bibliographic entry because of a dependency circle', function (done) {
                var  bibliographicResourceId = '58cb91fa5452691cd86bc93f';
                var bibliographicEntryId = '58cb92465452691cd86bc94b';

                agent
                    .get('/addTargetBibliographicResource')
                    .set('Accept', 'application/json')
                    .query({bibliographicEntryId: bibliographicEntryId,
                        bibliographicResourceId: bibliographicResourceId}) // arbitrary ids from our test data, this would be nicer with actual matching entries
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Object;
                        res.body.should.not.have.property("cites");
                        done();
                    });
            });


            it('should not add a target resource to a bibliographic entry because the entry is already linked', function (done) {
                var  bibliographicResourceId = '592420955e7d7f3e54934304';
                var bibliographicEntryId = '58cb92465452691cd86bc94b';

                agent
                    .get('/addTargetBibliographicResource')
                    .set('Accept', 'application/json')
                    .query({bibliographicEntryId: bibliographicEntryId,
                        bibliographicResourceId: bibliographicResourceId}) // arbitrary ids from our test data, this would be nicer with actual matching entries
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Object;
                        res.body.should.equal("The entry is already linked.");
                        done();
                    });
            });

        });


        describe('GET /removeTargetBibliographicResource', function () {

            it('should add a target resource to a bibliographic entry', function (done) {
                var bibliographicEntryId = '58cb92465452691cd86bc94b';

                agent
                    .get('/removeTargetBibliographicResource')
                    .set('Accept', 'application/json')
                    .query({bibliographicEntryId: bibliographicEntryId}) // arbitrary ids from our test data, this would be nicer with actual matching entries
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Object;
                        res.body.should.have.property("cites");
                        res.body.cites.should.be.Array;
                        res.body.cites.should.have.lengthOf(0);
                        res.body.should.have.property("parts");
                        res.body.parts.should.be.Array;
                        res.body.parts.should.have.lengthOf(53);
                        res.body.parts.should.containDeep([{"_id": bibliographicEntryId}]);
                        for(var be of res.body.parts){
                            if(be._id == bibliographicEntryId){
                                be.should.have.property("references", "");
                                be.should.have.property("status", status.ocrProcessed);
                            }
                        }
                        done();
                    });
            });
        });

        describe('DELETE /bibliographicEntries/{id}', function () {

            it('should delete a bibliographic entry from a given br', function (done) {
                var bibliographicEntryId = '58cb92465452691cd86bc94b';

                agent
                    .delete('/bibliographicEntries/' + bibliographicEntryId)
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Object;
                        res.body.should.have.property("cites");
                        res.body.cites.should.be.Array;
                        res.body.cites.should.have.lengthOf(0);
                        res.body.should.have.property("parts");
                        res.body.parts.should.be.Array;
                        res.body.parts.should.have.lengthOf(52);
                        res.body.parts.should.not.containDeep([{"_id": bibliographicEntryId}]);
                        done();
                    });
            });
        });

        describe('POST /bibliographicEntries', function () {

            it('should create a new bibliographic entry for a given br', function (done) {
                var bibliographicResourceId = '592420955e7d7f3e54934304';
                var bibliographicEntry = {
                    bibliographicEntryText: "New entry that we want to create",
                    status: "OCR_PROCESSED"
                };
                agent
                    .post('/bibliographicEntries?bibliographicResourceId=' + bibliographicResourceId)
                    .send(bibliographicEntry)
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Object;
                        res.body.should.have.property("parts");
                        res.body.parts.should.be.Array().and.have.lengthOf(1);
                        res.body.parts[0].should.have.property("bibliographicEntryText", "New entry that we want to create");
                        res.body.cites.should.be.Array().and.have.lengthOf(0);
                        done();
                    });
            });

            it('should not create a new bibliographic entry for a given br as it is referencing something that does not exist', function (done) {
                var bibliographicResourceId = '592420955e7d7f3e54934304';
                var bibliographicEntry = {
                    bibliographicEntryText: "New entry that we want to create 2",
                    status: "OCR_PROCESSED",
                    references: '58cb92465452691cd86bc94b',
                };
                agent
                    .post('/bibliographicEntries?bibliographicResourceId=' + bibliographicResourceId)
                    .send(bibliographicEntry)
                    .set('Accept', 'application/json')
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });

            it('should not create a new bibliographic entry for a given br as it is referencing the origin br', function (done) {
                var bibliographicResourceId = '592420955e7d7f3e54934304';
                var bibliographicEntry = {
                    bibliographicEntryText: "New entry that we want to create 2",
                    status: "OCR_PROCESSED",
                    references: '592420955e7d7f3e54934304',
                };
                agent
                    .post('/bibliographicEntries?bibliographicResourceId=' + bibliographicResourceId)
                    .send(bibliographicEntry)
                    .set('Accept', 'application/json')
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });

            it('should create a new bibliographic entry referencing a target br', function (done) {
                var bibliographicResourceId = '592420955e7d7f3e54934304';
                var bibliographicEntry = {
                    bibliographicEntryText: "New entry that we want to create 2",
                    status: "OCR_PROCESSED",
                    references: "5a2947087bdcfd4759582633",
                };
                agent
                    .post('/bibliographicEntries?bibliographicResourceId=' + bibliographicResourceId)
                    .send(bibliographicEntry)
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Object;
                        res.body.should.have.property("parts");
                        res.body.parts.should.be.Array().and.have.lengthOf(2);
                        res.body.parts[1].should.have.property("bibliographicEntryText", "New entry that we want to create 2");
                        res.body.cites.should.be.Array().and.have.lengthOf(1);
                        done();
                    });
            });
        });

        describe('GET /getPrecalculatedSuggestions/<id>', function () {
            this.timeout(3000000)
            it('should get the precalculated suggestions for a given be', function (done) {
                    var be;
                    agent
                        .post('/saveResource')
                        .type('form')
                        .field('identifierScheme', 'DOI')
                        .field('identifierLiteralValue', '10.1007/s11617-006-0056-1')
                        .field('resourceType', resourceType.journalArticle)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            should.not.exist(err);
                            be = res.body[0].parts[0];
                            setTimeout(function () {
                                agent
                                    .get('/getPrecalculatedSuggestions/' + be._id.toString())
                                    .set('Accept', 'application/json')
                                    .expect(200)
                                    .end(function (err, res) {
                                        should.not.exist(err);
                                        res.body.should.be.Array();
                                        res.body.should.not.have.lengthOf(0);
                                        done();
                                    });
                            }, 30000);
                        });


            });
        });
    });
});
