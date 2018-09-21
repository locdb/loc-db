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
    // Have no olc identifiers
    var groups = groupBy(collections, "containerTitle");
    var collections_neu = []
    for(var brGroup of groups){
        for(var br of brGroup){

            var parentType = enums.resourceType.editedBook;
            var childType = enums.resourceType.bookChapter;
            var status = "OLD_" + br.status;
            var pages = br.number.split("pp. ")[1];

            var child = new BibliographicResource({
                _id: br._id,
                //identifiers: this.identifiers, // Here we definitely need to distinguish between parent and child
                status: status, // Eventually we need to map this somehow
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
                var parent = new BibliographicResource({type: parentType, status: status});
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
                var identifiers = [];
                for (var identifier of br.identifiers) {
                    if (identifier.scheme == "PPN") {
                        identifier.scheme = enums.identifier.swbPpn;
                    }
                    identifiers.push(identifier);
                }

                child.setIdentifiersForType(childType, identifiers);
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


function convertBookChapter(){
    var collections = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_Book chapter.txt'));
    // 219 resources, some share the same containertitle
    // In the end there should be 219 children + 190 parents?
    // pages wie bei collections
    // set all to book chapter
    // problem with references is that very often DOI is given but not the literal value --> enrich later? TODO
    // Some have partOf property just not, for some it is empty --> no problem here
    // same problem as with the collections for empty page numbers
    var groups = groupBy(collections, "containerTitle");
    var groupsPartOf = groupBy(collections, "partOf");
    var collections_neu = []
    for(var brGroup of groups){
        for(var br of brGroup){

            var parentType = enums.resourceType.editedBook;
            var childType = enums.resourceType.bookChapter;
            var status = "OLD_" + br.status;
            var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

            var child = new BibliographicResource({
                _id: br._id,
                //identifiers: this.identifiers, // Here we definitely need to distinguish between parent and child
                status: status, // Eventually we need to map this somehow
                parts: br.parts,
                type: childType
            });

            if(!pages){
                /**
                 * 5a5619a826f6bc19fe20833e
                 5a5723fc26f6bc19fe20837d
                 5a57717526f6bc19fe20840a --> this has just another format
                 5a5774d126f6bc19fe208419 --> this too
                 5a5775e026f6bc19fe208425
                 5a5dac8626f6bc19fe208bb8
                 5a5db68826f6bc19fe208c30
                 5a5db9ac26f6bc19fe208c52
                 5a5dc16026f6bc19fe208c63
                 5a5dc20026f6bc19fe208c68
                 5a5f3e9726f6bc19fe209eb0
                 5a5f477826f6bc19fe20a2c3
                 5a5f4a4c26f6bc19fe20a2e6
                 5a60891826f6bc19fe20a4f1
                 5a67375f26f6bc19fe20a8c1
                 5a69fb1e26f6bc19fe20add2
                 5a6ee2c226f6bc19fe20ae51
                 5a79a68b26f6bc19fe20b7cf
                 5a7b247526f6bc19fe20b926
                 5a7c631826f6bc19fe20b9d4
                 5a8d716926f6bc19fe20c3e7
                 5aa2367c26f6bc19fe20f26c
                 5aa2373526f6bc19fe20f27b
                 5aa23f9526f6bc19fe20f28f
                 5aa24ba426f6bc19fe20f2b2
                 5aa24ee326f6bc19fe20f2be
                 5acf705ab440bb3ccb184006
                 5ad9e6ce9fc5d9444a4bc761

                 with correcting the splitting it becomes:
                 5a5619a826f6bc19fe20833e
                 5a5723fc26f6bc19fe20837d
                 5a5dac8626f6bc19fe208bb8
                 5a5db68826f6bc19fe208c30
                 5a5db9ac26f6bc19fe208c52
                 5a5dc16026f6bc19fe208c63
                 5a5dc20026f6bc19fe208c68
                 5a5f3e9726f6bc19fe209eb0
                 5a5f477826f6bc19fe20a2c3
                 5a5f4a4c26f6bc19fe20a2e6
                 5a60891826f6bc19fe20a4f1
                 5a67375f26f6bc19fe20a8c1
                 5a69fb1e26f6bc19fe20add2
                 5a6ee2c226f6bc19fe20ae51
                 5a79a68b26f6bc19fe20b7cf
                 5a7b247526f6bc19fe20b926
                 5a7c631826f6bc19fe20b9d4
                 5aa2367c26f6bc19fe20f26c
                 5aa2373526f6bc19fe20f27b
                 5aa23f9526f6bc19fe20f28f
                 5aa24ba426f6bc19fe20f2b2
                 5aa24ee326f6bc19fe20f2be
                 5acf705ab440bb3ccb184006
                 */
                console.log(br._id);

                //childType = enums.resourceType.editedBook;
                //child.type = childType;
                //parentType = "";
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
                var parent = new BibliographicResource({type: parentType, status: status});
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
                var identifiers = [];
                for (var identifier of br.identifiers) {
                    if (identifier.scheme == "PPN") {
                        identifier.scheme = enums.identifier.swbPpn;
                    }
                    identifiers.push(identifier);
                }

                child.setIdentifiersForType(childType, identifiers);
                collections_neu.push([child]);
            }
        }
    }
    // Now we need to remove the duplicates
    groups = groupBy(collections_neu.flatten(), "editedBook_title");
    var collection_cleaned = [];
    var duplicate_group = [];
    for(var g of groups){
        if(g[0].editedBook_title && g[0].editedBook_title != "" && g.length > 1){
            // here we have our dulicates
            var corruptIdentifiers = [];
            for(var br of g){
                corruptIdentifiers.push(br._id);
            }
            duplicate_group.push(corruptIdentifiers);
        }
    }
    // select one of them, set all partOfs to that and delete the other two
    for(var br of collections_neu.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            if(br.partOf && corruptIdentifiers.indexOf(br.partOf)> -1 && br.partOf != corruptIdentifiers[0]){
                br.partOf = corruptIdentifiers[0];
                break;
            }

        }
    }
    for(var br of collections_neu.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            var is_duplicate = false;
            if(br._id != corruptIdentifiers[0] && corruptIdentifiers.indexOf(br._id)> -1){
                is_duplicate = true;
                break;
            }
        }
        if(!is_duplicate){
            collection_cleaned.push(br);
        }
    }

    console.log(collection_cleaned.flatten().length);
    collection_cleaned = JSON.stringify(collection_cleaned, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_Book chapter_NEU.txt", collection_cleaned);
}


function convertMonograph(){
    var monographs = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_MONOGRAPH.txt'));
    // type is 'Monograph' for each of them
    // but there are some problems:
    // 1)for two resources, there is a containerTitle filled with the same title and subtitle --> wie can ignore this
    // 2)one resource is definetly a journal article and the type is just wrong
    // 3)one is rather a report maybe
    // 4)for two of them I really don't know... one seems a bit like a thesis maybe?
    // partOf does not cause any trouble here
    var groups = groupBy(monographs, "containerTitle");
    var groupsPartOf = groupBy(monographs, "partOf");
    var monographs_neu = [];
        // this is the normal monograph group
    groups[0].push(groups[1][0]);
    groups[0].push(groups[3][0]);
    groups[0].push(groups[6][0]);
    for(var br of groups[0]){
        var type = enums.resourceType.monograph;
        var status = "OLD_" + br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: type
        });

        child.setTitleForType(type, br.title);
        child.setSubtitleForType(type, br.subtitle);
        child.setEditionForType(type, br.edition);
        //child.setNumberForType(type, this.number);

        child.setContributorsForType(type, br.contributors);
        child.setPublicationDateForType(type, br.publicationYear);



        // now we split the identifiers according to the hierarchy
        var identifiers = [];
        for (var identifier of br.identifiers) {
            if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                identifier.scheme = enums.identifier.swbPpn;
            }
            identifiers.push(identifier);
        }

        child.setIdentifiersForType(type, identifiers);

        monographs_neu.push([child]);
    }
    // this is the report
    groups[5].push(groups[2][0]);
    // this is the edited book
    groups[5].push(groups[4][0]);
    for(var br of groups[5]){
        if(br.containerTitle == "NCES"){
            var childType = enums.resourceType.report;
            var parentType = enums.resourceType.reportSeries;
        }else if(br.containerTitle == "Overtime: The election 2000 thriller"){
            var childType = enums.resourceType.bookChapter;
            var parentType = enums.resourceType.editedBook;
        }else{
            var childType = enums.resourceType.journalArticle;
            var parentType = enums.resourceType.journalIssue;
        }
        //  2, pp. 429-444
        var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];
        var firstPage = br.number.split("-")[0]
        var lastPage = br.number.split("-")[1]
        var number = br.number.split(",")[0]
        var status = "OLD_" + br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        //child.setNumberForType(type, this.number);

        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);
        var parent = new BibliographicResource({type: parentType, status: status});
        parent.setTitleForType(parentType, br.containerTitle);

        if(!br.containerTitle == "NCES"){
            child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({firstPage: firstPage, lastPage: lastPage})]);
            parent.setNumberForType(parentType, number);
        }else{
            child.setNumberForType(childType, number);
        }





        var parentIdentifiers = [];
        var childIdentifiers = [];
        for (var identifier of br.identifiers) {
            if (identifier.scheme == enums.identifier.issn ) {
                parentIdentifiers.push(identifier);
            }
            else{
                childIdentifiers.push(identifier);
            }
        }

        child.setIdentifiersForType(childType, childIdentifiers);
        parent.setIdentifiersForType(parentType, parentIdentifiers);
        parent._id = mongoose.Types.ObjectId().toString();
        child.partOf = parent._id;
        monographs_neu.push([child, parent]);
    }


    console.log(monographs_neu.flatten().length);
    monographs_neu = JSON.stringify(monographs_neu, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_MONOGRAPHS_NEU.txt", monographs_neu);
}



