const should = require('should');
const BibliographicResource = require('./../../../api/schema/bibliographicResource');
const enums = require('./../../../api/schema/enum.json');

describe('schema', function() {
    describe.only('bibliographicResource', function () {

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
                done();
            });

            it('should set the property bookChapter_title for type BOOK_CHAPTER', function (done) {
                var bibliographicResource = new BibliographicResource({});
                bibliographicResource.setTitleForType(enums.resourceType.bookChapter, "Test Title");
                bibliographicResource.should.be.ok();
                bibliographicResource.bookChapter_title.should.equal("Test Title");
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
    });
});