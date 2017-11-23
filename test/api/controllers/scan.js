const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();
const status = require('./../../../api/schema/enum.json').status;
const enums = require('./../../../api/schema/enum.json');
const fs = require('fs');
const config = require('./../../../config/config.js');
const mongoBr = require('./../../../api/models/bibliographicResource');

var agent = request.agent(server);

describe.only('controllers', function () {

    describe('scan', function () {
        var id = "58c01713ea3c8d32f0f80a75";
        var idPdf = "";

        before(function (done) {
            this.timeout(5000);
            setup.dropDB(function(err){
                setup.loadBibliographicResources(function(err,res){
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
            this.timeout(1000000);
            it('should save a scan in the file system and create two br (parent and child) in the db', function (done) {
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '012678775')
                    .field('firstPage', '51')
                    .field('lastPage', '95')
                    .field('textualPdf', false)
                    .field('resourceType', enums.resourceType.bookChapter)
                    .attach('scan', './test/api/data/ocr_data/02_input.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body[0].should.have.property("title", "Modelling and analysis in arms control :");
                        res.body[0].should.have.property("embodiedAs");
                        res.body[0].embodiedAs.should.be.Array;
                        res.body[0].embodiedAs.should.have.lengthOf(0);
                        res.body[1].should.have.property("embodiedAs");
                        res.body[1].should.have.property("title", "Arms Control: Lessons Learned and the Future");
                        res.body[1].embodiedAs.should.be.Array;
                        res.body[1].embodiedAs.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].should.have.property("scans");
                        res.body[1].embodiedAs[0].scans.should.be.Array;
                        res.body[1].embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("textualPdf", false);
                        res.body[2].should.deepEqual(res.body[1].embodiedAs[0].scans[0]);
                        res.body[1].should.have.property("partOf");
                        res.body[0]._id.should.be.exactly(res.body[1].partOf);
                        should(fs.existsSync(config.PATHS.UPLOAD)).equal(true);
                        should(fs.existsSync(config.PATHS.UPLOAD + res.body[1].embodiedAs[0].scans[0].scanName)).equal(true);
                        done();
                    });
            });

            it('should should add a new part to an already existing br: pdf', function (done) {
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '012678775')
                    .field('firstPage', '33')
                    .field('lastPage', '41')
                    .field('textualPdf', true)
                    .field('resourceType', enums.resourceType.bookChapter)
                    .attach('scan', './test/api/data/ocr_data/references.pdf')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        console.log(res.body)
                        should.not.exist(err);
                        res.body[0].should.have.property("title", "Modelling and analysis in arms control :");
                        res.body[0].should.have.property("embodiedAs");
                        res.body[0].embodiedAs.should.be.Array;
                        res.body[0].embodiedAs.should.have.lengthOf(0);
                        res.body[1].should.have.property("embodiedAs");
                        res.body[1].should.have.property("title", "Arms Control and Strategic Military Stability");
                        res.body[1].embodiedAs.should.be.Array;
                        res.body[1].embodiedAs.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].should.have.property("scans");
                        res.body[1].embodiedAs[0].scans.should.be.Array;
                        res.body[1].embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("textualPdf", true);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[2].should.deepEqual(res.body[1].embodiedAs[0].scans[0]);
                        res.body[1].should.have.property("partOf");
                        res.body[0]._id.should.be.exactly(res.body[1].partOf);
                        should(fs.existsSync(config.PATHS.UPLOAD)).equal(true);
                        should(fs.existsSync(config.PATHS.UPLOAD + res.body[1].embodiedAs[0].scans[0].scanName)).equal(true);
                        idPdf = res.body[1].embodiedAs[0].scans[0]._id;
                        done();
                    });
            });


            it('Should return a scan at the third position', function (done) {
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '48525302X')
                    .field('firstPage', '14')
                    .field('lastPage', '16')
                    .field('textualPdf', false)
                    .field('resourceType', enums.resourceType.bookChapter)
                    .attach('scan', './test/api/data/ocr_data/references.pdf')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        console.log(res.body)
                        should.not.exist(err);
                        res.body[2].should.be.ok;
                        done();
                    });
            });

            it('Should return a scan at the third position 2', function (done) {
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '48525302X')
                    .field('firstPage', '14')
                    .field('lastPage', '16')
                    .field('textualPdf', false)
                    .field('resourceType', enums.resourceType.bookChapter)
                    .attach('scan', './test/api/data/ocr_data/references.pdf')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        console.log(res.body)
                        should.not.exist(err);
                        res.body[2].should.be.ok;
                        done();
                    });
            });
        });


        describe('POST /saveScan - Resource Type: Journal', function () {

            it('should save a scan in the file system and create two br (parent and child) in the db', function (done) {
                this.timeout(1000000);
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '023724153')
                    .field('firstPage', '2')
                    .field('lastPage', '3')
                    .field('textualPdf', false)
                    .field('resourceType', enums.resourceType.journal)
                    .attach('scan', './test/api/data/ocr_data/02_input.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body[0].should.have.property("title", "Arbeitspapiere Fachgebiet Soziologie");
                        res.body[0].should.have.property("embodiedAs");
                        res.body[0].embodiedAs.should.be.Array;
                        res.body[0].embodiedAs.should.have.lengthOf(0);
                        res.body[1].should.have.property("embodiedAs");
                        res.body[1].embodiedAs.should.be.Array;
                        res.body[1].embodiedAs.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].should.have.property("scans");
                        res.body[1].embodiedAs[0].scans.should.be.Array;
                        res.body[1].embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("textualPdf", false);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[2].should.deepEqual(res.body[1].embodiedAs[0].scans[0]);
                        res.body[1].should.have.property("partOf");
                        res.body[0]._id.should.be.exactly(res.body[1].partOf);
                        should(fs.existsSync(config.PATHS.UPLOAD)).equal(true);
                        should(fs.existsSync(config.PATHS.UPLOAD + res.body[1].embodiedAs[0].scans[0].scanName)).equal(true);
                        done();
                    });
            });

            it('should should add a new part to an already existing br', function (done) {
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '023724153')
                    .field('firstPage', '4')
                    .field('lastPage', '10')
                    .field('resourceType', enums.resourceType.journal)
                    .field('textualPdf', false)
                    .attach('scan', './test/api/data/ocr_data/02_input.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        console.log(res.body)
                        should.not.exist(err);
                        res.body[0].should.have.property("title", "Arbeitspapiere Fachgebiet Soziologie");
                        res.body[0].should.have.property("embodiedAs");
                        res.body[0].embodiedAs.should.be.Array;
                        res.body[0].embodiedAs.should.have.lengthOf(0);
                        res.body[1].should.have.property("embodiedAs");
                        res.body[1].embodiedAs.should.be.Array;
                        res.body[1].embodiedAs.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].should.have.property("scans");
                        res.body[1].embodiedAs[0].scans.should.be.Array;
                        res.body[1].embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("textualPdf", false);
                        res.body[1].embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[2].should.deepEqual(res.body[1].embodiedAs[0].scans[0]);
                        res.body[1].should.have.property("partOf");
                        res.body[0]._id.should.be.exactly(res.body[1].partOf);
                        should(fs.existsSync(config.PATHS.UPLOAD)).equal(true);
                        should(fs.existsSync(config.PATHS.UPLOAD + res.body[1].embodiedAs[0].scans[0].scanName)).equal(true);
                        done();
                    });
            });
        });


        describe('POST /saveScan - Resource Type: Monograph', function () {

            it('should save a scan in the file system and create a single br in the db', function (done) {
                agent
                    .post('/saveScan')
                    .type('form')
                    .field('ppn', '004000951')
                    .field('firstPage', '-1')
                    .field('lastPage', '-1')
                    .field('resourceType', enums.resourceType.monograph)
                    .field('textualPdf', false)
                    .attach('scan', './test/api/data/ocr_data/02_input.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array;
                        res.body[0].should.have.property("embodiedAs");
                        res.body[0].embodiedAs.should.be.Array;
                        res.body[0].embodiedAs.should.have.lengthOf(1);
                        res.body[0].embodiedAs[0].should.have.property("scans");
                        res.body[0].embodiedAs[0].scans.should.be.Array;
                        res.body[0].embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[0].embodiedAs[0].scans[0].should.have.property("scanName");
                        res.body[0].embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[1].should.deepEqual(res.body[0].embodiedAs[0].scans[0]);
                        res.body[0].should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                        res.body[0].should.have.property("publicationYear", "19uu");
                        var scanPath = config.PATHS.UPLOAD + res.body[0].embodiedAs[0].scans[0].scanName;
                        fs.exists(scanPath, function(result){
                            result.should.equal(true);
                            mongoBr.findOne({_id: res.body[0]._id}, function(err, br){
                                br.should.be.ok;
                                br.should.have.property("embodiedAs");
                                br.embodiedAs.should.be.Array;
                                br.embodiedAs.should.have.lengthOf(1);
                                br.embodiedAs[0].should.have.property("scans");
                                br.embodiedAs[0].scans.should.be.Array;
                                br.embodiedAs[0].scans.should.have.lengthOf(1);
                                br.embodiedAs[0].scans[0].should.have.property("scanName");
                                br.embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                                br.should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                                br.should.have.property("publicationYear", "19uu");
                                done();
                            });
                        });
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
                        res.body.should.have.lengthOf(4);
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

                it('should retrieve a todo list of size 4 for the status "NOT_OCR_PROCESSED"', function (done) {

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
                            res.body.should.have.lengthOf(5);
                            res.body[0].should.have.property("children");
                            res.body[1].should.have.property("children");
                            res.body[3].should.not.have.property("children");
                            res.body[0].children.should.be.Array();
                            res.body[0].children.should.have.lengthOf(2);
                            res.body[1].children.should.be.Array();
                            res.body[1].children.should.have.lengthOf(1);
                            //res.body[3].children.should.be.Array();
                            //res.body[3].children.should.have.lengthOf(2);
                            done();
                        });
                });
            });
        });

        describe('GET /triggerOcrProcessing', function () {
            it('should be able to deal with errors from the ocr component', function (done) {
                this.timeout(1000000);
                setup.mockOCRError();
                agent
                    .get('/triggerOcrProcessing')
                    .query({id: id})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(502)
                    .end(function (err, res) {
                        console.log(res.body);
                        should.not.exist(err);
                        done();
                    });
            });

            it('should trigger OCR processing', function (done) {
                setup.mockOCRFileUpload();
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
                        res.body.parts.should.have.lengthOf(48);
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


            it('should trigger OCR processing for a pdf and download the image', function (done) {
                this.timeout(100000000000000);
                setup.mockOCRGetImage();
                setup.mockOCRFileUpload();
                agent
                    .get('/triggerOcrProcessing')
                    .query({id: idPdf})
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
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
                        res.body.embodiedAs[0].scans[0].status.should.be.exactly(status.ocrProcessed);
                        res.body.embodiedAs[0].scans[0].should.have.property("scanName", idPdf+".png");
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

        describe('DELETE /delete', function () {
            // TODO: Delete also from the file system
            it('should delete a scan', function (done) {
                agent
                    .delete('/scans/' + id)
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        console.log(res.body);
                        should.not.exist(err);
                        done();
                    });
            });

            it('should not retrieve a file', function (done) {
                agent
                    .get('/scans/' + id)
                    .set('Accept', 'application/json')
                    .expect(400)
                    .end(function (err, res) {
                        console.log(res.body);
                        should.not.exist(err);
                        done();
                    });
            });
        });

        describe('POST /saveResource - Resource Type: Journal', function () {
            this.timeout(1000000);
            it('should create a journal in the db', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'ZDB_PPN')
                    .field('identifierLiteralValue', '012893803')
                    .field('resourceType', enums.resourceType.journal)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.have.property("title", "Bibliothek der Soziologie und Politik");
                        done();
                    });
            });
        });

        describe('POST /saveResource - Resource Type: Journal', function () {
            this.timeout(1000000);
            it('should return 400, as the journal already exists', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'ZDB_PPN')
                    .field('identifierLiteralValue', '012893803')
                    .field('resourceType', enums.resourceType.journal)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });
        });

        describe('POST /saveResource - Resource Type: Journal', function () {
            this.timeout(1000000);
            it('should take care to extract the right fields from ZDB Marc21', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', "ZDB_PPN")
                    .field('identifierLiteralValue', '020877307')
                    .field('resourceType', enums.resourceType.journal)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.identifiers[0].should.have.property("scheme", enums.identifier.lccn);
                        res.body.identifiers[0].should.have.property("literalValue", "2002-227367");
                        res.body.identifiers[1].should.have.property("scheme", enums.identifier.zdb_id);
                        res.body.identifiers[1].should.have.property("literalValue", "2026606-6");
                        res.body.identifiers[3].should.have.property("scheme", enums.identifier.doi);
                        res.body.identifiers[3].should.have.property("literalValue", "10.1111/(ISSN)1741-3729");
                        res.body.identifiers[4].should.have.property("scheme", enums.identifier.oclcId);
                        res.body.identifiers[4].should.have.property("literalValue", "51205572");
                        res.body.identifiers[5].should.have.property("scheme", enums.identifier.oclcId);
                        res.body.identifiers[5].should.have.property("literalValue", "645307699");
                        res.body.contributors[2].heldBy.identifiers[0].should.have.property("scheme", enums.identifier.gndId);
                        res.body.contributors[2].heldBy.identifiers[0].should.have.property("literalValue", "26045-9");
                        res.body.should.have.property("type", enums.resourceType.journal);
                        done();
                    });
            });
        });
    });
});
