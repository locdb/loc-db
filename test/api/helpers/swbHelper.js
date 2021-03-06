/**
 * Created by anlausch on 16/8/2017.
 */
"use strict";

const should = require('should');
const setup = require('./../setup.js').createSetup();
const swbHelper = require('./../../../api/helpers/swbHelper').createSwbHelper();
const enums = require('./../../../api/schema/enum.json');

describe('helpers', function() {
    describe('swbHelper', function() {
        before(function(done) {
            setup.dropDB(function(err){
                done();
            });
        });

        after(function(done) {
            setup.dropDB(function(err){
                done();
            });
        });

        describe('queryByTitle', function(){
            this.timeout(100000)
            it('should return a result for a given query', function(done) {
                swbHelper.queryByTitle("Test", function(err, result){
                    result.should.be.ok;
                    result.should.be.Array;
                    result.should.have.lengthOf(5);
                    console.log(result);
                    done();
                });
            });
        });

        describe('queryBookSet', function(){
            this.timeout(100000)
            it('should return a result for a given query', function(done) {
                swbHelper.query("006370462", enums.resourceType.book, function(err, result){
                    result.should.be.ok;
                    result.should.be.Array;
                    result.should.have.lengthOf(2);
                    result[0].should.have.property("monograph_title", "Essays und Reden /");
                    result[0].should.have.property("monograph_number", "8");
                    result[1].should.have.property("bookSet_title", "Gesammelte Werke.");
                    done();
                });
            });
        });

        describe('queryOLC', function(){
            this.timeout(100000)
            it('should return a result for a given query', function(done) {
                swbHelper.queryOLC("1994632569", function(err, result){
                    result[0].should.be.ok;
                    result[0].should.be.Object;
                    result[0].should.have.property("journalArticle_title","The strong referendum paradox");
                    done();
                });
            });
        });
    });
});