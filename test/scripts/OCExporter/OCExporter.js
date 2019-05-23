const should = require('should');
const setup = require('./../../api/setup').createSetup();
const OCExporter = require('./../../../scripts/OCExporter/OCExporter.js').createOCExporter();


describe('scripts', function() {
    describe('OCExporter', function() {
        before(function(done) {
           done();
        });

        after(function(done) {
            done();
        });

        describe.only('parseFile', function(){
            it('should return result the content of a JS File', function(done) {
                // this.timeout(1000000000);
                OCExporter.parseFile('./test/api/data/bibliographicResources516.json', function(brs) {
                    done();
                });
            });
        });
    });
});