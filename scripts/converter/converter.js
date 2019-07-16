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

const assert = require('assert');

const mongoose = require('mongoose');

// TODO: Check on everything related to journal issues again

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
            var status = br.status;
            var pages = br.number.split("pp. ")[1];

            var child = new BibliographicResource({
                _id: br._id,
                //identifiers: this.identifiers, // Here we definitely need to distinguish between parent and child
                status: status, // Eventually we need to map this somehow
                parts: br.parts,
                type: childType,
                cites: br.cites
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
                parentType = enums.resourceType.bookSeries;
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
                    }
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
            // here we have our duplicates
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
            var status = br.status;
            var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

            var child = new BibliographicResource({
                _id: br._id,
                status: status,
                parts: br.parts,
                type: childType,
                cites: br.cites
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

                    // if there exists a series identifier, than the series should be the parent independent
                    // of the resource type
                    if (identifier.scheme == enums.identifier.issn) {
                        parentIdentifiers.push(identifier);
                        // if there exists a zdb identifier, than it should be the parent identifier
                    }else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
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
            // here we have our duplicates
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
        var status = br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: type,
            cites: br.cites
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
        var status = br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType,
            cites: br.cites
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        //child.setNumberForType(type, this.number);

        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);
        var parent = new BibliographicResource({type: parentType, status: status});
        if(parent.type == enums.resourceType.journalIssue){
            parent.setTitleForType(enums.resourceType.journal, br.containerTitle);
        }else{
            parent.setTitleForType(parentType, br.containerTitle);
        }

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

function convertBOOK_CHAPTER(){
    // BOOK_CHAPTER have no containerTitle
    // They are really just chapters but with also the PPNs as identifiers
    // CONVERT PPN to SWB PPN
    // no page numbers given :(

    // It is in fact different from what is described above: I think these are Edited Books
    var chapters = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_BOOK_CHAPTER.txt'));
    var chapters_neu = [];

    for(var br of chapters){
        var type = enums.resourceType.editedBook;
        var status = br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: type,
            cites: br.cites
        });

        child.setTitleForType(type, br.title);
        child.setSubtitleForType(type, br.subtitle);
        child.setEditionForType(type, br.edition);
        child.setContributorsForType(type, br.contributors);
        child.setPublicationDateForType(type, br.publicationYear);

        var identifiers = [];
        for (var identifier of br.identifiers) {
            if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                identifier.scheme = enums.identifier.swbPpn;
            }
            identifiers.push(identifier);
        }

        child.setIdentifiersForType(type, identifiers);

        chapters_neu.push([child]);
    }

    console.log(chapters_neu.flatten().length);
    chapters_neu = JSON.stringify(chapters_neu, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_BOOK_CHAPTERS_NEU.txt", chapters_neu);
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
        var status = br.status;
        var pages = br.number.split("pp. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status,
            parts: br.parts,
            type: childType,
            cites: br.cites
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
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                }else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
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
    var overview = []
    for(var group of groups){
        console.log(group[0].type)
        overview.push([group[0], group[1], group[4]]);
        var group_string = JSON.stringify(group, null, 2);
        if(group[0].type == "JOURNAL" || group[0].type == "MONOGRAPH"){
            fs.writeFileSync("./scripts/converter/analysis_finding_missing/ty_missing_" + group[0].type + ".txt", group_string);
        }
        fs.writeFileSync("./scripts/converter/analysis_finding_missing/ty_" + group[0].type + ".txt", group_string);
    }
    overview = JSON.stringify(overview, null, 2);
    fs.writeFileSync("./scripts/converter/analysis_finding_missing/overview_2.txt", overview);

}


function convertEditedBook(){
    var brs = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_Edited book.txt'));
    // es handelt sich hierbei nur um eine resource
    var br = brs[0]
    var br_neu = []

    var parentType = enums.resourceType.editedBook;
    var childType = enums.resourceType.bookChapter;
    var status = br.status;
    var pages = br.number.split("pp. ")[1];

    var child = new BibliographicResource({
        _id: br._id,
        status: status,
        parts: br.parts,
        type: childType,
        cites: br.cites
    });

    var firstPage = pages.split("-")[0];
    var lastPage = pages.split("-")[1];

    child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({firstPage: firstPage, lastPage: lastPage})]);
    child.setTitleForType(childType, br.title);
    child.setSubtitleForType(childType, br.subtitle);
    child.setEditionForType(childType, br.edition);
    child.setContributorsForType(childType, br.contributors);
    child.setPublicationDateForType(childType, br.publicationYear);

    if (br.containerTitle){
        var parent = new BibliographicResource({type: parentType, status: status});
        parent.setTitleForType(parentType, br.containerTitle)


        // now we split the identifiers according to the hierarchy
        var parentIdentifiers = [];
        var childIdentifiers = [];
        for (var identifier of br.identifiers) {
            // if there exists a series identifier, than the series should be the parent independent
            // of the resource type
            if (identifier.scheme == enums.identifier.issn) {
                parentIdentifiers.push(identifier);
                // if there exists a zdb identifier, than it should be the parent identifier
            }
            else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                identifier.scheme = enums.identifier.swbPpn;
                parentIdentifiers.push(identifier);
            } else if (identifier.scheme == enums.identifier.isbn) {
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
        br_neu.push([child, parent]);
    }


    console.log(br_neu.flatten().length);
    br_neu = JSON.stringify(br_neu, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_Edited book_NEU.txt", br_neu);
}


function convertComponent(){
    // COMPONENTS seem to be videos or music or similar
    // 2 have the same container title
    // There is no part of
    // TODO: Problem here: What is the parent of a component?
    // TODO: Check whether we correctly deal with page numbers --> group by number and check
    // Also: There are often basically no identifiers given

    var components = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_Component.txt'));
    var groups = groupBy(components, "containerTitle");
    var groupsPartOf = groupBy(components, "partOf");

    var components_neu = [];

    for(var br of components){
        var childType = enums.resourceType.component;
        var status = br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType,
            cites: br.cites
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle) {
            var parentType = enums.resourceType.book;
            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(parentType, br.containerTitle);

            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];
            for (var identifier of br.identifiers) {
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                }else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.isbn) {
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
            components_neu.push([child, parent]);
        }else{
            // now we split the identifiers according to the hierarchy
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);

            components_neu.push([child]);
        }
    }

    // Now we need to remove the duplicates
    groups = groupBy(components_neu.flatten(), "book_title");
    var components_cleaned = [];
    var duplicate_group = [];
    for(var g of groups){
        if(g[0].book_title&& g[0].book_title != "" && g.length > 1){
            // here we have our dulicates
            var corruptIdentifiers = [];
            for(var br of g){
                corruptIdentifiers.push(br._id);
            }
            duplicate_group.push(corruptIdentifiers);
        }
    }
    // select one of them, set all partOfs to that and delete the other two
    for(var br of components_neu.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            if(br.partOf && corruptIdentifiers.indexOf(br.partOf)> -1 && br.partOf != corruptIdentifiers[0]){
                br.partOf = corruptIdentifiers[0];
                break;
            }

        }
    }
    for(var br of components_neu.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            var is_duplicate = false;
            if(br._id != corruptIdentifiers[0] && corruptIdentifiers.indexOf(br._id)> -1){
                is_duplicate = true;
                break;
            }
        }
        if(!is_duplicate){
            components_cleaned.push(br);
        }
    }

    console.log(components_cleaned.flatten().length);
    components_cleaned = JSON.stringify(components_cleaned, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_Component_NEU.txt", components_cleaned);
}

