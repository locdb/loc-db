const should = require('should');
const setup = require('./../setup.js').createSetup();
const aPlusPlusHelper = require('./../../../api/helpers/aPlusPlusHelper.js').createAPlusPlusHelper();
const fs = require('fs')

describe('helpers', function() {
    describe('aPlusPlusHelper', function() {
        before(function(done) {
            setup.dropDB();
            done();
        });
        
        after(function(done) {
            setup.dropDB();
            done();
        });
        
        describe('parseFile', function(){
            it('should return a parsed bibliographic resource', function(done) {
                aPlusPlusHelper.parseFile("./test/api/data/aPlusPlus.xml", function(result){
                    console.log(result);
                    done();
                });
                
            });
        });
    });
});