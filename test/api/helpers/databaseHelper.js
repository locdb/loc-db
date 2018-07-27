/**
 * Created by anlausch on 14/8/2017.
 */

const should = require('should');
const setup = require('./../setup.js').createSetup();
const databaseHelper = require('./../../../api/helpers/databaseHelper.js').createDatabaseHelper();
const fs = require('fs');
const enums = require('./../../../api/schema/enum.json');
const config = require('./../../../config/config');
const mongoBr = require('./../../../api/models/bibliographicResource.js').mongoBr;

describe('helpers', function() {
    describe('databaseHelper', function() {
        var scan;
        before(function(done) {
            this.timeout(3000);
            setup.dropDB(function(err){
                setup.loadBibliographicResources(function(err,res){
                    fs.readFile('./test/api/data/ocr_data/02_input.png', function(err,res){
                        if(err){
                            done(err);
                        }
                        else{
                            scan = res;
                            done();
                        }
                    });
                });
            });
        });

        after(function(done) {
            setup.dropDB(function(err){
                done();
            });
        });

        describe('saveScan', function(){
            it('should save a scan with a unique id in the file system', function(done) {
                databaseHelper.saveScan(scan, false, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.have.property("scanName");
                    result.should.have.property("status", enums.status.notOcrProcessed);
                    result.should.have.property("textualPdf", false);
                    var scanPath = config.PATHS.UPLOAD + result.scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        done();
                    });
                });
            });
        });

        describe('resourceExists', function() {
            it('should check that the resource does not exist', function (done) {
                var identifier = {
                    scheme : 'DOI',
                    literalValue: '10.2307/2141399'
                };
                var resourceType = enums.resourceType.journalArticle;
                var firstPage = null;
                var lastPage = null;
                databaseHelper.resourceExists(identifier,resourceType,firstPage, lastPage, function (err, result) {
                    should.not.exists(err);
                    should.not.exists(result);
                    done();
                });
            });


            it('should check that the resource does exist', function (done) {
                var identifier = {
                    scheme : 'DOI',
                    literalValue: '10.1515/9783110379709'
                };
                var resourceType = enums.resourceType.monograph;
                var firstPage = null;
                var lastPage = null;
                databaseHelper.resourceExists(identifier,resourceType,firstPage, lastPage, function (err, result) {
                    should.not.exists(err);
                    should.exists(result);
                    result.should.have.lengthOf(1);
                    done();
                });
            });

            it('should check that the resource does not exist', function (done) {
                var identifier = {
                    scheme : 'SWB_PPN',
                    literalValue: '48525302X'
                };
                var resourceType = enums.resourceType.bookChapter;
                var firstPage = 94;
                var lastPage = 95;
                databaseHelper.resourceExists(identifier,resourceType,firstPage, lastPage, function (err, result) {
                    should.not.exists(err);
                    should.not.exists(result);
                    done();
                });
            });

            it('should check that the resource does exist', function (done) {
                setup.loadBookChapter(function(err, res){
                    var identifier = {
                        scheme : 'SWB_PPN',
                        literalValue: '48525302X'
                    };
                    var resourceType = enums.resourceType.bookChapter;
                    var firstPage = 94;
                    var lastPage = 95;
                    databaseHelper.resourceExists(identifier,resourceType,firstPage, lastPage, function (err, result) {
                        should.not.exists(err);
                        should.exists(result);
                        result.should.have.lengthOf(2);
                        done();
                    });
                });
            });
        });
    });
});