function convertBook(){
    // partOf is no problem here
    // we have 3 with empty container title --> those are books
    // we have 2 BookChapters with containerTitle filled
    // and finally 1 Journal Article
    // no problem with duplicate containers

    var books = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_Book.txt'));
    var groups = groupBy(books, "containerTitle");
    var groupsPartOf = groupBy(books, "partOf");

    var books_neu = [];

    for(var br of books){
        if(!br.containerTitle || br.containerTitle ==""){
            var childType = enums.resourceType.book;
        }else if(br.number.split("pp. ")[1] && br.containerTitle != "Media Psychology"){
            var childType = enums.resourceType.bookChapter;
            var parentType = enums.resourceType.editedBook;
            var firstPage = br.number.split("pp. ")[1].split("-")[0];
            var lastPage = br.number.split("pp. ")[1].split("-")[1];
        }else{
            var childType = enums.resourceType.journalArticle;
            var parentType = enums.resourceType.journalIssue;
            var volume = br.number.split("(")[0]
            var issue = br.number.split("(")[1].split(")")[0]
            var firstPage = br.number.split("pp. ")[1].split("-")[0];
            var lastPage = br.number.split("pp. ")[1].split("-")[1];
        }

        var status = br.status;

        var child = new BibliographicResource({
            _id: br._id,
            status: status,
            parts: br.parts,
            type: childType,
            cites: br.cites
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle) {
            child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({firstPage: firstPage, lastPage: lastPage})]);
            var parent = new BibliographicResource({type: parentType, status: status});
            if(parent.type == enums.resourceType.journalIssue){
                parent.setTitleForType(enums.resourceType.journal, br.containerTitle);
                parent.journalIssue_number = issue;
                parent.journalVolume_number = volume;
            }else{
                parent.setTitleForType(parentType, br.containerTitle);
            }

            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];
            for (var identifier of br.identifiers) {
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                } else if (identifier.scheme == enums.identifier.zdbId) {
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.isbn) {
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
            books_neu.push([child, parent]);
        }else{
            // now we split the identifiers according to the hierarchy
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);

            books_neu.push([child]);
        }
    }

    console.log(books_neu.flatten().length);
    books_neu = JSON.stringify(books_neu, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_Book_NEU.txt", books_neu);
}



