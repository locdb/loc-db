const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();
const status = require('./../../../api/schema/enum.json').status;

var agent = request.agent(server);

describe('controllers', function() {

    describe('bibliographicEntry', function () {
        var id = "";

        before(function (done) {
            setup.loadBibliographicEntry();
            setup.loadBibliographicResources();
            setup.login(agent, function(err, res){
                if(err) return done(err);
                done();
            });

        });

        after(function (done) {
            setup.dropDB();
            done();
        });


        describe('GET /getToDoBibliographicEntries', function () {

            it('should return a list of not ocr processed bibliographic entries of length 54', function (done) {
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

            it('should return a list of not ocr processed bibliographic entries by scanId of length 1', function (done) {
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
                        res.body.should.have.lengthOf(1);
                        res.body[0].should.have.property("bibliographicEntryText", "TEST ENTRY 1");
                        res.body[0].should.have.property("status", status.ocrProcessed);
                        res.body[0].should.have.property("scanId", scanId);
                        id = res.body[0]._id;
                        done();
                    });
            });
        });

        describe('PUT /bibliographicEntries/{id}', function () {

            it('should return a single updated bibliographic entry', function (done) {

                var update = `{
                        "identifiers":[],
                        "bibliographicEntryText": "TEST ENTRY 1 -- UPDATED",
                        "ocrData": {
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
                        update._id = id;
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

        describe('POST /getInternalSuggestions', function () {

            it('should return 0 internal suggestions for a bibliographic entry', function (done) {

                var searchObject = `{
                        "bibliographicEntryText": "TEST ENTRY 1 -- UPDATED",
                        "ocrData": {
                            "coordinates": "714 317 2238 356",
                            "title": "2Zur Ausgestaltung des Mehrheitsprinzips in der unmittelbaren Demokratie. In: Bayerische Verwaltungsbl&ttcr S. 33--43, 74-79. TmFENBACH, Paul: Sinn oder Unsinn von Abstimmungsquoren. Im Internet:",
                            "date": "2000",
                            "marker": "THUM, 2000",
                            "authors": [ "Cornelius THUM" ]
                        },
                        "scanId": "58cb91fa5452691cd86bc941",
                        "status": "VALID"
                        }`;
                var searchObject = JSON.parse(searchObject);
                agent
                    .post('/getInternalSuggestions')
                    .set('Accept', 'application/json')
                    .send(searchObject)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        res.body.should.have.lengthOf(0);
                        should.not.exist(err);
                        done();
                    });
            });

            it('should return 1 internal suggestions for a bibliographic entry', function (done) {

                var searchObject = `{
                        "bibliographicEntryText": "The Semantic Web - ISWC 2015",
                        "ocrData":{
                            "coordinates": "714 317 2238 356",
                            "title": "The Semantic Web - ISWC 2015",
                            "date": "2000",
                            "marker": "THUM, 2000",
                            "authors": []
                        },
                        "scanId": "58cb91fa5452691cd86bc941",
                        "status": ""
                        }`;
                var searchObject = JSON.parse(searchObject);
                agent
                    .post('/getInternalSuggestions')
                    .set('Accept', 'application/json')
                    .send(searchObject)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        res.body.should.have.lengthOf(1);
                        should.not.exist(err);
                        done();
                    });
            });
        });

        describe('POST /getExternalSuggestions', function () {

            it('should return one external suggestion for a bibliographic entry', function (done) {
                this.timeout(10000);
                var searchObject = `{
                        "bibliographicEntryText": "bibliographicEntryText",
                        "status": "",
                        "ocrData":{
                            "title": "Direkte Demokratie in der Schweiz: Entwicklungen, Debatten und Wirkungen, In:",
                            "date": "",
                            "marker": "",
                            "authors": []
                        }
                }`;
                var searchObject = JSON.parse(searchObject);
                agent
                    .post('/getExternalSuggestions')
                    .set('Accept', 'application/json')
                    .send(searchObject)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array;
                        //res.body.should.have.lengthOf(1);
                        res.body.should.have.lengthOf(21);
                        res.body[0].should.have.property("title", "Direkte Demokratie in der Schweiz: Entwicklungen, Debatten und Wirkungen");
                        res.body[0].should.have.property("status", status.external);
                        res.body[0].should.have.property("identifiers");
                        res.body[0].identifiers.should.be.Array;
                        res.body[0].identifiers.should.have.lengthOf(1);
                        res.body[0].identifiers[0].should.have.property("scheme", "URL_GOOGLE_SCHOLAR");
                        done();
                    });
            });

            it('should return two external suggestion for a bibliographic entry', function (done) {
                this.timeout(10000);
                var searchObject = `{
                        "bibliographicEntryText": "bibliographicEntryText",
                        "status": "",
                        "ocrData":{
                            "title": "Direkte Demokratie und Umweltpolitik in der Schweiz, In:",
                            "date": "",
                            "marker": "",
                            "authors": []
                        }
                    }`;
                var searchObject = JSON.parse(searchObject);
                agent
                    .post('/getExternalSuggestions')
                    .set('Accept', 'application/json')
                    .send(searchObject)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array;
                        //res.body.should.have.lengthOf(2);
                        res.body.should.have.lengthOf(21);
                        res.body[0].should.have.property("status", status.external);
                        res.body[0].should.have.property("title", "Direkte Demokratie und Umweltpolitik in der Schweiz");
                        res.body[0].should.have.property("identifiers");
                        res.body[0].identifiers.should.be.Array;
                        res.body[0].identifiers.should.have.lengthOf(1);
                        res.body[0].identifiers[0].should.have.property("scheme", "URL_GOOGLE_SCHOLAR");
                        done();
                    });
            });
        });
    });
});
