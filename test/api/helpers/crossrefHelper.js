const should = require('should');
const setup = require('./../setup.js').createSetup();
const crossrefHelper = require('./../../../api/helpers/crossrefHelper.js').createCrossrefHelper();
const enums = require('./../../../api/schema/enum.json');
const book = require('./../data/crossref/book.json');
const bookChapter = require('./../data/crossref/bookChapter.json');
const monograph = require('./../data/crossref/monograph.json');
const journalArticle = require('./../data/crossref/journalArticle.json');

describe('helpers', function() {
    describe('crossrefHelper', function() {
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

        describe('query', function(){
            it('should return result for a given query', function(done) {
                this.timeout(1000000000);
                crossrefHelper.query("The association between social capital and juvenile crime: The role of individual and structural factors.", function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result.should.have.lengthOf(20);
                    result[0][0].should.have.property("journalArticle_embodiedAs").which.is.Array();
                    result[0][0].journalArticle_embodiedAs[0].should.have.property("firstPage");
                    result[1][1].should.have.property("journal_identifiers");
                    result[0][0].should.have.property("journalArticle_title", "The Association between Social Capital and Juvenile Crime");
                    result[1][1].journal_identifiers.should.be.Array();
                    result[1][0].journalArticle_identifiers.should.have.lengthOf(2);
                    result[1][0].journalArticle_identifiers[1].should.have.property("scheme", enums.identifier.crossrefUrl);
                    done();
                });
            });
        });

/*        describe('queryReferences', function(){

            it('should return result for a given doi', function(done) {
                this.timeout(1000000000);
                crossrefHelper.queryReferences("10.1007/s11617-006-0056-1", null, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result.should.have.lengthOf(1);
                    result[0][0].should.have.property("journalArticle_identifiers");
                    result[0][0].journalArticle_identifiers.should.be.Array();
                    result[0][0].journalArticle_identifiers.should.have.lengthOf(2);
                    result[0][0].journalArticle_identifiers[1].should.have.property("scheme", enums.externalSources.crossref);
                    result[0][0].should.have.property("parts");
                    result[0][0].parts.should.be.Array;
                    result[0][0].parts.should.have.lengthOf(25);
                    result[0][0].parts[0].should.have.property("identifiers");
                    result[0][0].parts[0].identifiers.should.be.Array;
                    result[0][0].parts[0].identifiers.should.have.lengthOf(1);
                    result[0][0].parts[0].identifiers[0].should.have.property("scheme", enums.identifier.doi);
                    done();
                });
            });
        });*/

        describe('queryByDOI', function(){

            it('should return result for a given doi', function(done) {
                this.timeout(1000000000);
                crossrefHelper.queryByDOI("10.1007/s11617-006-0056-1", function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result[0].should.have.property("journalArticle_identifiers");
                    result[0].journalArticle_identifiers.should.be.Array();
                    result[0].journalArticle_identifiers.should.have.lengthOf(2);
                    result[0].journalArticle_identifiers[1].should.have.property("scheme", enums.identifier.crossrefUrl);
                    result[0].should.have.property("parts");
                    result[0].parts.should.be.Array;
                    result[0].parts.should.have.lengthOf(25);
                    result[0].parts[0].should.have.property("identifiers");
                    result[0].parts[0].identifiers.should.be.Array;
                    result[0].parts[0].identifiers.should.have.lengthOf(1);
                    result[0].parts[0].identifiers[0].should.have.property("scheme", enums.identifier.doi);
                    done();
                });
            });
        });

        describe('queryChapterMetaData', function(){

            it('should return result given title and pages', function(done) {
                this.timeout(1000000000);
                crossrefHelper.queryChapterMetaData("Modelling and analysis in arms control", 51,95, function(err, result){
                    console.log(result);
                    should.not.exists(err);
                    result.should.be.ok();
                    result.should.be.Array();
                    result.should.have.lengthOf(2);
                    result[0].should.have.property("bookChapter_identifiers");
                    result[0].bookChapter_identifiers.should.be.Array();
                    result[0].bookChapter_identifiers[1].should.have.property("scheme", enums.identifier.crossrefUrl);
                    result[0].should.have.property("bookChapter_title", "Arms Control: Lessons Learned and the Future");
                    done();
                });
            });
        });

        describe('parseIndependentResource', function(){


            it('should return a parsed resource of type BOOK (http://api.crossref.org/works/10.17104/9783406697630)', function(done) {

                var resource = {
                    "book_identifiers": [
                        {
                            "literalValue": "10.1079/9781780648903.0000",
                            "scheme": "DOI"
                        },
                        {
                            "literalValue": "http://dx.doi.org/10.1079/9781780648903.0000",
                            "scheme": "URL_CROSSREF"
                        },
                        {
                            "literalValue": "9781780648903",
                            "scheme": "ISBN"
                        }
                    ],
                    "type": "BOOK",
                    "book_title": "Climate change and cotton production in modern farming systems",
                    "book_subtitle": "",
                    "book_contributors": [
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "M. P.",
                                "familyName": "Bange"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "J. T.",
                                "familyName": "Baker"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "P. J.",
                                "familyName": "Bauer"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "K. J.",
                                "familyName": "Broughton"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "G. A.",
                                "familyName": "Constable"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "Q.",
                                "familyName": "Luo"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "D. M.",
                                "familyName": "Oosterhuis"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "Y.",
                                "familyName": "Osanai"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "P.",
                                "familyName": "Payton"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "D. T.",
                                "familyName": "Tissue"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "K. R.",
                                "familyName": "Reddy"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "givenName": "B. K.",
                                "familyName": "Singh"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "CABI"
                            }
                        }
                    ],
                    "book_publicationYear": "2016"
                };

                crossrefHelper.parseObjects(book, function(err, res){
                    res.should.be.Array().and.have.lengthOf(1);
                    res[0].should.be.Array().and.have.lengthOf(1);
                    res[0][0].toObject().should.deepEqual(resource);
                    done();
                });
            });

            it('should return a parsed resource of type MONOGRAPH (http://api.crossref.org/works/10.17104/9783406697630)', function(done) {

                var resource = {
                    "monograph_identifiers": [
                        {
                            "literalValue": "10.17104/9783406697630",
                            "scheme": "DOI"
                        },
                        {
                            "literalValue": "http://dx.doi.org/10.17104/9783406697630",
                            "scheme": "URL_CROSSREF"
                        }
                    ],
                    "type": "MONOGRAPH",
                    "monograph_title": "Das Buch der Leiden",
                    "monograph_subtitle": "",
                    "monograph_contributors": [
                        {
                            "roleType": "AUTHOR",
                            "heldBy": {
                                "givenName": "Farīd od-Dīn",
                                "familyName": "Attār"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Verlag C.H.BECK oHG"
                            }
                        }
                    ],
                    "monograph_publicationYear": "2017"
                };

                crossrefHelper.parseObjects(monograph, function(err, res){
                    res.should.be.Array().and.have.lengthOf(1);
                    res[0].should.be.Array().and.have.lengthOf(1);
                    res[0][0].toObject().should.deepEqual(resource);
                    done();
                });
            });
        });

        describe('parseDependentResource', function(){

            it('should return a parsed child resource and parent resource for type BOOK_CHAPTER', function(done) {
                var child = {
                    "bookChapter_identifiers": [
                        {
                            "literalValue": "10.1021/bk-2001-0791.ch020",
                            "scheme": "DOI"
                        },
                        {
                            "literalValue": "http://dx.doi.org/10.1021/bk-2001-0791.ch020",
                            "scheme": "URL_CROSSREF"
                        }
                    ],
                    "type": "BOOK_CHAPTER",
                    "bookChapter_title": "Illicit Drugs in Municipal Sewage",
                    "bookChapter_subtitle": "Proposed New Nonintrusive Tool to Heighten Public Awareness of Societal Use of Illicit-Abused Drugs and Their Potential for Ecological Consequences",
                    "bookChapter_contributors": [
                        {
                            "roleType": "AUTHOR",
                            "heldBy": {
                                "givenName": "Christian G.",
                                "familyName": "Daughton"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "American Chemical Society"
                            }
                        }
                    ],
                    "bookChapter_embodiedAs": [
                        {
                            "firstPage": 348,
                            "lastPage": 364
                        }
                    ]
                };

                var parent = {
                    "editedBook_identifiers": [
                        {
                            "literalValue": "0841237395",
                            "scheme": "ISBN"
                        },
                        {
                            "literalValue": "0841218676",
                            "scheme": "ISBN"
                        }
                    ],
                    "bookSeries_identifiers": [
                        {
                            "literalValue": "1947-5918",
                            "scheme": "ISSN"
                        }
                    ],
                    "type": "EDITED_BOOK",
                    "editedBook_title": "ACS Symposium Series",
                    "editedBook_contributors": [
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "American Chemical Society"
                            }
                        }
                    ]
                };

                crossrefHelper.parseObjects(bookChapter, function(err, res){
                    res.should.be.Array().and.have.lengthOf(1);
                    res[0][0].toObject().should.deepEqual(child);
                    res[0][1].toObject().should.deepEqual(parent);
                    done();
                });
            });

            it('should return a parsed child resource and parent resource for type JOURNAL_ARTICLE (// https://api.crossref.org/works/10.1039/A703436I)', function(done) {
                var child = {
                    "journalArticle_identifiers": [
                        {
                            "literalValue": "10.1039/a703436i",
                            "scheme": "DOI"
                        },
                        {
                            "literalValue": "http://dx.doi.org/10.1039/a703436i",
                            "scheme": "URL_CROSSREF"
                        }
                    ],
                    "type": "JOURNAL_ARTICLE",
                    "journalArticle_title": "Conformational properties of short poly(oxyethylene) chains in water studied by IR spectroscopy",
                    "journalArticle_subtitle": "",
                    "journalArticle_contributors": [
                        {
                            "roleType": "AUTHOR",
                            "heldBy": {
                                "givenName": "Roksana",
                                "familyName": "Begum"
                            }
                        },
                        {
                            "roleType": "AUTHOR",
                            "heldBy": {
                                "givenName": "and",
                                "familyName": "Hiroatsu Matsuura"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Royal Society of Chemistry (RSC)"
                            }
                        }
                    ],
                    "journalArticle_publicationYear": "1997",
                    "journalArticle_embodiedAs": [
                        {
                            "firstPage": 3839,
                            "lastPage": 3848
                        }
                    ]
                };

                var parent = {
                    "journal_identifiers": [
                        {
                            "literalValue": "0956-5000",
                            "scheme": "ISSN"
                        },
                        {
                            "literalValue": "1364-5455",
                            "scheme": "ISSN"
                        }
                    ],
                    "type": "JOURNAL_ISSUE",
                    "journal_title": "Journal of the Chemical Society, Faraday Transactions",
                    "journalVolume_number": "93",
                    "journalIssue_number": "21",
                    "journalIssue_contributors": [
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Royal Society of Chemistry (RSC)"
                            }
                        }
                    ]
                };

                crossrefHelper.parseObjects(journalArticle, function(err, res){
                    res.should.be.Array().and.have.lengthOf(1);
                    res[0][0].toObject().should.deepEqual(child);
                    res[0][1].toObject().should.deepEqual(parent);
                    done();
                });
            });
        });
    });

});