function convertJournalArticle(){
    // total 1322
    // grouping by containerTitle reveals that there are 37 without container title filled and most of these have the partOf filled
    // some of these have number=<issue>(<volume>), some have number=<issue>(<volume>) pp. <firstPage>-<lastPage>
    // there exist many of the resources referring to the same journalissue --> We'll end up with many duplicates
    // grouping by partOf reveals that there are two big groups with this field filled to the same target (14 and 15)
    // 957 without that property, 336 with partOf=""
    // TODO: For journalIssues the journalTitle has to be in the journalTitle property
    // TODO: For journalIssue duplicate removal we also have to consider the issue and volume number --> WE do this here, but we should check for all the others
    // TODO: Für manche ist bei number einfach irgendeine Zahl eingetragen --> Was bedeutet diese? --> Wahrscheinlich das Volume

    var articles = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_Journal article.txt'));
    var groups = groupBy(articles, "containerTitle");
    var groupsPartOf = groupBy(articles, "partOf");

    var articles_neu = [];

    for(var br of articles){
        var childType = enums.resourceType.journalArticle;
        var parentType =enums.resourceType.journalIssue;

        // TODO: also here we have to account for cases like: "48(1)",

        var volume = br.number.split("(")[0];
        var issue = br.number.split("(")[1] ? br.number.split("(")[1].split(")")[0] : "";
        var firstPage = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1].split("-")[0] : "";
        var lastPage = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1].split("-")[1] : "";

        var status = br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType,
            cites: br.cites,
            partOf: br.partOf
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        //child.setNumberForType(type, this.number);

        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle || br.partOf) {
            child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({firstPage: firstPage, lastPage: lastPage})]);
            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(enums.resourceType.journal, br.containerTitle);

            parent.journalIssue_number = issue;
            parent.journalVolume_number = volume;


            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];

            // TODO: check identifier assignment in detail
            for (var identifier of br.identifiers) {
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                } else if (identifier.scheme == enums.identifier.zdbId) {
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.isbn) {
                    parentIdentifiers.push(identifier);
                } else {
                    // everything else should belong to the child
                    childIdentifiers.push(identifier);
                }
            }
            child.setIdentifiersForType(childType, childIdentifiers);
            parent.setIdentifiersForType(parentType, parentIdentifiers);

            // generate new id for new parent
            //if(child.partOf && child.partOf != ""){
            //    parent._id = child.partOf;
            //}else{
            parent._id = mongoose.Types.ObjectId().toString();
            child.partOf = parent._id;
            //}
            articles_neu.push([child, parent]);
        }else{
            // if there is no parent information at all, we leave the article on it's own and save all the identifiers in the child
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);

            articles_neu.push([child]);
        }
    }

    // Now we need to remove the duplicates
    groups = groupBy(articles_neu.flatten(), "journal_title");

    var articles_cleaned = [];
    var duplicate_group = [];
    for(var g of groups){
        console.log(g[0].journal_title);
        var volumeGroups = groupBy(g, "journalVolume_number");
        for(var vg of volumeGroups){
            var issueGroups = groupBy(vg, "journalIssue_number");
            for(var ig of issueGroups){
                // TODO: If it is of type journal and the identifiers are the same, then anyways we want to remove the duplicates
                if(ig[0].journal_title && ig[0].type == enums.resourceType.journalIssue && ig.length > 1){
                    // here we have our duplicates
                    var corruptIdentifiers = [];
                    for(var br of ig){
                        corruptIdentifiers.push(br._id);
                    }
                    duplicate_group.push(corruptIdentifiers);
                }
            }
        }

    }
    // select one of them, set all partOfs to that and delete the other two
    for(var br of articles_neu.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            if(br.partOf && corruptIdentifiers.indexOf(br.partOf)> -1 && br.partOf != corruptIdentifiers[0]){
                br.partOf = corruptIdentifiers[0];
                break;
            }

        }
    }
    for(var br of articles_neu.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            var is_duplicate = false;
            if(br._id != corruptIdentifiers[0] && corruptIdentifiers.indexOf(br._id)> -1){
                is_duplicate = true;
                break;
            }
        }
        if(!is_duplicate){
            articles_cleaned.push(br);
        }
    }

    console.log(articles_cleaned.flatten().length);
    articles_cleaned = JSON.stringify(articles_cleaned, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_Journal article_NEU.txt", articles_cleaned);
}

function convertJournal(){
    // total 2
    // these are also journal articles
    // we do the same as above
    // 1 has a containerTitle the other not
    // both don't have partOf filled
    // number property: "27, pp. 235-260" (I assume that the number corresponds to the volume number) and ""
    // TODO: Check with the librarians whether my interpretation is correct

    var articles = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_JOURNAL.txt'));
    var groups = groupBy(articles, "containerTitle");
    var groupsPartOf = groupBy(articles, "partOf");

    var articles_neu = [];

    for(var br of articles){
        var childType = enums.resourceType.journalArticle;
        var parentType =enums.resourceType.journalIssue;

        var volume = br.number.split(",")[0];
        //var issue = br.number.split("(")[1] ? br.number.split("(")[1].split(")")[0] : "";
        var firstPage = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1].split("-")[0] : "";
        var lastPage = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1].split("-")[1] : "";

        var status = br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType,
            cites: br.cites,
            partOf: br.partOf
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle || br.partOf) {
            child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({firstPage: firstPage, lastPage: lastPage})]);
            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(enums.resourceType.journal, br.containerTitle);

            //parent.journalIssue_number = issue;
            parent.journalVolume_number = volume;


            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];

            // TODO: check identifier assignment in detail
            for (var identifier of br.identifiers) {
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                } else if (identifier.scheme == enums.identifier.zdbId) {
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.isbn) {
                    parentIdentifiers.push(identifier);
                } else {
                    // everything else should belong to the child
                    childIdentifiers.push(identifier);
                }
            }
            child.setIdentifiersForType(childType, childIdentifiers);
            parent.setIdentifiersForType(parentType, parentIdentifiers);

            // generate new id for new parent
            if(child.partOf && child.partOf != ""){
                parent._id = child.partOf;
            }else{
                parent._id = mongoose.Types.ObjectId().toString();
                child.partOf = parent._id;
            }
            articles_neu.push([child, parent]);
        }else{
            // if there is no parent information at all, we leave the article on it's own and save all the identifiers in the child
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);

            articles_neu.push([child]);
        }
    }

    // Now we need to remove the duplicates
    groups = groupBy(articles_neu.flatten(), "journal_title");

    var articles_cleaned = [];
    var duplicate_group = [];
    for(var g of groups){
        var volumeGroups = groupBy(g, "journalVolume_number");
        for(var vg of volumeGroups){
            var issueGroups = groupBy(vg, "journalIssue_number");
            for(var ig of issueGroups){
                if(ig[0].journal_title && ig[0].journal_title != "" && ig.length > 1){
                    // here we have our duplicates
                    var corruptIdentifiers = [];
                    for(var br of ig){
                        corruptIdentifiers.push(br._id);
                    }
                    duplicate_group.push(corruptIdentifiers);
                }
            }
        }

    }
    // select one of them, set all partOfs to that and delete the other two
    for(var br of articles_neu.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            if(br.partOf && corruptIdentifiers.indexOf(br.partOf)> -1 && br.partOf != corruptIdentifiers[0]){
                br.partOf = corruptIdentifiers[0];
                break;
            }

        }
    }

    for(var br of articles_neu.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            var is_duplicate = false;
            if(br._id != corruptIdentifiers[0] && corruptIdentifiers.indexOf(br._id)> -1){
                is_duplicate = true;
                break;
            }
        }
        if(!is_duplicate){
            articles_cleaned.push(br);
        }
    }

    console.log(articles_cleaned.flatten().length);
    articles_cleaned = JSON.stringify(articles_cleaned, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_JOURNAL_NEU.txt", articles_cleaned);
}


