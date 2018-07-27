const should = require('should');
const BibliographicResource = require('./../../../api/schema/bibliographicResource');
const enums = require('./../../../api/schema/enum.json');

describe('schema', function() {
    describe('bibliographicResource', function () {

        describe('getAllTypesOfThis', function () {
            it('should return the types as expected', function (done) {
                // artificial example
                var bibliographicResource = new BibliographicResource({
                    "_id": "5a2947087bdcfd4759582633",
                    "dataset_publicationDate": new Date("1993"),
                    "book_containerTitle": "Revue française de Sociologie",
                    "journalArticle_number": "34",
                    "status": "EXTERNAL",
                    "__v": 0,
                    "book_embodiedAs": [],
                    "parts": [],
                    "cites": [],
                    "type": "BOOK",
                    "journalIssue_contributors": [
                        {
                            "roleType": "AUTHOR",
                            "_id": "5a2947087bdcfd4759582634",
                            "heldBy": {
                                "nameString": "Duru-Bellat, M.",
                                "givenName": "",
                                "familyName": "",
                                "identifiers": []
                            },
                            "identifiers": []
                        }
                    ],
                    "book_identifiers": [
                        {
                            "literalValue": "10.2307/3322050",
                            "scheme": "DOI",
                            "_id": "5a1d0e82a2b9423e05265b71"
                        }
                    ]
                });

                var types = bibliographicResource.getAllTypesOfThis();

                types.should.be.ok();
                types.sort().should.deepEqual([enums.resourceType.book, enums.resourceType.dataset,
                    enums.resourceType.journalIssue, enums.resourceType.journalArticle].sort());
                done();
            });

            it('should return the types as expected', function (done) {

                var br = {
                    "book_number": "34",
                    "status": "EXTERNAL",
                    "__v": 0,
                    "type": "BOOK",
                    "standardSeries_embodiedAs": [],
                    "standard_embodiedAs": [],
                    "referenceEntry_embodiedAs": [],
                    "referenceBook_embodiedAs": [],
                    "book_embodiedAs": [],
                    "reportSeries_embodiedAs": [],
                    "report_embodiedAs": [],
                    "dataset_embodiedAs": [],
                    "journalArticle_embodiedAs": [],
                    "journalIssue_embodiedAs": [],
                    "journalVolume_embodiedAs": [],
                    "journal_embodiedAs": [],
                    "proceedings_embodiedAs": [],
                    "proceedingsArticle_embodiedAs": [],
                    "dissertation_embodiedAs": [],
                    "component_embodiedAs": [],
                    "bookTrack_embodiedAs": [],
                    "bookPart_embodiedAs": [],
                    "bookSection_embodiedAs": [],
                    "bookChapter_embodiedAs": [],
                    "bookSet_embodiedAs": [],
                    "bookSeries_embodiedAs": [],
                    "editedBook_embodiedAs": [],
                    "monograph_embodiedAs": [],
                    "parts": [],
                    "cites": [],
                    "standardSeries_contributors": [],
                    "standard_contributors": [],
                    "referenceEntry_contributors": [],
                    "referenceBook_contributors": [],
                    "book_contributors": [
                        {
                            "roleType": "AUTHOR",
                            "heldBy": {
                                "nameString": "Duru-Bellat, M.",
                                "givenName": "",
                                "familyName": "",
                                "identifiers": []
                            },
                            "identifiers": []
                        }
                    ],
                    "reportSeries_contributors": [],
                    "proceedings_contributors": [],
                    "dissertation_contributors": [],
                    "component_contributors": [],
                    "bookTrack_contributors": [],
                    "dataset_contributors": [],
                    "bookChapter_contributors": [],
                    "bookSet_contributors": [],
                    "proceedingsArticle_contributors": [],
                    "bookSeries_contributors": [],
                    "editedBook_contributors": [],
                    "monograph_contributors": [],
                    "journalArticle_contributors": [],
                    "journalIssue_contributors": [],
                    "journalVolume_contributors": [],
                    "report_contributors": [],
                    "journal_contributors": [],
                    "standardSeries_identifiers": [],
                    "standard_identifiers": [],
                    "referenceEntry_identifiers": [],
                    "referenceBook_identifiers": [],
                    "book_identifiers": [
                        {
                            "literalValue": "10.2307/3322050",
                            "scheme": "DOI"
                        }
                    ],
                    "reportSeries_identifiers": [],
                    "report_identifiers": [],
                    "dataset_identifiers": [],
                    "proceedings_identifiers": [],
                    "proceedingsArticle_identifiers": [],
                    "dissertation_identifiers": [],
                    "component_identifiers": [],
                    "bookTrack_identifiers": [],
                    "bookPart_identifiers": [],
                    "bookSection_identifiers": [],
                    "bookChapter_identifiers": [],
                    "bookSet_identifiers": [],
                    "bookSeries_identifiers": [],
                    "editedBook_identifiers": [],
                    "monograph_identifiers": [],
                    "journalArticle_identifiers": [],
                    "journalIssue_identifiers": [],
                    "journalVolume_identifiers": [],
                    "journal_identifiers": []
                };

                br = new BibliographicResource(br);
                var types = br.getAllTypesOfThis();

                types.should.be.ok();
                types.sort().should.deepEqual([enums.resourceType.book].sort());
                done();
            });
        });

        describe('getPropertyPrefixForType', function () {
            it('should return the prefix journal_ for type JOURNAL', function (done) {
                var bibliographicResource = new BibliographicResource({});
                var prefix = bibliographicResource.getPropertyPrefixForType(enums.resourceType.journal);
                prefix.should.be.ok();
                prefix.should.equal("journal_");
                done();
            });

            it('should return the prefix journalArticle_ for type JOURNAL_ARTICLE', function (done) {
                var bibliographicResource = new BibliographicResource({});
                var prefix = bibliographicResource.getPropertyPrefixForType(enums.resourceType.journalArticle);
                prefix.should.be.ok();
                prefix.should.equal("journalArticle_");
                done();
            });
        });

        describe('setTitleForType', function () {
            it('should set the property journal_title for type JOURNAL', function (done) {
                var bibliographicResource = new BibliographicResource({});
                bibliographicResource.setTitleForType(enums.resourceType.journal, "Test Title");
                bibliographicResource.should.be.ok();
                bibliographicResource.journal_title.should.equal("Test Title");
                Object.keys(bibliographicResource).length.should.equal(1);
                done();
            });

            it('should set the property bookChapter_title for type BOOK_CHAPTER', function (done) {
                var bibliographicResource = new BibliographicResource({});
                bibliographicResource.setTitleForType(enums.resourceType.bookChapter, "Test Title");
                bibliographicResource.should.be.ok();
                bibliographicResource.bookChapter_title.should.equal("Test Title");
                Object.keys(bibliographicResource).length.should.equal(1);
                done();
            });

            it('should not produce an error but also not set the property', function (done) {
                var bibliographicResource = new BibliographicResource({});
                bibliographicResource.setTitleForType("WRONG", "Test Title");
                bibliographicResource.should.be.ok();
                Object.keys(bibliographicResource).length.should.equal(0);
                done();
            });
        });
        describe('setSubtitleForType', function () {
            it('should set the property dissertation_subtitle for type DISSERTATION', function (done) {
                var bibliographicResource = new BibliographicResource({});
                bibliographicResource.setSubtitleForType(enums.resourceType.dissertation, "Test Title");
                bibliographicResource.should.be.ok();
                bibliographicResource.dissertation_subtitle.should.equal("Test Title");
                Object.keys(bibliographicResource).length.should.equal(1);
                done();
            });
        });
        describe('setEditionForType', function () {
            it('should set the property standard_edition for type STANDARD', function (done) {
                var bibliographicResource = new BibliographicResource({});
                bibliographicResource.setEditionForType(enums.resourceType.standard, "1st");
                bibliographicResource.should.be.ok();
                bibliographicResource.standard_edition.should.equal("1st");
                Object.keys(bibliographicResource).length.should.equal(1);
                done();
            });
        });
        describe('setIdentifiersForType', function () {
            it('should set the property monograph_identifiers for type MONOGRAPH', function (done) {
                var bibliographicResource = new BibliographicResource({});
                bibliographicResource.setIdentifiersForType(enums.resourceType.monograph, [{scheme: 'DOI', literalValue: '123/1235'}]);
                bibliographicResource.should.be.ok();
                bibliographicResource.toObject().monograph_identifiers.should.deepEqual([{scheme: 'DOI', literalValue: '123/1235'}]);
                Object.keys(bibliographicResource).length.should.equal(1);
                done();
            });
        });

        describe('pushIdentifierForType', function () {
            it('should set the property monograph_identifiers for type MONOGRAPH', function (done) {
                var bibliographicResource = new BibliographicResource({});
                bibliographicResource.pushIdentifierForType(enums.resourceType.monograph, {scheme: 'DOI', literalValue: '123/1235'});
                bibliographicResource.pushIdentifierForType(enums.resourceType.monograph, {scheme: 'DOI', literalValue: '123/4567'});
                bibliographicResource.should.be.ok();
                bibliographicResource.toObject().monograph_identifiers.should.deepEqual([{scheme: 'DOI', literalValue: '123/1235'},{scheme: 'DOI', literalValue: '123/4567'}]);
                bibliographicResource.monograph_identifiers.should.have.lengthOf(2);
                Object.keys(bibliographicResource).length.should.equal(1);
                done();
            });
        });

        describe('getTitleForType', function () {
            it('should get the property journal_title for type JOURNAL', function (done) {
                var bibliographicResource = new BibliographicResource({});
                bibliographicResource.setTitleForType(enums.resourceType.journal, "Test Title");
                var title = bibliographicResource.getTitleForType(enums.resourceType.journal);
                title.should.be.ok();
                title.should.equal("Test Title");
                done();
            });
        });

        describe('getAllTypes', function () {
            it('should get all types', function (done) {
                var bibliographicResource = new BibliographicResource({});
                var types = bibliographicResource.getAllTypes();
                types.should.be.Array();
                types.should.have.lengthOf(24);
                done();
            });
        });

        describe('getPropertyForTypes', function () {
            it('should get all titles', function (done) {
                var bibliographicResource = new BibliographicResource({});
                var types = bibliographicResource.getAllTypes();
                var titles = bibliographicResource.getPropertyForTypes('title',types);
                titles.should.be.Array();
                titles.should.have.lengthOf(24);
                done();
            });
        });
    });
});