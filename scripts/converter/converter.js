'use strict';
const BibliographicResource = require('./../../api/schema/bibliographicResource.js');
const BibliographicResourceOld = require('./../../api/schema/bibliographicResource.js');


function convert(path){
    var data_old = require(path);
    console.log(data_old.length);
};


convert('./bibliographicResources.json');