function convertReport(){
    // total 252
    // container type is probably report series, right?
    // No partOf given, that is good
    // 234 don't have a container title given
    // the remaining ones have a unique containerTitle --> We won't create any duplicates here#
    // I cannot really interpret the number property. For some it looks like a date, for some it is some obscure identifier, for some it is just a number
    // No embodiment given as far as I can see
    // TODO: Check whether there exist really no page numbers

    var reports = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_Report.txt'));
    var groups = groupBy(reports, "containerTitle");
    var groupsPartOf = groupBy(reports, "partOf");
    var groupsEmbodiedAs = groupBy(reports, "embodiedAs");

    var reports_neu = [];

    for(var br of reports){
        var childType = enums.resourceType.report;
        var parentType = enums.resourceType.reportSeries;

        var status = br.status;

        var child = new BibliographicResource({
            _id: br._id,
            status: status,
            parts: br.parts,
            type: childType,
            cites: br.cites,
            partOf: br.partOf
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        child.setNumberForType(childType, br.number);

        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle || br.partOf) {

            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(parentType, br.containerTitle);

            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];

            // TODO: check identifier assignment in detail
            for (var identifier of br.identifiers) {
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
                } else if (identifier.scheme == enums.identifier.isbn) {
                    parentIdentifiers.push(identifier);
                } else {
                    // everything else should belong to the child
                    childIdentifiers.push(identifier);
                }
            }
            child.setIdentifiersForType(childType, childIdentifiers);
            parent.setIdentifiersForType(parentType, parentIdentifiers);

            // generate new id for new parent
            if(child.partOf && child.partOf != ""){
                parent._id = child.partOf;
            }else{
                parent._id = mongoose.Types.ObjectId().toString();
                child.partOf = parent._id;
            }
            reports_neu.push([child, parent]);
        }else{
            // if there is no parent information at all, we leave the article on it's own and save all the identifiers in the child
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);

            reports_neu.push([child]);
        }
    }

    // Now we need to remove the duplicates
    console.log(reports_neu.flatten().length);
    reports_neu = JSON.stringify(reports_neu, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_Report_NEU.txt", reports_neu);
}


function convertUndefined(){
    // 8 resources
    // 2 are definitely a journal articles, the others have no containerTitle given
    // one of the others is a book
    // 4 have no partOf filled the others have
    // How to recognize what type: if containerTitle --> journalArticle (second group and fourth group)
    // For 4 of them the title is missing: Book chapter in Edited Book (when grouping by title this is the first group) --> TODO: Check if everything goes right with the scans
    // Two are monographs one a book (the third group)

    var undefined = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty_undefined.txt'));
    var groups = groupBy(undefined, "containerTitle");
    //var groupsPartOf = groupBy(articles, "partOf");

    var undefined_new = [];
    // this is the monograph group
    for(var br of groups[2]){
        var type = enums.resourceType.monograph;
        var status = br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: type,
            cites: br.cites,
        });

        child.setTitleForType(type, br.title);
        child.setSubtitleForType(type, br.subtitle);
        child.setEditionForType(type, br.edition);
        child.setResourceEmbodimentsForType(type, br.embodiedAs);

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

       undefined_new.push([child]);
    }

    // these are the Journal articles
    groups[1].push(groups[3][0]);
    for(var br of groups[1]){
        var childType = enums.resourceType.journalArticle;
        var parentType =enums.resourceType.journalIssue;

        var status = br.status;

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType,
            cites: br.cites,
            partOf: br.partOf
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        child.setResourceEmbodimentsForType(childType, br.embodiedAs);

        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle && br.containerTitle != "") {
            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(enums.resourceType.journal, br.containerTitle);

            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];

            // TODO: check identifier assignment in detail
            for (var identifier of br.identifiers) {
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                } else if (identifier.scheme == enums.identifier.zdbId) {
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.isbn) {
                    parentIdentifiers.push(identifier);
                } else {
                    // everything else should belong to the child
                    childIdentifiers.push(identifier);
                }
            }
            child.setIdentifiersForType(childType, childIdentifiers);
            parent.setIdentifiersForType(parentType, parentIdentifiers);

            // generate new id for new parent
            if(child.partOf && child.partOf != ""){
                parent._id = child.partOf;
            }else{
                parent._id = mongoose.Types.ObjectId().toString();
                child.partOf = parent._id;
            }
            undefined_new.push([child, parent]);
        }else{
            // if there is no parent information at all, we leave the article on it's own and save all the identifiers in the child
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);

            undefined_new.push([child]);
        }
    }

    // this are book Chapters
    for(var br of groups[0]){
        childType = enums.resourceType.bookChapter;
        parentType =enums.resourceType.editedBook;


        var status = br.status;

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType,
            cites: br.cites,
            partOf: br.partOf
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        child.setResourceEmbodimentsForType(childType, br.embodiedAs);
        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle) {
            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(parentType, br.containerTitle);

            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];

            // TODO: check identifier assignment in detail
            for (var identifier of br.identifiers) {
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
                } else if (identifier.scheme == enums.identifier.isbn) {
                    parentIdentifiers.push(identifier);
                } else {
                    // everything else should belong to the child
                    childIdentifiers.push(identifier);
                }
            }
            child.setIdentifiersForType(childType, childIdentifiers);
            parent.setIdentifiersForType(parentType, parentIdentifiers);

            // generate new id for new parent
            if(child.partOf && child.partOf != ""){
                parent._id = child.partOf;
            }else{
                parent._id = mongoose.Types.ObjectId().toString();
                child.partOf = parent._id;
            }
            undefined_new.push([child, parent]);
        }else{
            // if there is no parent information at all, we leave the article on it's own and save all the identifiers in the child
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);

            undefined_new.push([child]);
        }
    }

    console.log(undefined_new.flatten().length);
    undefined_new = JSON.stringify(undefined_new, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty_undefined_NEU.txt", undefined_new);
}


