/**
 * Created by anlausch on 14/8/2017.
 */

const should = require('should');
const setup = require('./../setup.js').createSetup();
const databaseHelper = require('./../../../api/helpers/databaseHelper.js').createDatabaseHelper();
const fs = require('fs');
const enums = require('./../../../api/schema/enum.json');
const config = require('./../../../config/config');

describe('helpers', function() {
    describe('databaseHelper', function() {
        var scan;
        var ppn = "004000951";
        before(function(done) {
            this.timeout(3000);
            setup.dropDB(function(err){
                fs.readFile('./test/api/data/ocr_example_1/0002.png', function(err,res){
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

        after(function(done) {
            setup.dropDB(function(err){
                done();
            });
        });

        describe('saveScan', function(){
            it('should save a scan with a unique id in the file system', function(done) {
                databaseHelper.saveScan(scan, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.have.property("scanName");
                    result.should.have.property("status", enums.status.notOcrProcessed);
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
                databaseHelper.saveScanAndRetrieveMetadata(scan, ppn, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.Array;
                    result[0].should.have.property("scanName");
                    result[0].should.have.property("status", enums.status.notOcrProcessed);
                    result[1].should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                    //result[1].should.have.property("publicationYear", 2006);
                    var scanPath = config.PATHS.UPLOAD + result[0].scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        done();
                    });
                });
            });
        });

        describe('saveIndependentPrintResource', function(){
            it('should save a scan in the file system, retrieve the meta data via ppn, and save br and scan in the db', function(done) {
                databaseHelper.saveIndependentPrintResource(scan, ppn, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.have.property("embodiedAs");
                    result.embodiedAs.should.be.Array;
                    result.embodiedAs.should.have.lengthOf(1);
                    result.embodiedAs[0].should.have.property("scans");
                    result.embodiedAs[0].scans.should.be.Array;
                    result.embodiedAs[0].scans.should.have.lengthOf(1);
                    result.embodiedAs[0].scans[0].should.have.property("scanName");
                    result.embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                    result.should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                    result.should.have.property("publicationYear", "19uu");
                    var scanPath = config.PATHS.UPLOAD + result.embodiedAs[0].scans[0].scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        done();
                    });
                });
            });

            it('should save a scan in the file system and save br and scan in the db', function(done) {
                databaseHelper.saveIndependentPrintResource(scan, ppn, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.have.property("embodiedAs");
                    result.embodiedAs.should.be.Array;
                    result.embodiedAs.should.have.lengthOf(1);
                    result.embodiedAs[0].should.have.property("scans");
                    result.embodiedAs[0].scans.should.be.Array;
                    result.embodiedAs[0].scans.should.have.lengthOf(2);
                    result.embodiedAs[0].scans[0].should.have.property("scanName");
                    result.embodiedAs[0].scans[0].should.have.property("status", enums.status.notOcrProcessed);
                    result.should.have.property("title", "Handbuch der empirischen Sozialforschung /");
                    result.should.have.property("publicationYear", "19uu");
                    var scanPath = config.PATHS.UPLOAD + result.embodiedAs[0].scans[0].scanName;
                    fs.exists(scanPath, function(res){
                        res.should.equal(true);
                        done();
                    });
                });
            });
        });
    });
});