'use strict';
const BibliographicResource = require('./../../api/schema/bibliographicResource.js');
const ResourceEmbodiment = require('./../../api/schema/resourceEmbodiment.js');
const Scan = require('./../../api/schema/scan.js');
const Identifier = require('./../../api/schema/identifier.js');
const AgentRole = require('./../../api/schema/agentRole.js');
const ResponsibleAgent = require('./../../api/schema/responsibleAgent.js');

const BibliographicResourceOld = require('./oldSchema/bibliographicResource.js');
const fs = require('fs');
const enums = require('./../../api/schema/enum.json');

const mongoose = require('mongoose');

function groupBy(collection, property) {
    var i = 0, val, index,
        values = [], result = [];
    for (; i < collection.length; i++) {
        val = collection[i][property];
        index = values.indexOf(val);
        if (index > -1)
            result[index].push(collection[i]);
        else {
            values.push(val);
            result.push([collection[i]]);
        }
    }
    return result;
}

function convertCOLLECTION(){
    var collections = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_COLLECTION.txt'));
    // am Ende sollten wir 50 parents und 55 children haben, wobei 4 keinen Container haben
    // alles erst einmal zu BOOK_CHAPTER
    // dann aus dem number feld die pages nehmen und splitten
    // und dann als scan einfügen
    // partOf ist üblicherweise nicht gesetzt, aber containerTitle ist
    // _id ist auch gegeben
    // bei den contributors leider nur nameString
    // wirklich alle haben den status EXTERNAL
    // oft keine Identifier
    // wahrscheinlich muss der identifier vom typ isbn in den parent?
    // Groupen der container über containertitle
    console.log("test")
    var groups = groupBy(collections, "containerTitle");
    var collections_neu = []
    for(var brGroup of groups){
        for(var br of brGroup){

            var parentType = enums.resourceType.editedBook;
            var childType = enums.resourceType.bookChapter;
            var pages = br.number.split("pp. ")[1];

            var child = new BibliographicResource({
                _id: br._id,
                //identifiers: this.identifiers, // Here we definitely need to distinguish between parent and child
                status: "OLD_" + br.status, // Eventually we need to map this somehow
                parts: br.parts,
                type: childType
            });

            if(!pages){
                /**
                 * 5a27e75427bd332c65261c91
                 5a27fd51d3e64e4709c647ab
                 5a2903b72453c3739344ecd1
                 5a37ebfefeff4b5d8d58e741
                 5a280064f474984a7cc42a6d
                 5a28f1e4fc49195b07f5d763
                 5a2957a774ea003d6ecb9756
                 5a30f03ffeff4b5d8d58dfbb
                 5a378ebefeff4b5d8d58e202
                 5a3b7912feff4b5d8d58fbaa
                 */
                console.log(br._id);
                childType = enums.resourceType.editedBook;
                child.type = childType;
                parentType = "";
            }else {
                var firstPage = pages.split("-")[0];
                var lastPage = pages.split("-")[1];

                child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({firstPage: firstPage, lastPage: lastPage})]);
            }



            child.setTitleForType(childType, br.title);
            child.setSubtitleForType(childType, br.subtitle);
            child.setEditionForType(childType, br.edition);
            //child.setNumberForType(type, this.number);

            child.setContributorsForType(childType, br.contributors);
            child.setPublicationDateForType(childType, br.publicationYear);

            if (br.containerTitle){
                var parent = new BibliographicResource({type: parentType});
                parent.setTitleForType(parentType, br.containerTitle)


                // now we split the identifiers according to the hierarchy
                var parentIdentifiers = [];
                var childIdentifiers = [];
                for (var identifier of br.identifiers) {
                    /*  "isbn": "ISBN",
                     "issn": "ISSN",
                     "swb_ppn" : "SWB_PPN",
                     "olc_ppn" : "OLC_PPN",
                     "zdb_ppn" : "ZDB_PPN",
                     "zdb_id" : "ZDB_ID",
                     "ppn": "PPN",
                     "doi" : "DOI",
                     "lccn": "LCCN",
                     "gndId": "GND_ID",
                     "swbGndId": "SWB_GND_ID",
                     "oclcId": "OCLC_ID",
                     "uri": "URI"  */

                    // if there exists a series identifier, than the series should be the parent independent
                    // of the resource type
                    if (identifier.scheme == enums.identifier.issn) {
                        parentIdentifiers.push(identifier);
                        // if there exists a zdb identifier, than it should be the parent identifier
                    }
/*                    else if (identifier.scheme == enums.identifier.zdbId) {
                        parentIdentifiers.push(identifier);
                        // now we are dealing with a book chapter?
                    }*/
                    else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                        identifier.scheme = enums.identifier.swbPpn;
                        parentIdentifiers.push(identifier);
                    }else if (identifier.scheme == enums.identifier.isbn) {
                        parentIdentifiers.push(identifier);
                    } else {
                        // everything else should belong to the child
                        childIdentifiers.push(identifier);
                    }
                }
                child.setIdentifiersForType(childType, childIdentifiers);
                parent.setIdentifiersForType(parentType, parentIdentifiers);

                // generate new id for new parent
                parent._id = mongoose.Types.ObjectId().toString();
                child.partOf = parent._id;
                collections_neu.push([child, parent]);
        }else{
                collections_neu.push([child]);
            }
        }
    }
    // Now we need to remove the duplicates
    groups = groupBy(collections_neu.flatten(), "editedBook_title");
    var collection_cleaned = [];
    for(var g of groups){
        if(g[0].editedBook_title != "" && g.length > 1){
            // here we have our dulicates
            var corruptIdentifiers = [];
            for(var br of g){
                corruptIdentifiers.push(br._id);
            }

        }
    }
    // select one of them, set all partOfs to that and delete the other two
    for(var br of collections_neu.flatten()){
        if(br.partOf && corruptIdentifiers.indexOf(br.partOf)> -1){
            br.partOf = corruptIdentifiers[0];
        }
        if(!(br._id != corruptIdentifiers[0] && corruptIdentifiers.indexOf(br._id)> -1)){
            collection_cleaned.push(br);
        }
    }

    console.log(collection_cleaned.flatten().length);
    collection_cleaned = JSON.stringify(collection_cleaned, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_COLLECTION_NEU.txt", collection_cleaned);
}

function typeAnalysis(path){
    var data_old = require(path);
    var groups = groupBy(data_old, "type");
    console.log(groups.length);
    var overview = []
    for(var group of groups){
        overview.push([group[0], group[1], group[4]]);
        var group_string = JSON.stringify(group, null, 2);
        fs.writeFileSync("./scripts/converter/analysis/ty_" + group[0].type + ".txt", group_string);
    }
    overview = JSON.stringify(overview, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/overview.txt", overview);

}

function convert(path){
    var data_old = require(path);
    var data_new = []
    console.log(data_old.length);
    for(var br of data_old){
        var schemedBr = new BibliographicResourceOld(br);
        var newBrs = schemedBr.convertToNewScheme();

        console.log(newBrs[0].getErrors());
        console.log(schemedBr.getErrors());
        data_new.push(newBrs);
    }
    fs.writeFile("./test.txt", data_new, function(err) {
        if (err) {
            console.log(err);
        }
    });
    return;
};


//typeAnalysis('./bibliographicResources.json');
convertCOLLECTION();
//convert('./bibliographicResources.json');