function convertNothing(){
    // 20 resources
    // For 6 resources, the containerTitle=""
    // The rest seems to have a unique container title --> we won't create duplicates
    // Most are journal articles, but there are at least 2 book chapters of an edited book
    // None has partOf filled! That's good
    // Ok, I edited manually the file because it was tedious to automatically determine the resource type. MANED
    // Now, we can group by resource types first: We have 5 different resource types, most are journal articles, then monograph

    var undefined = JSON.parse(fs.readFileSync('./scripts/converter/analysis/ty__MANED.txt'));
    var groups = groupBy(undefined, "containerTitle");
    var groupsType = groupBy(undefined, "type");
    var groupsPartOf = groupBy(undefined, "partOf");

    var undefined_new = [];
    // this is the monograph group
    // we deal with component in the same way
    groupsType[3].push(groupsType[4][0])
    for(var br of groupsType[3]){
        var type = br.type;
        var status = br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: type,
            cites: br.cites,
        });

        child.setTitleForType(type, br.title);
        child.setSubtitleForType(type, br.subtitle);
        child.setEditionForType(type, br.edition);
        child.setResourceEmbodimentsForType(type, br.embodiedAs);

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

        undefined_new.push([child]);
    }

    // these are the Journal articles
    for(var br of groupsType[0]){
        var childType = enums.resourceType.journalArticle;
        var parentType =enums.resourceType.journalIssue;

        var volume = br.number.split(",")[0];
        var issue = br.number.split("(")[1] ? br.number.split("(")[1].split(")")[0] : "";
        var firstPage = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1].split("-")[0] : "";
        var lastPage = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1].split("-")[1] : "";

        var status = br.status;
        //var pages = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1] : br.number.split("p. ")[1];

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType,
            cites: br.cites,
            partOf: br.partOf
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        child.setResourceEmbodimentsForType(childType, br.embodiedAs);

        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle || br.partOf) {
            //child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({firstPage: firstPage, lastPage: lastPage})]);
            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(enums.resourceType.journal, br.containerTitle);

            parent.journalIssue_number = issue;
            parent.journalVolume_number = volume;


            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];

            // TODO: check identifier assignment in detail
            for (var identifier of br.identifiers) {
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                } else if (identifier.scheme == enums.identifier.zdbId) {
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.isbn) {
                    parentIdentifiers.push(identifier);
                } else {
                    // everything else should belong to the child
                    childIdentifiers.push(identifier);
                }
            }
            child.setIdentifiersForType(childType, childIdentifiers);
            parent.setIdentifiersForType(parentType, parentIdentifiers);

            // generate new id for new parent
            if(child.partOf && child.partOf != ""){
                parent._id = child.partOf;
            }else{
                parent._id = mongoose.Types.ObjectId().toString();
                child.partOf = parent._id;
            }
            undefined_new.push([child, parent]);
        }else{
            // if there is no parent information at all, we leave the article on it's own and save all the identifiers in the child
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);

            undefined_new.push([child]);
        }
    }

    // this are book Chapters and reports (work similarly)
    groupsType[1].push(groupsType[2][0])
    groupsType[1].push(groupsType[2][1])
    for(var br of groupsType[1]){
        childType = br.type;
        parentType = br.type == enums.resourceType.bookChapter ? enums.resourceType.editedBook : enums.resourceType.reportSeries;


        var status = br.status;

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType,
            cites: br.cites,
            partOf: br.partOf
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        child.setResourceEmbodimentsForType(childType, br.embodiedAs);
        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, br.publicationYear);

        if (br.containerTitle || br.partOf) {
            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(parentType, br.containerTitle);

            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];

            // TODO: check identifier assignment in detail
            for (var identifier of br.identifiers) {
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                } else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.isbn) {
                    parentIdentifiers.push(identifier);
                } else {
                    // everything else should belong to the child
                    childIdentifiers.push(identifier);
                }
            }
            child.setIdentifiersForType(childType, childIdentifiers);
            parent.setIdentifiersForType(parentType, parentIdentifiers);

            // generate new id for new parent
            if(child.partOf && child.partOf != ""){
                parent._id = child.partOf;
            }else{
                parent._id = mongoose.Types.ObjectId().toString();
                child.partOf = parent._id;
            }
            undefined_new.push([child, parent]);
        }else{
            // if there is no parent information at all, we leave the article on it's own and save all the identifiers in the child
            var identifiers = [];
            for (var identifier of br.identifiers) {
                if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                }
                identifiers.push(identifier);
            }

            child.setIdentifiersForType(childType, identifiers);

            undefined_new.push([child]);
        }
    }

    console.log(undefined_new.flatten().length);
    undefined_new = JSON.stringify(undefined_new, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/ty__MANED_NEU.txt", undefined_new);
}


