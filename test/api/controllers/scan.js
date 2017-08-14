const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();
const status = require('./../../../api/schema/enum.json').status;
const resourceType = require('./../../../api/schema/enum.json').resourceType;
const fs = require('fs');
const config = require('./../../../config/config.js');

var agent = request.agent(server);

describe('controllers', function () {

    describe('scan', function () {
        var id = "58c01713ea3c8d32f0f80a75";

        before(function (done) {
            setup.dropDB(function(err){
                setup.loadBibliographicResources(function(err,res){
                    //setup.mockOcrServer();
                    setup.login(agent, function(err, res){
                        if(err) return done(err);
                        done();
                    });
                });
            });
        });

        after(function (done) {
            setup.dropDB(function(err){
                done();
            });
        });


        describe('POST /saveScan - Resource Type: Collection', function () {

            it('should save a scan in the file system and create two br (parent and child) in the db', function (done) {
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '400433052')
                    .field('firstPage', '2')
                    .field('lastPage', '3')
                    .field('resourceType', resourceType.collection)
                    .attach('scan', './test/api/data/ocr_example_1/0001.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body[0].should.have.property("title", "The handbook of the neuropsychology of language");
                        res.body[0].should.have.property("embodiedAs");
                        res.body[0].embodiedAs.should.be.Array;
                        res.body[0].embodiedAs.should.have.lengthOf(0);
                        res.body[1].should.have.property("embodiedAs");
                        res.body[1].embodiedAs.should.be.Array;
                        res.body[1].embodiedAs.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].should.have.property("scans");
                        res.body[1].embodiedAs[0].scans.should.be.Array;
                        res.body[1].embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[1].should.have.property("partOf");
                        res.body[0]._id.should.be.exactly(res.body[1].partOf);
                        should(fs.existsSync(config.PATHS.UPLOAD)).equal(true);
                        should(fs.existsSync(config.PATHS.UPLOAD + res.body[1].embodiedAs[0].scans[0].scanName)).equal(true);
                        done();
                    });
            });

/*            it('should should return an error as the file has been already uploaded', function (done) {
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '400433052')
                    .field('firstPage', '2')
                    .field('lastPage', '3')
                    .field('resourceType', resourceType.collection)
                    .attach('scan', './test/api/data/ocr_example_1/0001.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        should.exist(res.body)
                        done();
                    });
            });*/

            it('should should add a new part to an already existing br', function (done) {
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '400433052')
                    .field('firstPage', '4')
                    .field('lastPage', '10')
                    .field('resourceType', resourceType.collection)
                    .attach('scan', './test/api/data/ocr_example_1/0002.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        console.log(res.body)
                        should.not.exist(err);
                        res.body[0].should.have.property("title", "The handbook of the neuropsychology of language");
                        res.body[0].should.have.property("embodiedAs");
                        res.body[0].embodiedAs.should.be.Array;
                        res.body[0].embodiedAs.should.have.lengthOf(0);
                        res.body[1].should.have.property("embodiedAs");
                        res.body[1].embodiedAs.should.be.Array;
                        res.body[1].embodiedAs.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].should.have.property("scans");
                        res.body[1].embodiedAs[0].scans.should.be.Array;
                        res.body[1].embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[1].should.have.property("partOf");
                        res.body[0]._id.should.be.exactly(res.body[1].partOf);
                        should(fs.existsSync(config.PATHS.UPLOAD)).equal(true);
                        should(fs.existsSync(config.PATHS.UPLOAD + res.body[1].embodiedAs[0].scans[0].scanName)).equal(true);
                        done();
                    });
            });
        });

        describe('GET /getToDo', function () {

            it('should retrieve a todo list for the status "NOT_OCR_PROCESSED"', function (done) {
                agent
                    .get('/getToDo')
                    .query({status: "NOT_OCR_PROCESSED"})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        should.not.exist(err);
                        res.body.should.be.Array;
                        res.body.should.have.lengthOf(1);
                        res.body[0].should.have.property("children");
                        res.body[0].children.should.have.lengthOf(2);
                        res.body[0].children[0].should.have.property("scans");
                        res.body[0].children[0].scans.should.be.Array();
                        res.body[0].children[0].scans.should.have.lengthOf(1);
                        id = res.body[0].children[0].scans[0]._id;
                        done();
                    });
            });

            it('should retrieve an empty todo list for the status "OCR_PROCESSED"', function (done) {
                agent
                    .get('/getToDo')
                    .query({status: "OCR_PROCESSED"})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        should.not.exist(err);
                        res.body.should.be.Array;
                        res.body.should.have.lengthOf(0);
                        done();
                    });
            });

            describe('GET /getToDo with additional data', function () {
                before(function (done) {
                    setup.loadAdditionalToDo(function(err, res){
                        done();
                    });
                });

                it('should retrieve a todo list of size 2 for the status "NOT_OCR_PROCESSED"', function (done) {

                    agent
                        .get('/getToDo')
                        .query({status: "NOT_OCR_PROCESSED"})
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            console.log(res.body);
                            should.not.exist(err);
                            res.body.should.be.Array;
                            res.body.should.have.lengthOf(2);
                            res.body[0].should.have.property("children");
                            res.body[0].children.should.be.Array();
                            res.body[0].children.should.have.lengthOf(2);
                            res.body[1].children.should.be.Array();
                            res.body[1].children.should.have.lengthOf(1);
                            done();
                        });
                });
            });
        });

        describe('GET /triggerOcrProcessing', function () {

            it('should trigger OCR processing', function (done) {
                this.timeout(1000000);
                agent
                    .get('/triggerOcrProcessing')
                    .query({id: id})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        should.not.exist(err);
                        res.body.should.not.be.Array;
                        res.body.should.have.property("_id");
                        res.body.should.have.property("embodiedAs");
                        res.body.embodiedAs.should.be.Array;
                        res.body.embodiedAs.should.have.lengthOf(1);
                        res.body.embodiedAs[0].should.have.property("scans");
                        res.body.should.have.property("partOf");
                        res.body.embodiedAs[0].scans.should.be.Array;
                        res.body.embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body.parts.should.be.Array;
                        res.body.parts.should.have.lengthOf(53);
                        res.body.embodiedAs[0].scans[0].status.should.be.exactly(status.ocrProcessed);
                        res.body.parts[0].should.have.property("ocrData");
                        res.body.parts[0].ocrData.should.have.property("coordinates");
                        res.body.parts[0].should.have.property("bibliographicEntryText");
                        res.body.parts[0].should.have.property("scanId");
                        res.body.parts[0].ocrData.should.have.property("authors");
                        res.body.parts[0].ocrData.should.have.property("title");
                        res.body.parts[0].ocrData.should.have.property("date");
                        res.body.parts[0].ocrData.should.have.property("marker");
                        done();
                    });
            });
        });

        describe('GET /getToDo', function () {
            it('should retrieve an todo list for the status "OCR_PROCESSED" of size 1', function (done) {
                agent
                    .get('/getToDo')
                    .query({status: "OCR_PROCESSED"})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        should.not.exist(err);
                        res.body.should.be.Array;
                        res.body.should.have.lengthOf(1);
                        done();
                    });
            });
        });

        describe('GET /get', function () {

            it('should retrieve a file', function (done) {
                agent
                    .get('/scans/' + id)
                    .set('Accept', 'image/png')
                    .expect('Content-Type', 'image/png')
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        should.not.exist(err);
                        done();
                    });
            });
        });
    });
});
