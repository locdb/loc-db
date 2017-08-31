const should = require('should');
const setup = require('./../setup.js').createSetup();
const feedHelper = require('./../../../api/helpers/feedHelper.js').createFeedHelper();

describe('helpers', function() {
    describe('feedHelper', function() {
        before(function (done) {
            setup.dropDB(function (err) {
                done();
            });
        });

        after(function (done) {
            setup.dropDB(function (err) {
                done();
            });
        });

        describe('fetchSingle', function () {
            it('should return something', function (done) {
                this.timeout(5000);
                // URL based on a search query that I performed in OLC-Sozialwissenschaften
                var url = "http://gsowww.gbv.de/rss/rss_feeds.php?DB=2.152&SEARCH=00yS!i1016!tsoziologie!m!aY!o180!cN.oY.vD.wD&SEARCHTEXT=S%01(%5BALL%5D+Alle+W%C3%B6rter)%01soziologie%01%01%01Y%01%01%02&EDOC=1730784055&COOKIE=U8186,K8186,D2.152,Ee3442385-7,I180,B0180++++++,SY,A,H6-15,,17,,19-21,,23,,30,,50,,60-62,,73-78,,80,,86,,88-90,NUB+MANNHEIM,R134.155.88.189,FN"
                var feed = {name: "OLC Search", url: url};

                feedHelper.fetchSingle(feed, function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    done();
                });
            });
        });

        describe('fetchMultiple', function () {
            it('should return something', function (done) {
                this.timeout(5000);
                // URL based on a search query that I performed in OLC-Sozialwissenschaften
                // and a random one from tagesschau.de
                var feeds = [{name: "OLC Search", url: "http://gsowww.gbv.de/rss/rss_feeds.php?DB=2.152" +
                "&SEARCH=00yS!i1016!tsoziologie!m!aY!o180!cN.oY.vD.wD&SEARCHTEXT=S%01" +
                "(%5BALL%5D+Alle+W%C3%B6rter)%01soziologie%01%01%01Y%01%01%02&EDOC=1730784055&COOKIE=" +
                "U8186,K8186,D2.152,Ee3442385-7,I180,B0180++++++," +
                "SY,A,H6-15,,17,,19-21,,23,,30,,50,,60-62,,73-78,,80,,86,,88-90,NUB+MANNHEIM,R134.155.88.189,FN"},
                    {name: "Tagesschau", url: "http://www.tagesschau.de/xml/rss2"}]
                feedHelper.fetchMultiple(feeds, function (err, result) {
                    console.log(result);
                    should.not.exists(err);
                    done();
                });
            });
        });
    });
});