/**
 * Created by anlausch on 10/6/2017.
 */
const should = require('should');
const setup = require('./../setup.js').createSetup();
const statsHelper = require('./../../../api/helpers/statsHelper.js').createStatsHelper();
const mongoBr = require('./../../../api/models/bibliographicResource').mongoBr;
const enums = require('./../../../api/schema/enum.json');


describe('helpers', function() {
    describe('statsHelper', function() {
        before(function (done) {
            this.timeout(1000000000);
            setup.dropDB(function (err) {
                setup.loadBibliographicResources(function(err,res){
                    setup.loadBookChapter(function(err,res){
                        done();
                    });
                });
            });
        });

        after(function (done) {
            setup.dropDB(function (err) {
                done();
            });
        });


        describe('mandatoryFieldsStats', function () {
            it('should compute mandatory fields stats for type BOOK', function (done) {
                mongoBr.find({"type": enums.resourceType.book}, function (err, docs) {
                    docs.push(new mongoBr({"type": enums.resourceType.book}));
                    statsHelper.mandatoryFieldsBook(docs, function (err, res) {
                        should.not.exists(err);
                        res.should.have.property("contributorStats");
                        done();
                    });
                });
            });

            it('should compute mandatory fields stats for type BOOK_CHAPTER', function (done) {
                mongoBr.find({"type": enums.resourceType.bookChapter}, function (err, docs) {
                    docs.push(new mongoBr({"type": enums.resourceType.bookChapter}));
                    statsHelper.mandatoryFieldsBookChapter(docs, function (err, res) {
                        should.not.exists(err);
                        res.should.have.property("contributorStats");
                        done();
                    });
                });
            });

            it('should compute mandatory fields stats all types', function (done) {
                this.timeout(100000);
                setup.loadBibliographicResourcesForStats(function(err, res){
                    statsHelper.mandatoryFieldsStats(function (err, res) {
                        should.not.exists(err);
                        res.should.have.property(enums.resourceType.book);
                        done();
                    });
                });
            });
        });
    });
});