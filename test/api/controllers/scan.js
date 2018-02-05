const should = require('should');
const request = require('supertest');
const server = require('../../../app');
const setup = require('./../setup.js').createSetup();
const status = require('./../../../api/schema/enum.json').status;
const resourceType = require('./../../../api/schema/enum.json').resourceType;
const fs = require('fs');
const config = require('./../../../config/config.js');
const mongoBr = require('./../../../api/models/bibliographicResource');

var agent = request.agent(server);

describe.only('controllers', function () {

    describe('scan', function () {
        var id = "58c01713ea3c8d32f0f80a75";
        var idPdf = "";

        before(function (done) {
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

        describe('POST /saveResource - Resource Type: JOURNAL', function () {
            this.timeout(1000000);
            it('should create a journal in the db', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'ZDB_PPN')
                    .field('identifierLiteralValue', '011157860')
                    .field('resourceType', resourceType.journal)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body[0].should.have.property("journal_title", "Kölner Zeitschrift für Soziologie und Sozialpsychologie");
                        done();
                    });
            });


            it('should not create the journal again in the db', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'ZDB_PPN')
                    .field('identifierLiteralValue', '011157860')
                    .field('resourceType', resourceType.journal)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });
        });

        describe('POST /saveResource - Resource Type: JOURNAL_ARTICLE', function () {
            var parentId= "";
            var articleId = "";
            it('should create a journal article in the db', function (done) {
                this.timeout(1000000);
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'DOI')
                    .field('identifierLiteralValue', '10.2307/2141399')
                    .field('resourceType', resourceType.journalArticle)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array();
                        res.body.should.have.lengthOf(2);
                        res.body[0].should.have.property("type", resourceType.journalArticle);
                        res.body[1].should.have.property("_id", res.body[0].partOf);
                        parentId = res.body[0].partOf;
                        articleId = res.body[0]._id;
                        res.body[1].should.have.property("type", resourceType.journalIssue);
                        done();
                    });
            });

            it('should not create the same journal article in the db', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'DOI')
                    .field('identifierLiteralValue', '10.2307/2141399')
                    .field('resourceType', resourceType.journalArticle)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });

            it('should append another journal article to the same issue', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'DOI')
                    .field('identifierLiteralValue', '10.2307/2141393')
                    .field('resourceType', resourceType.journalArticle)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        res.body.should.be.Array();
                        res.body.should.have.lengthOf(2);
                        res.body[0].should.have.property("type", resourceType.journalArticle);
                        res.body[1].should.have.property("_id", res.body[0].partOf);
                        res.body[1].should.have.property("_id", parentId);
                        res.body[1].should.have.property("type", resourceType.journalIssue);
                        done();
                    });
            });

            it('should append a scan to the article we created in the beginning', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'DOI')
                    .field('identifierLiteralValue', '10.2307/2141399')
                    .field('resourceType', resourceType.journalArticle)
                    .field('textualPdf', false)
                    .attach('binaryFile', './test/api/data/ocr_data/02_input.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        res.body.should.be.Array();
                        res.body.should.have.lengthOf(3);
                        res.body[0].should.have.property("type", resourceType.journalArticle);
                        res.body[0].should.have.property("partOf", parentId);
                        res.body[0].should.have.property("_id", articleId);
                        res.body[2].should.have.property("status", status.notOcrProcessed);
                        done();
                    });
            });
        });


        describe('POST /saveResource - Resource Type: BOOK_CHAPTER', function () {
            this.timeout(1000000);
            it('should save a scan in the file system and create two br (parent and child) in the db', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'SWB_PPN')
                    .field('identifierLiteralValue', '012678775')
                    .field('firstPage', '51')
                    .field('lastPage', '95')
                    .field('textualPdf', false)
                    .field('resourceType', resourceType.bookChapter)
                    .attach('binaryFile', './test/api/data/ocr_data/02_input.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array().and.have.lengthOf(3);
                        res.body[0].should.have.property("bookChapter_title", "Arms Control: Lessons Learned and the Future");
                        res.body[0].should.have.property("bookChapter_embodiedAs");
                        res.body[0].bookChapter_embodiedAs.should.be.Array;
                        res.body[0].bookChapter_embodiedAs.should.have.lengthOf(1);
                        res.body[1].should.have.property("editedBook_title", "Modelling and analysis in arms control :");
                        res.body[0].bookChapter_embodiedAs[0].should.have.property("scans");
                        res.body[0].bookChapter_embodiedAs[0].scans.should.be.Array;
                        res.body[0].bookChapter_embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[0].bookChapter_embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[0].bookChapter_embodiedAs[0].scans[0].should.have.property("textualPdf", false);
                        res.body[2].should.deepEqual(res.body[0].bookChapter_embodiedAs[0].scans[0]);
                        res.body[0].should.have.property("partOf");
                        res.body[1]._id.should.be.exactly(res.body[0].partOf);
                        should(fs.existsSync(config.PATHS.UPLOAD)).equal(true);
                        should(fs.existsSync(config.PATHS.UPLOAD + res.body[0].bookChapter_embodiedAs[0].scans[0].scanName)).equal(true);
                        done();
                    });
            });

            it('should should add a new part to an already existing br: pdf', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'SWB_PPN')
                    .field('identifierLiteralValue', '012678775')
                    .field('firstPage', '33')
                    .field('lastPage', '41')
                    .field('textualPdf', true)
                    .field('resourceType', resourceType.bookChapter)
                    .attach('binaryFile', './test/api/data/ocr_data/references.pdf')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body[1].should.have.property("editedBook_title", "Modelling and analysis in arms control :");
                        res.body[0].should.have.property("bookChapter_embodiedAs");
                        res.body[0].bookChapter_embodiedAs.should.be.Array;
                        res.body[0].bookChapter_embodiedAs.should.have.lengthOf(1);
                        res.body[1].should.have.property("editedBook_embodiedAs");
                        res.body[0].should.have.property("bookChapter_title", "Arms Control and Strategic Military Stability");
                        res.body[0].bookChapter_embodiedAs[0].should.have.property("scans");
                        res.body[0].bookChapter_embodiedAs[0].scans.should.be.Array;
                        res.body[0].bookChapter_embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[0].bookChapter_embodiedAs[0].scans[0].should.have.property("textualPdf", true);
                        res.body[0].bookChapter_embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[2].should.deepEqual(res.body[0].bookChapter_embodiedAs[0].scans[0]);
                        res.body[0].should.have.property("partOf");
                        res.body[1]._id.should.be.exactly(res.body[0].partOf);
                        should(fs.existsSync(config.PATHS.UPLOAD)).equal(true);
                        should(fs.existsSync(config.PATHS.UPLOAD + res.body[0].bookChapter_embodiedAs[0].scans[0].scanName)).equal(true);
                        //idPdf = res.body[1].embodiedAs[0].scans[0]._id;
                        done();
                    });
            });

            it('should append another file to the resource', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'SWB_PPN')
                    .field('identifierLiteralValue', '012678775')
                    .field('firstPage', '33')
                    .field('lastPage', '41')
                    .field('textualPdf', false)
                    .field('resourceType', resourceType.bookChapter)
                    .attach('binaryFile', './test/api/data/ocr_data/references.pdf')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array().and.have.lengthOf(3);
                        res.body[0].bookChapter_embodiedAs[0].scans.should.have.lengthOf(2);
                        done();
                    });
            });

            it('should return 400', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme', 'SWB_PPN')
                    .field('identifierLiteralValue', '012678775')
                    .field('firstPage', '33')
                    .field('lastPage', '41')
                    .field('resourceType', resourceType.bookChapter)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
                        done();
                    });
            });
        });


        describe('POST /saveResource - Resource Type: MONOGRAPH', function () {

            it('should save a scan in the file system and create a single br in the db', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme','SWB_PPN')
                    .field('identifierLiteralValue', '004000951')
                    .field('resourceType', resourceType.monograph)
                    .field('textualPdf', false)
                    .attach('binaryFile', './test/api/data/ocr_data/02_input.png')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.should.be.Array;
                        res.body[0].should.have.property("book_embodiedAs");
                        res.body[0].book_embodiedAs.should.be.Array;
                        res.body[0].book_embodiedAs.should.have.lengthOf(1);
                        res.body[0].book_embodiedAs[0].should.have.property("scans");
                        res.body[0].book_embodiedAs[0].scans.should.be.Array;
                        res.body[0].book_embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body[0].book_embodiedAs[0].scans[0].should.have.property("scanName");
                        res.body[0].book_embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                        res.body[1].should.deepEqual(res.body[0].book_embodiedAs[0].scans[0]);
                        res.body[0].should.have.property("book_title", "Handbuch der empirischen Sozialforschung /");
                        res.body[0].should.have.property("book_publicationYear", "19uu");
                        var scanPath = config.PATHS.UPLOAD + res.body[0].book_embodiedAs[0].scans[0].scanName;
                        fs.exists(scanPath, function(result){
                            result.should.equal(true);
                            mongoBr.findOne({_id: res.body[0]._id}, function(err, br){
                                br.should.be.ok;
                                br.should.have.property("book_embodiedAs");
                                br.book_embodiedAs.should.be.Array;
                                br.book_embodiedAs.should.have.lengthOf(1);
                                br.book_embodiedAs[0].should.have.property("scans");
                                br.book_embodiedAs[0].scans.should.be.Array;
                                br.book_embodiedAs[0].scans.should.have.lengthOf(1);
                                br.book_embodiedAs[0].scans[0].should.have.property("scanName");
                                br.book_embodiedAs[0].scans[0].should.have.property("status", status.notOcrProcessed);
                                br.should.have.property("book_title", "Handbuch der empirischen Sozialforschung /");
                                br.should.have.property("book_publicationYear", "19uu");
                                done();
                            });
                        });
                    });
            });



            it('should return 400', function (done) {
                agent
                    .post('/saveResource')
                    .type('form')
                    .field('identifierScheme','SWB_PPN')
                    .field('identifierLiteralValue', '004000951')
                    .field('resourceType', resourceType.monograph)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(400)
                    .end(function (err, res) {
                        should.not.exist(err);
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
                        res.body.should.have.lengthOf(3);
                        res.body[0].should.have.property("children");
                        res.body[0].children.should.have.lengthOf(1);
                        id = res.body[0].children[0].journalArticle_embodiedAs[0].scans[0]._id;
                        idPdf = res.body[1].children[0].bookChapter_embodiedAs[0].scans[0]._id;
                        done();
                    });
            });

            it('should retrieve a todo list for the status "OCR_PROCESSED"', function (done) {
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
                            res.body.should.have.lengthOf(4);
                            res.body[0].should.have.property("children");
                            res.body[1].should.have.property("children");
                            res.body[2].should.not.have.property("children");
                            res.body[1].children.should.be.Array();
                            res.body[1].children.should.have.lengthOf(2);
                            res.body[0].children.should.be.Array();
                            res.body[0].children.should.have.lengthOf(1);
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
                        should.not.exist(err);
                        res.body.should.not.be.Array;
                        res.body.should.have.property("_id");
                        res.body.should.have.property("journalArticle_embodiedAs");
                        res.body.journalArticle_embodiedAs.should.be.Array;
                        res.body.journalArticle_embodiedAs.should.have.lengthOf(1);
                        res.body.journalArticle_embodiedAs[0].should.have.property("scans");
                        res.body.should.have.property("partOf");
                        res.body.journalArticle_embodiedAs[0].scans.should.be.Array;
                        res.body.journalArticle_embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body.parts.should.be.Array;
                        res.body.parts.should.have.lengthOf(48);
                        res.body.journalArticle_embodiedAs[0].scans[0].status.should.be.exactly(status.ocrProcessed);
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
                        res.body.should.have.property("bookChapter_embodiedAs");
                        res.body.bookChapter_embodiedAs.should.be.Array;
                        res.body.bookChapter_embodiedAs.should.have.lengthOf(1);
                        res.body.bookChapter_embodiedAs[0].should.have.property("scans");
                        res.body.should.have.property("partOf");
                        res.body.bookChapter_embodiedAs[0].scans.should.be.Array;
                        res.body.bookChapter_embodiedAs[0].scans.should.have.lengthOf(1);
                        res.body.parts.should.be.Array;
                        res.body.bookChapter_embodiedAs[0].scans[0].status.should.be.exactly(status.ocrProcessed);
                        res.body.bookChapter_embodiedAs[0].scans[0].should.have.property("scanName", idPdf+".png");
                        done();
                    });
            });
        });

        describe('GET /getToDo', function () {
            it('should retrieve an todo list for the status "OCR_PROCESSED" of size 2', function (done) {
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
                        res.body.should.have.lengthOf(3);
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


    });
});