function convertJOURNAL(){
    // total 315
    // grouping by containerTitle gives 137 groups, in the first group we have only one with partOf filled and 4 are journals
    // grouping by partOf gives 5 groups --> 249 without partOf, 2 singletons, 9 linked to acta sociologica and 55 american behavioral scientist

    var articles = JSON.parse(fs.readFileSync('./scripts/converter/analysis_finding_missing/ty_missing_JOURNAL.txt'));
    var groups = groupBy(articles, "containerTitle");
    var groupsPartOf = groupBy(articles, "partOf");

    var leftovers = [];

    var journals = [];
    var journalArticles = [];

    for(var br of articles) {
        if (!br.partOf && !br.containerTitle && !br.number) {
            /**
             * here the actual journals
             */
            var journal = new BibliographicResource({
                journal_identifiers: br.identifiers,
                journal_title: br.title,
                _id: br._id,
                status: br.status, // Eventually we need to map this somehow
                parts: br.parts,
                type: enums.resourceType.journal,
                cites: br.cites,
                partOf: br.partOf,
            });
            journals.push([journal])
        } else if (br.containerTitle && !br.partOf) {
            /**
             * here unlinked journalArticles
             */
            var childType = enums.resourceType.journalArticle;
            var parentType = enums.resourceType.journalIssue;

            var volume = br.number.split("(")[0];
            var issue = br.number.split("(")[1] ? br.number.split("(")[1].split(")")[0] : "";
            var firstPage = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1].split("-")[0] : "";
            var lastPage = br.number.split("pp. ")[1] ? br.number.split("pp. ")[1].split("-")[1] : "";

            if(br.number.split("Autumn")[1] && firstPage == "" && lastPage == ""){
                volume = br.number.split("),")[1].split(" (")[0] ? br.number.split("),")[1].split(" (")[0] : "";
                issue = br.number.split(") ")[1].split(", ")[0] ? br.number.split(") ")[1].split(", ")[0] : "";
                firstPage = br.number.split("S. ")[1] ? br.number.split("S. ")[1].split("-")[0] : "";
                lastPage = br.number.split("S. ")[1] ? br.number.split("S. ")[1].split("-")[1] : "";
            }

            var status = br.status;

            var child = new BibliographicResource({
                _id: br._id,
                status: status, // Eventually we need to map this somehow
                parts: br.parts,
                type: childType,
                cites: br.cites,
                partOf: br.partOf
            });

            child.setTitleForType(childType, br.title);
            child.setSubtitleForType(childType, br.subtitle);
            child.setEditionForType(childType, br.edition);
            child.setContributorsForType(childType, br.contributors);
            child.setPublicationDateForType(childType, br.publicationYear);

            if(firstPage != "" && lastPage != ""){
                child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({
                    firstPage: firstPage,
                    lastPage: lastPage
                })]);
            }else{
                child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment(br.embodiedAs[0])]);
            }

            var parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(enums.resourceType.journal, br.containerTitle);

            parent.journalIssue_number = issue;
            parent.journalVolume_number = volume;

            // now we split the identifiers according to the hierarchy
            var parentIdentifiers = [];
            var childIdentifiers = [];

            for (var identifier of br.identifiers) {
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                } else if (identifier.scheme == enums.identifier.zdbId) {
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.isbn) {
                    parentIdentifiers.push(identifier);
                } else {
                    // everything else should belong to the child
                    childIdentifiers.push(identifier);
                }
            }
            child.setIdentifiersForType(childType, childIdentifiers);
            parent.setIdentifiersForType(parentType, parentIdentifiers);

            parent._id = mongoose.Types.ObjectId().toString();
            child.partOf = parent._id;
            journalArticles.push([child, parent]);
        }else if (!br.partOf && !br.containerTitle && br.number) {
            /**
             * article is not linked and has no container title, but a number
             * 3 resources, which just should be transformed to parent + child
             */

            childType = enums.resourceType.journalArticle;
            parentType = enums.resourceType.journalIssue;

            volume = br.number.split('(')[0] ? br.number.split('(')[0] : "";
            if(br.number.indexOf('S.')>-1){
                year = br.number.split('(')[1] && br.number.split('(')[1].split(')')[0] ? br.number.split('(')[1].split(')')[0] : "";
                issue = br.number.split('(')[1] && br.number.split('(')[1].split('), ')[1].split(',')[0] ? br.number.split('(')[1].split('), ')[1].split(',')[0] : "";
                firstPage = br.number.split('(')[1] && br.number.split('S. ')[1].split('-')[0] ? br.number.split('S. ')[1].split('-')[0] : "";
                lastPage = br.number.split('(')[1] && br.number.split('S. ')[1].split('-')[1] ? br.number.split('S. ')[1].split('-')[1] : "";
            }else{
                issue = br.number.split('(')[1] ?  br.number.split('(')[1].split(')')[0] : "";
            }

            status = br.status;

            child = new BibliographicResource({
                _id: br._id,
                status: status, // Eventually we need to map this somehow
                parts: br.parts,
                type: childType,
                cites: br.cites,
                partOf: br.partOf
            });

            child.setTitleForType(childType, br.title);
            child.setSubtitleForType(childType, br.subtitle);
            child.setEditionForType(childType, br.edition);
            child.setContributorsForType(childType, br.contributors);
            child.setPublicationDateForType(childType, br.publicationYear);
            if(firstPage != "" && lastPage != ""){
                child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({
                    firstPage: firstPage,
                    lastPage: lastPage
                })]);
            }else{
                child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment(br.embodiedAs[0])]);
            }
            parent = new BibliographicResource({type: parentType, status: status});
            parent.setTitleForType(enums.resourceType.journal, br.containerTitle);
            parent.journalIssue_number = issue;
            parent.journalVolume_number = volume;

            // now we split the identifiers according to the hierarchy
            parentIdentifiers = [];
            childIdentifiers = [];

            for (identifier of br.identifiers) {
                // if there exists a series identifier, than the series should be the parent independent
                // of the resource type
                if (identifier.scheme == enums.identifier.issn) {
                    parentIdentifiers.push(identifier);
                    // if there exists a zdb identifier, than it should be the parent identifier
                } else if (identifier.scheme == enums.identifier.zdbId) {
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                    identifier.scheme = enums.identifier.swbPpn;
                    parentIdentifiers.push(identifier);
                } else if (identifier.scheme == enums.identifier.isbn) {
                    parentIdentifiers.push(identifier);
                } else {
                    // everything else should belong to the child
                    childIdentifiers.push(identifier);
                }
            }
            child.setIdentifiersForType(childType, childIdentifiers);
            parent.setIdentifiersForType(parentType, parentIdentifiers);

            parent._id = mongoose.Types.ObjectId().toString();
            child.partOf = parent._id;

            journalArticles.push([child, parent]);
            //leftovers.push([child, parent]);
        }else if((br.containerTitle && br.partOf) || (!br.containerTitle && br.partOf)){
            /**
             * article is linked and has container title
             * or article is linked and has no container title
             */
            // Did we forget anything? yes: the ones linked with container title
            childType = enums.resourceType.journalArticle;

            status = br.status;

            child = new BibliographicResource({
                _id: br._id,
                status: status, // Eventually we need to map this somehow
                parts: br.parts,
                type: childType,
                cites: br.cites,
                partOf: br.partOf
            });

            child.setTitleForType(childType, br.title);
            child.setSubtitleForType(childType, br.subtitle);
            child.setEditionForType(childType, br.edition);
            //child.setNumberForType(type, this.number);

            child.setContributorsForType(childType, br.contributors);
            child.setPublicationDateForType(childType, br.publicationYear);


            child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment(br.embodiedAs[0])]);

            if(br.number){
                // no resource has any issue or volume information
                volume = br.number.split("Vol. ")[1].split(",")[0];
                issue = br.number.split("Vol. ")[1].split(",")[1].split("No. ")[1].split(" (")[0];
                var year = br.number.split("Vol. ")[1].split(",")[1].split("No. ")[1].split(" (")[1].split(")")[0];
                firstPage = br.number.split("Vol. ")[1].split(",")[2].split(" p. ")[1].split("-")[0];
                lastPage = br.number.split("Vol. ")[1].split(",")[2].split(" p. ")[1].split("-")[1];

                parentType = enums.resourceType.journalIssue;
                parent = new BibliographicResource({type: parentType, status: status});
                parent.setTitleForType(enums.resourceType.journal, br.containerTitle);

                parent.journalIssue_number = issue;
                parent.journalVolume_number = volume;

                // now we split the identifiers according to the hierarchy
                parentIdentifiers = [];
                childIdentifiers = [];

                for (var identifier of br.identifiers) {
                    // if there exists a series identifier, than the series should be the parent independent
                    // of the resource type
                    if (identifier.scheme == enums.identifier.issn) {
                        parentIdentifiers.push(identifier);
                        // if there exists a zdb identifier, than it should be the parent identifier
                    } else if (identifier.scheme == enums.identifier.zdbId) {
                        parentIdentifiers.push(identifier);
                    } else if (identifier.scheme == enums.identifier.swbPpn || identifier.scheme == "PPN") {
                        identifier.scheme = enums.identifier.swbPpn;
                        parentIdentifiers.push(identifier);
                    } else if (identifier.scheme == enums.identifier.isbn) {
                        parentIdentifiers.push(identifier);
                    } else {
                        // everything else should belong to the child
                        childIdentifiers.push(identifier);
                    }
                }
                parentType = enums.resourceType.journalIssue;
                child.setIdentifiersForType(childType, childIdentifiers);
                parent.setIdentifiersForType(parentType, parentIdentifiers);

                parent._id = mongoose.Types.ObjectId().toString();
                child.setPublicationDateForType(childType, year);
                child.partOf = parent._id;
                journalArticles.push([child, parent]);
            }else{
                child.setIdentifiersForType(childType, br.identifiers);
                child.partOf = br.partOf;
                journalArticles.push([child]);
            }
        }else{
            // did we forget anything?
            // NO :)
            leftovers.push(br)
        }
    }

    assert(leftovers.length == 0)

    // Now we need to remove the duplicates
    groups = groupBy(journalArticles.flatten(), "journal_title");

    var articles_cleaned = [];
    var duplicate_group = [];
    for(var g of groups){
        console.log(g[0].journal_title);
        var volumeGroups = groupBy(g, "journalVolume_number");
        for(var vg of volumeGroups){
            var issueGroups = groupBy(vg, "journalIssue_number");
            for(var ig of issueGroups){
                // TODO: If it is of type journal and the identifiers are the same, then anyways we want to remove the duplicates
                if(ig[0].journal_title && ig[0].type == enums.resourceType.journalIssue && ig.length > 1){
                    // here we have our duplicates
                    var corruptIdentifiers = [];
                    for(var br of ig){
                        corruptIdentifiers.push(br._id);
                    }
                    duplicate_group.push(corruptIdentifiers);
                }
            }
        }

    }
    // select one of them, set all partOfs to that and delete the other two
    for(var br of journalArticles.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            if(br.partOf && corruptIdentifiers.indexOf(br.partOf)> -1 && br.partOf != corruptIdentifiers[0]){
                br.partOf = corruptIdentifiers[0];
                break;
            }

        }
    }
    for(var br of journalArticles.flatten()){
        for(var corruptIdentifiers of duplicate_group){
            var is_duplicate = false;
            if(br._id != corruptIdentifiers[0] && corruptIdentifiers.indexOf(br._id)> -1){
                is_duplicate = true;
                break;
            }
        }
        if(!is_duplicate){
            articles_cleaned.push(br);
        }
    }

    console.log(articles_cleaned.flatten().length);
    articles_cleaned = JSON.stringify(articles_cleaned, null, 2);
    fs.writeFileSync("./scripts/converter/analysis_finding_missing/ty_missing_JOURNAL_NEU.txt", articles_cleaned);
}

