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
    describe.only('databaseHelper', function() {
        var scan;
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
    });
});