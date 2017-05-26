'use strict';

const scholar = require('google-scholar');
const errorlog = require('./../util/logger.js').errorlog;
const accesslog = require('./../util/logger.js').accesslog;
const BibliographicResource = require('./../schema/bibliographicResource.js');
const enums = require('./../schema/enum.json');
const Identifier = require('./../schema/identifier.js');
const AgentRole = require('./../schema/agentRole.js');


var GoogleScholarHelper = function(){
};


GoogleScholarHelper.prototype.query = function(query, callback){
    scholar.search(query)
    .then(resultsObj => {
        var brs = [];
        for(var res of resultsObj.results){
            var contributors = [];
            for (var a of res.authors){
                if(a.name){
                    var identifier = new Identifier({scheme: enums.externalSources.gScholar, literalValue: a.url});
                    if(a.name.split(' ').length === 2){
                        var agentRole = new AgentRole({roleType: enums.roleType.author, heldBy: {identifiers: [identifier], nameString: a.name, givenName: a.name.split(' ')[0], familyName: a.name.split(' ')[1]}});
                    }else{
                        var agentRole = new AgentRole({roleType: enums.roleType.author, heldBy: {identifiers: [identifier], nameString: a.name}});
                    }
                    contributors.push(agentRole.toObject());
                }
            }
            var br = new BibliographicResource({title: res.title, contributors: contributors, identifiers: [{scheme: enums.externalSources.gScholar, literalValue: res.url}], status: enums.status.external});
            brs.push(br.toObject());
        }
        console.log(brs);
        callback(null, brs);
    });
    
};


/**
 * Factory function
 *
 * @returns {GoogleScholarHelper}
*/
function createGoogleScholarHelper() {
    return new GoogleScholarHelper();
}


module.exports = {
        createGoogleScholarHelper : createGoogleScholarHelper
};