function convertMONOGRAPH(){
    var monographs = JSON.parse(fs.readFileSync('./scripts/converter/analysis_finding_missing/ty_missing_MONOGRAPH.txt'));
    // type is 'Monograph' for each of them
    // grouping by container title shows that most of them have none: only one monograph in the last group is problematic regarding that
    // partOf does not cause any trouble here
    var groups = groupBy(monographs, "containerTitle");
    var groupsPartOf = groupBy(monographs, "partOf");
    var monographs_neu = [];

    groups[0] = groups[0].concat(groups[1]);
    for(var br of groups[0]){
        var type = enums.resourceType.monograph;
        var status = br.status;

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: type,
            cites: br.cites
        });

        child.setTitleForType(type, br.title);
        child.setSubtitleForType(type, br.subtitle);
        child.setEditionForType(type, br.edition);
        child.setContributorsForType(type, br.contributors);
        child.setPublicationDateForType(type, br.publicationYear);
        child.setIdentifiersForType(type, br.identifiers);

        monographs_neu.push([child]);
    }

    // this is a book chapter in an edited book
    for(var br of groups[2]){
        var childType = enums.resourceType.bookChapter;
        var parentType = enums.resourceType.editedBook;
        var firstPage = 13;
        var lastPage = 31;
        var year = 2006;
        var status = br.status;

        var child = new BibliographicResource({
            _id: br._id,
            status: status, // Eventually we need to map this somehow
            parts: br.parts,
            type: childType,
            cites: br.cites
        });

        child.setTitleForType(childType, br.title);
        child.setSubtitleForType(childType, br.subtitle);
        child.setEditionForType(childType, br.edition);
        child.setContributorsForType(childType, br.contributors);
        child.setPublicationDateForType(childType, year);

        var parent = new BibliographicResource({type: parentType, status: status});

        parent.setTitleForType(parentType, br.containerTitle);
        child.setResourceEmbodimentsForType(childType, [new ResourceEmbodiment({firstPage: firstPage, lastPage: lastPage})]);


        var parentIdentifiers = [];
        var childIdentifiers = [];
        for (var identifier of br.identifiers) {
            if (identifier.scheme == enums.identifier.swbPpn) {
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
    fs.writeFileSync("./scripts/converter/analysis_finding_missing/ty_missing_MONOGRAPH_NEU.txt", monographs_neu);
}




function convert(){
    convertCOLLECTION();
    convertAufsatzsammlung();
    convertBookChapter();
    convertMonograph();
    convertBOOK_CHAPTER();
    convertEditedBook();
    convertComponent();
    convertBook();
    convertJournalArticle();
    convertJournal();
    convertReport();
    convertUndefined();
    convertNothing();
}


function analyzeResult(){
    // nested array
    var nothing = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty__MANED_NEU.txt'));
    var aufsatzsammlung = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_Aufsatzsammlung_NEU.txt'));

    // flat array
    var bookChapter = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_Book chapter_NEU.txt'));

    // nested array
    var book_chapter = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_BOOK_CHAPTERS_NEU.txt'));
    var book = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_Book_NEU.txt'));

    // flat array
    var collection = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_COLLECTION_NEU.txt'));
    var component = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_Component_NEU.txt'));

    // nested array
    var editedBook = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_Edited book_NEU.txt'));

    // flat array
    var journalArticle = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_Journal article_NEU.txt'));
    var journal = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_JOURNAL_NEU.txt'));

    // nested array
    var monographs = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_MONOGRAPHS_NEU.txt'));
    var report = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_Report_NEU.txt'));
    var undefined = JSON.parse(fs.readFileSync('./scripts/converter/analysis/conversion/ty_undefined_NEU.txt'));

    // flatten the nested arrays
    nothing = nothing.flatten();
    aufsatzsammlung = aufsatzsammlung.flatten();
    book_chapter = book_chapter.flatten();
    book = book.flatten();
    undefined = undefined.flatten();
    editedBook = editedBook.flatten();
    monographs = monographs.flatten();
    report = report.flatten();

    var all = nothing.concat(aufsatzsammlung).concat(book_chapter).concat(book)
        .concat(undefined).concat(bookChapter).concat(collection).concat(component).concat(editedBook)
        .concat(journalArticle).concat(journal).concat(monographs).concat(report);

    console.log("Number of instances: " + all.length);
    var typeGroups = groupBy(all, "type");
    console.log("Number of different types: " + typeGroups.length);
    for(var typeGroup of typeGroups){
        console.log("Type " + typeGroup[0].type + ": " + typeGroup.length);
    }

    var statusGroups = groupBy(all, "status");
    console.log("Number of different status: " + statusGroups.length);
    for(var statusGroup of statusGroups){
        console.log("Status " + statusGroup[0].status + ": " + statusGroup.length);
    }

    // now check for duplicates
    var ids = [];
    for(var br of all){
        if(ids.indexOf(br._id) > -1){
            console.log(br._id);
        }else{
            ids.push(br._id);
        }
    }

    console.log("Data loaded");
    all = JSON.stringify(all, null, 2);
    fs.writeFileSync("./scripts/converter/analysis/all_NEU.txt", all);
}

//analyzeResult()

//convert();
//typeAnalysis('./bibliographicResources.json');
//convertCOLLECTION();
//convertAufsatzsammlung();
//convertBookChapter();
//convertMonograph()
//convertBOOK_CHAPTER()
//convertEditedBook()
//convertComponent()
// convertBook()
//convertJournalArticle()
//convertJournal()
// convertReport()
//convertUndefined()
//convertNothing()
//convert('./bibliographicResources.json');
//convertJOURNAL();
convertMONOGRAPH();


