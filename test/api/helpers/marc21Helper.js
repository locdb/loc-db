const should = require('should');
const setup = require('./../setup.js').createSetup();
const marc21Helper = require('./../../../api/helpers/marc21Helper.js').createMarc21Helper();
const fs = require('fs')
const enums = require('./../../../api/schema/enum.json');
const async = require('async');

describe('helpers', function() {
    var editedBook;
    var editedBook2;
    var editedBook3;
    var journal;
    var journalArticle;
    var monograph;
    var monograph2;
    describe('marc21Helper', function() {
        before(function(done) {
            setup.dropDB(function(err){
                async.parallel([
                    function(callback){
                        fs.readFile('./test/api/data/marc21/editedBook2.xml',"utf-8", function read(err, data) {
                            if (err) {
                                throw err;
                            }
                            editedBook2 = data;
                            callback(null, editedBook2);
                        });
                    },
                    function(callback){
                        fs.readFile('./test/api/data/marc21/editedBook.xml',"utf-8", function read(err, data) {
                            if (err) {
                                throw err;
                            }
                            editedBook = data;
                            callback(null, editedBook);
                        });
                    },
                    function(callback){
                        fs.readFile('./test/api/data/marc21/editedBook3.xml',"utf-8", function read(err, data) {
                            if (err) {
                                throw err;
                            }
                            editedBook3 = data;
                            callback(null, editedBook3);
                        });
                    },
                    function(callback){
                        fs.readFile('./test/api/data/marc21/journal.xml',"utf-8", function read(err, data) {
                            if (err) {
                                throw err;
                            }
                            journal = data;
                            callback(null, journal);
                        });
                    },
                    function(callback){
                        fs.readFile('./test/api/data/marc21/journalArticle.xml',"utf-8", function read(err, data) {
                            if (err) {
                                throw err;
                            }
                            journalArticle = data;
                            callback(null, journalArticle);
                        });
                    },
                    function(callback){
                        fs.readFile('./test/api/data/marc21/monograph.xml',"utf-8", function read(err, data) {
                            if (err) {
                                throw err;
                            }
                            monograph = data;
                            callback(null, monograph);
                        });
                    },
                    function(callback){
                        fs.readFile('./test/api/data/marc21/monograph2.xml',"utf-8", function read(err, data) {
                            if (err) {
                                throw err;
                            }
                            monograph2 = data;
                            callback(null, monograph2);
                        });
                    },
                ], function(err,results){
                    done();
                });

            });
        });
        
        after(function(done) {
            setup.dropDB(function(err){
                done();
            });
        });
        
        describe('parseBibliographicResource', function(){
            it('should return a parsed bibliographic resource of type edited book', function(done) {
                var resource = {
                    "editedBook_identifiers": [
                        {
                            "literalValue": "25746724",
                            "scheme": "OCLC_ID"
                        },
                        {
                            "literalValue": "0803985894",
                            "scheme": "ISBN"
                        },
                        {
                            "literalValue": "0803985908",
                            "scheme": "ISBN"
                        },
                        {
                            "literalValue": "http://digitool.hbz-nrw.de:1801/webclient/DeliveryManager?pid=1061498&custom%5Fatt%5F2=simple%5Fviewer",
                            "scheme": "URI"
                        },
                        {
                            "literalValue": "026591766",
                            "scheme": "SWB_PPN"
                        }
                    ],
                    "type": "EDITED_BOOK",
                    "editedBook_title": "Markets, hierarchies and networks :",
                    "editedBook_subtitle": "the coordination of social life /",
                    "editedBook_edition": "1. publ.",
                    "editedBook_contributors": [
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Sage,"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "identifiers": [
                                    {
                                        "literalValue": "121367258",
                                        "scheme": "GND_ID"
                                    },
                                    {
                                        "literalValue": "164193758",
                                        "scheme": "SWB_GND_ID"
                                    }
                                ],
                                "givenName": "Grahame",
                                "familyName": "Thompson"
                            }
                        }
                    ],
                    "editedBook_publicationYear": "1991"
                };

                marc21Helper.parseBibliographicResource(editedBook2, function(err, result){
                    should.not.exist(err);
                    result.should.be.ok();
                    result.should.be.Array().and.have.lengthOf(1);
                    result[0].toObject().should.deepEqual(resource);
                    done();
                });
            });


            it('should return a parsed bibliographic resource of type monograph', function(done) {
                // TODO: So far, I am not sure how to recognize that this might be an edited book
                var resource = {
                    "monograph_identifiers": [
                        {
                            "literalValue": "216714347",
                            "scheme": "OCLC_ID"
                        },
                        {
                            "literalValue": "3810032816",
                            "scheme": "ISBN"
                        },
                        {
                            "literalValue": "http://media.obvsg.at/AC03277259-1002",
                            "scheme": "URI"
                        },
                        {
                            "literalValue": "http://swbplus.bsz-bw.de/bsz091790611cov.htm",
                            "scheme": "URI"
                        },
                        {
                            "literalValue": "091790611",
                            "scheme": "SWB_PPN"
                        }
                    ],
                    "type": "MONOGRAPH",
                    "monograph_title": "Der soziologische Blick :",
                    "monograph_subtitle": "vergangene Positionen und gegenwärtige Perspektiven /",
                    "monograph_contributors": [
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Leske + Budrich,"
                            }
                        },
                        {
                            "roleType": "CORPORATE",
                            "heldBy": {
                                "identifiers": [
                                    {
                                        "literalValue": "10041525-8",
                                        "scheme": "GND_ID"
                                    },
                                    {
                                        "literalValue": "199202699",
                                        "scheme": "SWB_GND_ID"
                                    }
                                ],
                                "nameString": "Institut für Soziologie und Sozialforschung"
                            }
                        }
                    ],
                    "monograph_publicationYear": "2002"
                };

                marc21Helper.parseBibliographicResource(editedBook, function(err, result){
                    should.not.exist(err);
                    result.should.be.ok();
                    result.should.be.Array().and.have.lengthOf(1);
                    result[0].toObject().should.deepEqual(resource);
                    done();
                });
            });

            it('should return a parsed bibliographic resource of type edited book', function(done) {
                var resource = {
                    "editedBook_identifiers": [
                        {
                            "literalValue": "9782296055223",
                            "scheme": "ISBN"
                        },
                        {
                            "literalValue": "30333049X",
                            "scheme": "SWB_PPN"
                        }
                    ],
                    "type": "EDITED_BOOK",
                    "editedBook_title": "Automobilités et altermobilités :",
                    "editedBook_subtitle": "quels changements ? /",
                    "editedBook_contributors": [
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "L'Harmattan,"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "identifiers": [
                                    {
                                        "literalValue": "138295018",
                                        "scheme": "GND_ID"
                                    },
                                    {
                                        "literalValue": "303353783",
                                        "scheme": "SWB_GND_ID"
                                    }
                                ],
                                "givenName": "Fabrice",
                                "familyName": "Clochard"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "identifiers": [
                                    {
                                        "literalValue": "303353791",
                                        "scheme": "SWB_GND_ID"
                                    }
                                ],
                                "givenName": "Anaïs",
                                "familyName": "Rocci"
                            }
                        },
                        {
                            "roleType": "EDITOR",
                            "heldBy": {
                                "identifiers": [
                                    {
                                        "literalValue": "303353805",
                                        "scheme": "SWB_GND_ID"
                                    }
                                ],
                                "givenName": "Stéphanie",
                                "familyName": "Vincent"
                            }
                        }
                    ],
                    "editedBook_publicationYear": "2008"
                };

                marc21Helper.parseBibliographicResource(editedBook3, function(err, result){
                    should.not.exist(err);
                    result.should.be.ok();
                    result.should.be.Array().and.have.lengthOf(1);
                    result[0].toObject().should.deepEqual(resource);
                    done();
                });
            });

            it('should return a parsed bibliographic resource of type journal', function(done) {

                var resource = {
                    "journal_identifiers": [
                        {
                            "literalValue": "888524498",
                            "scheme": "OCLC_ID"
                        },
                        {
                            "literalValue": "0020-5850",
                            "scheme": "ISSN"
                        },
                        {
                            "literalValue": "014390272",
                            "scheme": "SWB_PPN"
                        }
                    ],
                    "type": "JOURNAL",
                    "journal_title": "International affairs /",
                    "journal_contributors": [
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Oxford University Press"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Oxford Univ. Press"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Butterworth,"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Cambridge Univ. Press,"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Blackwell,"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Wiley-Blackwell,"
                            }
                        },
                        {
                            "roleType": "CORPORATE",
                            "heldBy": {
                                "identifiers": [
                                    {
                                        "literalValue": "35736-4",
                                        "scheme": "GND_ID"
                                    },
                                    {
                                        "literalValue": "190341572",
                                        "scheme": "SWB_GND_ID"
                                    }
                                ],
                                "nameString": "Royal Institute of International Affairs"
                            }
                        }
                    ]
                };

                marc21Helper.parseBibliographicResource(journal, function(err, result){
                    should.not.exist(err);
                    result.should.be.ok();
                    result.should.be.Array().and.have.lengthOf(1);
                    result[0].toObject().should.deepEqual(resource)
                    done();
                });
            });


            it('should return a parsed bibliographic resource of type journalArticle', function(done) {

                var child = {
                    "journalArticle_identifiers": [
                        {
                            "literalValue": "324259670",
                            "scheme": "SWB_PPN"
                        }
                    ],
                    "type": "JOURNAL_ARTICLE",
                    "journalArticle_title": "The UK, threshold status and responsible nuclear sovereignty /",
                    "journalArticle_contributors": [
                        {
                            "roleType": "AUTHOR",
                            "heldBy": {
                                "givenName": "William",
                                "familyName": "Walker"
                            }
                        }
                    ],
                    "journalArticle_publicationYear": "2010"
                };

                var parent = {
                    "journal_identifiers": [
                        {
                            "literalValue": "0020-5850",
                            "scheme": "ISSN"
                        }
                    ],
                    "type": "JOURNAL_ISSUE",
                    "journal_title": "International affairs",
                    "journalIssue_title": "International affairs",
                    "journalIssue_number": "86(2010), 2, S. 447-464"
                };

                marc21Helper.parseBibliographicResource(journalArticle, function(err, result){
                    should.not.exist(err);
                    result.should.be.ok();
                    result.should.be.Array().and.have.lengthOf(2);
                    result[0].toObject().should.deepEqual(child);
                    result[1].toObject().should.deepEqual(parent);
                    done();
                });
            });


            it('should return a parsed bibliographic resource of type monograph', function(done) {

                var resource = {
                    "monograph_identifiers": [
                        {
                            "literalValue": "985734255",
                            "scheme": "OCLC_ID"
                        },
                        {
                            "literalValue": "9781442236776",
                            "scheme": "ISBN"
                        },
                        {
                            "literalValue": "427229413",
                            "scheme": "SWB_PPN"
                        }
                    ],
                    "type": "MONOGRAPH",
                    "monograph_title": "Subaltern China :",
                    "monograph_subtitle": "rural migrants, media, and cultural practices /",
                    "monograph_contributors": [
                        {
                            "roleType": "AUTHOR",
                            "heldBy": {
                                "givenName": "Wanning",
                                "familyName": "Sun"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Rowman & Littlefield,"
                            }
                        }
                    ],
                    "monograph_publicationYear": "2014"
                };

                marc21Helper.parseBibliographicResource(monograph, function(err, result){
                    should.not.exist(err);
                    result.should.be.ok();
                    result.should.be.Array().and.have.lengthOf(1);
                    result[0].toObject().should.deepEqual(resource);
                    done();
                });
            });


            it('should return a parsed bibliographic resource of type monograph', function(done) {

                var resource = {
                    "monograph_identifiers": [
                        {
                            "literalValue": "13323518",
                            "scheme": "OCLC_ID"
                        },
                        {
                            "literalValue": "3446142045",
                            "scheme": "ISBN"
                        },
                        {
                            "literalValue": "http://swbplus.bsz-bw.de/bsz012160954inh.htm",
                            "scheme": "URI"
                        },
                        {
                            "literalValue": "012160954",
                            "scheme": "SWB_PPN"
                        }
                    ],
                    "type": "MONOGRAPH",
                    "monograph_title": "Die drei Kulturen :",
                    "monograph_subtitle": "Soziologie zwischen Literatur und  Wissenschaft /",
                    "monograph_contributors": [
                        {
                            "roleType": "AUTHOR",
                            "heldBy": {
                                "givenName": "Wolf",
                                "familyName": "Lepenies"
                            }
                        },
                        {
                            "roleType": "PUBLISHER",
                            "heldBy": {
                                "nameString": "Hanser,"
                            }
                        }
                    ],
                    "monograph_publicationYear": "1985"
                };

                marc21Helper.parseBibliographicResource(monograph2, function(err, result){
                    should.not.exist(err);
                    result.should.be.ok();
                    result.should.be.Array().and.have.lengthOf(1);
                    result[0].toObject().should.deepEqual(resource);
                    done();
                });
            });
        });
    });
});