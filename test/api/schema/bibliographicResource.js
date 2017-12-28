const should = require('should');
const BibliographicResource = require('./../../../api/schema/bibliographicResource');
const enums = require('./../../../api/schema/enum.json');

describe('schema', function() {
    describe('bibliographicResource', function () {

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