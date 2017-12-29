/**
 * Created by anlausch on 14/8/2017.
 */

const should = require('should');
const setup = require('./../setup.js').createSetup();
const databaseHelper = require('./../../../api/helpers/databaseHelper.js').createDatabaseHelper();
const fs = require('fs');
const enums = require('./../../../api/schema/enum.json');
const config = require('./../../../config/config');
const mongoBr = require('./../../../api/models/bibliographicResource.js');

describe('helpers', function() {
    describe('databaseHelper', function() {
        var scan;
        var ppnIndependent = "004000951";
        var ppnDependent = "06453832X";
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

        describe('saveScanAndRetrieveMetadata', function(){
            it('should save a scan in the file system and retrieve the meta data via ppn', function(done) {
                databaseHelper.saveScanAndRetrieveMetadata(scan, ppnIndependent, enums.resourceType.collection, true, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.Array;
                    result[0].should.have.property("scanName");
                    result[0].should.have.property("status", enums.status.notOcrProcessed);
                    result[0].should.have.property("textualPdf", true);
                    result[1].should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                    //result[1].should.have.property("publicationYear", 2006);
                    var scanPath = config.PATHS.UPLOAD + result[0].scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        mongoBr.findOne({_id: result[1]._id}, function(err, br){
                            should.not.exist(br);
                            done();
                        });

                    });
                });
            });
        });

        describe('saveIndependentPrintResource', function(){
            it('should save a scan in the file system, retrieve the meta data via ppn, and save br and scan in the db', function(done) {
                databaseHelper.saveIndependentPrintResource(scan, ppnIndependent, enums.resourceType.monograph, false, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result[0].should.have.property("embodiedAs");
                    result[0].embodiedAs.should.be.Array;
                    result[0].embodiedAs.should.have.lengthOf(1);
                    result[0].embodiedAs[0].should.have.property("scans");
                    result[0].embodiedAs[0].scans.should.be.Array;
                    result[0].embodiedAs[0].scans.should.have.lengthOf(1);
                    result[0].embodiedAs[0].scans[0].should.have.property("scanName");
                    result[0].embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                    result[0].embodiedAs[0].scans[0].should.have.property("textualPdf", false);
                    result[0].should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                    result[0].should.have.property("publicationYear", "19uu");
                    var scanPath = config.PATHS.UPLOAD + result[0].embodiedAs[0].scans[0].scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        mongoBr.findOne({_id: result[0]._id}, function(err, br){
                            br.should.be.ok;
                            result[0].should.have.property("embodiedAs");
                            br.embodiedAs.should.be.Array;
                            br.embodiedAs.should.have.lengthOf(1);
                            br.embodiedAs[0].should.have.property("scans");
                            br.embodiedAs[0].scans.should.be.Array;
                            br.embodiedAs[0].scans.should.have.lengthOf(1);
                            br.embodiedAs[0].scans[0].should.have.property("scanName");
                            br.embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                            br.should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                            br.should.have.property("publicationYear", "19uu");
                            done();
                        });
                    });
                });
            });

            it('should save a scan in the file system and save br and scan in the db', function(done) {
                databaseHelper.saveIndependentPrintResource(scan, ppnIndependent, enums.resourceType.monograph, true, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result[0].should.have.property("embodiedAs");
                    result[0].embodiedAs.should.be.Array;
                    result[0].embodiedAs.should.have.lengthOf(1);
                    result[0].embodiedAs[0].should.have.property("scans");
                    result[0].embodiedAs[0].scans.should.be.Array;
                    result[0].embodiedAs[0].scans.should.have.lengthOf(2);
                    result[0].embodiedAs[0].scans[1].should.have.property("scanName");
                    result[0].embodiedAs[0].scans[1].should.have.property("status", enums.status.notOcrProcessed);
                    result[0].embodiedAs[0].scans[1].should.have.property("textualPdf", true);
                    result[0].should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                    result[0].should.have.property("publicationYear", "19uu");
                    var scanPath = config.PATHS.UPLOAD + result[0].embodiedAs[0].scans[1].scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        mongoBr.findOne({_id: result[0]._id}, function(err, br){
                            br.should.be.ok;
                            result[0].should.have.property("embodiedAs");
                            br.embodiedAs.should.be.Array;
                            br.embodiedAs.should.have.lengthOf(1);
                            br.embodiedAs[0].should.have.property("scans");
                            br.embodiedAs[0].scans.should.be.Array;
                            br.embodiedAs[0].scans.should.have.lengthOf(2);
                            br.embodiedAs[0].scans[1].should.have.property("scanName");
                            br.embodiedAs[0].scans[1].should.have.property("status", enums.status.notOcrProcessed);
                            br.should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                            br.should.have.property("publicationYear", "19uu");
                            done();
                        });
                    });
                });
            });
        });

        describe.skip('saveDependentPrintResource', function(){
            var parentId;
            var childId;

            it('should save a scan in the file system, retrieve the meta data of the container resource via ppn, ' +
                'and save the parent br and the child br and the scan in the db', function(done) {
                var firstPage = 10;
                var lastPage = 15;
                databaseHelper.saveDependentPrintResource(scan, firstPage, lastPage, ppnDependent, enums.resourceType.collection, false, function(err, result){
                    should.not.exists(err);
                    result.should.be.Array;
                    result.should.have.lengthOf(2);
                    result[0].should.have.property("title", "Zeitschrift für Soziologie der Erziehung und Sozialisation :");
                    result[0].should.have.property("subtitle", "ZSE = Journal for sociology of education and socialization");
                    result[0].should.have.property("publicationYear", "1998");
                    result[1].should.have.property("partOf", result[0]._id.toString());
                    result[1].should.have.property("embodiedAs");
                    result[1].embodiedAs.should.be.Array;
                    result[1].embodiedAs.should.have.lengthOf(1);
                    result[1].embodiedAs[0].scans.should.be.Array;
                    result[1].embodiedAs[0].scans.should.have.lengthOf(1);
                    result[1].embodiedAs[0].scans[0].should.have.property("scanName");
                    result[1].embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                    result[1].embodiedAs[0].scans[0].should.have.property("textualPdf", false);
                    result[1].embodiedAs[0].should.have.property("type", enums.embodimentType.print);
                    parentId = result[0]._id;
                    childId = result[1]._id;
                    var scanPath = config.PATHS.UPLOAD + result[1].embodiedAs[0].scans[0].scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        mongoBr.findOne({_id: result[0]._id}, function(err, parent){
                            parent.should.be.ok;
                            parent.should.have.property("title", "Zeitschrift für Soziologie der Erziehung und Sozialisation :");
                            parent.should.have.property("subtitle", "ZSE = Journal for sociology of education and socialization");
                            parent.should.have.property("publicationYear", "1998");
                            mongoBr.findOne({_id: result[1]._id}, function(err, child){
                                child.should.be.ok;
                                child.should.have.property("partOf", result[0]._id.toString());
                                child.should.have.property("embodiedAs");
                                child.embodiedAs.should.be.Array;
                                child.embodiedAs.should.have.lengthOf(1);
                                child.embodiedAs[0].scans.should.be.Array;
                                child.embodiedAs[0].scans.should.have.lengthOf(1);
                                child.embodiedAs[0].scans[0].should.have.property("scanName");
                                child.embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                                child.embodiedAs[0].scans[0].should.have.property("textualPdf", false);
                                child.embodiedAs[0].should.have.property("type", enums.embodimentType.print);
                                done();
                            });
                        });
                    });
                });
            });

            it('should save a scan in the file system ' +
                'and leave the parent br as it was and add a new scan to the child br', function(done) {
                var firstPage = 10;
                var lastPage = 15;
                databaseHelper.saveDependentPrintResource(scan, firstPage, lastPage, ppnDependent, enums.resourceType.collection, true, function(err, result){
                    should.not.exists(err);
                    result.should.be.Array;
                    result.should.have.lengthOf(2);
                    result[0].should.have.property("_id", parentId);
                    result[0].should.have.property("title", "Zeitschrift für Soziologie der Erziehung und Sozialisation :");
                    result[0].should.have.property("subtitle", "ZSE = Journal for sociology of education and socialization");
                    result[0].should.have.property("publicationYear", "1998");
                    result[1].should.have.property("_id", childId);
                    result[1].should.have.property("partOf", result[0]._id.toString());
                    result[1].should.have.property("embodiedAs");
                    result[1].embodiedAs.should.be.Array;
                    result[1].embodiedAs.should.have.lengthOf(1);
                    result[1].embodiedAs[0].scans.should.be.Array;
                    result[1].embodiedAs[0].scans.should.have.lengthOf(2);
                    result[1].embodiedAs[0].scans[0].should.have.property("scanName");
                    result[1].embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                    result[1].embodiedAs[0].should.have.property("type", enums.embodimentType.print);
                    var scanPath = config.PATHS.UPLOAD + result[1].embodiedAs[0].scans[0].scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        mongoBr.findOne({_id: result[0]._id}, function(err, parent){
                            parent.should.be.ok;
                            parent.should.have.property("title", "Zeitschrift für Soziologie der Erziehung und Sozialisation :");
                            parent.should.have.property("subtitle", "ZSE = Journal for sociology of education and socialization");
                            parent.should.have.property("publicationYear", "1998");
                            mongoBr.findOne({_id: result[1]._id}, function(err, child){
                                child.should.be.ok;
                                child.should.have.property("partOf", result[0]._id.toString());
                                child.should.have.property("embodiedAs");
                                child.embodiedAs.should.be.Array;
                                child.embodiedAs.should.have.lengthOf(1);
                                child.embodiedAs[0].scans.should.be.Array;
                                child.embodiedAs[0].scans.should.have.lengthOf(2);
                                child.embodiedAs[0].scans[0].should.have.property("scanName");
                                child.embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                                child.embodiedAs[0].scans[0].should.have.property("textualPdf", true);
                                child.embodiedAs[0].should.have.property("type", enums.embodimentType.print);
                                done();
                            });
                        });
                    });
                });
            });

            it('should save a scan in the file system ' +
                'and leave the parent br as it was and add a new scan to a new child br', function(done) {
                var firstPage = 16;
                var lastPage = 30;
                databaseHelper.saveDependentPrintResource(scan, firstPage, lastPage, ppnDependent, enums.resourceType.collection, false, function(err, result){
                    should.not.exists(err);
                    result.should.be.Array;
                    result.should.have.lengthOf(2);
                    result[0].should.have.property("_id", parentId);
                    result[0].should.have.property("title", "Zeitschrift für Soziologie der Erziehung und Sozialisation :");
                    result[0].should.have.property("subtitle", "ZSE = Journal for sociology of education and socialization");
                    result[0].should.have.property("publicationYear", "1998");
                    result[1]._id.should.not.equal(childId);
                    result[1].should.have.property("partOf", result[0]._id.toString());
                    result[1].should.have.property("embodiedAs");
                    result[1].embodiedAs.should.be.Array;
                    result[1].embodiedAs.should.have.lengthOf(1);
                    result[1].embodiedAs[0].scans.should.be.Array;
                    result[1].embodiedAs[0].scans.should.have.lengthOf(1);
                    result[1].embodiedAs[0].scans[0].should.have.property("scanName");
                    result[1].embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                    result[1].embodiedAs[0].should.have.property("type", enums.embodimentType.print);
                    var scanPath = config.PATHS.UPLOAD + result[1].embodiedAs[0].scans[0].scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        mongoBr.findOne({_id: result[0]._id}, function(err, parent){
                            parent.should.be.ok;
                            parent.should.have.property("title", "Zeitschrift für Soziologie der Erziehung und Sozialisation :");
                            parent.should.have.property("subtitle", "ZSE = Journal for sociology of education and socialization");
                            parent.should.have.property("publicationYear", "1998");
                            mongoBr.findOne({_id: result[1]._id}, function(err, child){
                                child.should.be.ok;
                                child.should.have.property("partOf", result[0]._id.toString());
                                child.should.have.property("embodiedAs");
                                child.embodiedAs.should.be.Array;
                                child.embodiedAs.should.have.lengthOf(1);
                                child.embodiedAs[0].scans.should.be.Array;
                                child.embodiedAs[0].scans.should.have.lengthOf(1);
                                child.embodiedAs[0].scans[0].should.have.property("scanName");
                                child.embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                                child.embodiedAs[0].should.have.property("type", enums.embodimentType.print);
                                child.embodiedAs[0].scans[0].should.have.property("textualPdf", false);
                                mongoBr.find({partOf: parentId}, function(err, children) {
                                    children.should.be.Array;
                                    children.should.have.lengthOf(2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        describe.only('resourceExists', function() {
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