function convertAufsatzsammlung() {
    // There is only one example --> easy
    // Page problem as with the collections
    // Has OLC identifiers --> belong to the book
    // it is a print book
    var aufsatzsammlungen = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_Aufsatzsammlung.txt'));
    var aufsatzsammlungen_neu = []
    for(var br of aufsatzsammlungen){
        var parentType = enums.resourceType.editedBook;
        var childType = enums.resourceType.bookChapter;
        var status = "OLD_" + br.status;
        var pages = br.number.split("pp. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            //identifiers: this.identifiers, // Here we definitely need to distinguish between parent and child
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType
        });


        var firstPage = pages.split("-")[0];
        var lastPage = pages.split("-")[1];

        child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({firstPage: firstPage, lastPage: lastPage})]);


        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        //child.setNumberForType(type, this.number);

        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle){
            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(parentType, br.containerTitle);


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
                }else if (identifier.scheme == enums.identifier.isbn || identifier.scheme == enums.identifier.oclcId) {
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
            aufsatzsammlungen_neu.push([child, parent]);
        }else{
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);
            aufsatzsammlungen_neu.push([child]);
        }

    }
    // Now we need to remove the duplicates
    console.log(aufsatzsammlungen_neu.flatten().length);
    aufsatzsammlungen_neu = JSON.stringify(aufsatzsammlungen_neu, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_Aufsatzsammlung_NEU.txt", aufsatzsammlungen_neu);

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
//convertCOLLECTION();
//convertAufsatzsammlung();
//convertBookChapter();
convertMonograph()
//convert('./bibliographicResources.json');


