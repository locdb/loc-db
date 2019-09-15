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

        describe.only('convertFile', function(){
            it('should return OC data as n quads', function(done) {
                // this.timeout(1000000000);
                OCExporter.clear();
                OCExporter.convertFile('./test/api/data/bibliographicResources516.json', function(err) {
                    if (!err) {
                        OCExporter.getNQUADS(function(err, nquads){
                            console.log(nquads);
                            done();
                        });
                    }
                });
            });
        });
        describe.only('writeJSON', function(){
            it('should write JSON to console', function(done) {
                OCExporter.clear();
                OCExporter.addTriple("http://example.org/1", "datacite:Identifier", "http://identifier");
                OCExporter.addTriple("http://example.org/1", "dcterms:title", "Hallo");
                OCExporter.addTriple("http://identifier", "literal:hasLiteralValue", "id123");
                // this.writer.addQuad(N3.DataFactory.namedNode("http://example.org/1"), N3.DataFactory.namedNode(this.expand("datacite:identifier")), N3.DataFactory.literal("123"))
                OCExporter.getJSONLD(function(err, doc){
                        doc.should.have.property("@graph");
                        doc["@graph"][0].should.have.property("title", "Hallo");
                        done();
                    });
            });
        });
    });
});