const OCExporter = require('./OCExporter.js').createOCExporter();
const fs = require('fs');
const program = require('commander');


program.option('-i, --input_file <f>', 'Input file');
program.option('-o, --output_file <o>', 'Output file');
program.parse(process.argv);

console.log("Started exporter script ... ");

function convert(inputFile, outputFile){

    OCExporter.clear();
    OCExporter.convertFile(inputFile, function(err) {
        if (!err) {
            OCExporter.getJSONLD(function(err, nquads){
                fs.writeFile(outputFile, nquads, function(err) {
                    if (err) {
                        console.log(err);
                        console.log("Exiting ... ")
                        process.exit()
                    }
                    console.log("Successfully written oc conversion to file ", outputFile);
                    process.exit();
                });
            });
        }
    });
}
/*function convert(outputFolder){
    br.find({},{},function(err, docs){
        if(err){
            console.log(err);
            console.log("Exiting ... ");
            process.exit();
        }
        if(docs.length === 0){
            console.log("Database empty. Exiting ... ")
            process.exit()
        }
        let filename = 'bibliographic_resources_' + Date.now() + '.json';
        console.log("Writing bibliographic resources to ", filename);
        fs.writeFile(path.resolve(outputFolder, filename), docs, function(err){
            if (err){
                console.log(err);
                console.log("Exiting ... ")
                process.exit()
            }
            console.log("Successfully written bibliographic resources dump to file ", path.resolve(outputFolder, filename));
            OCExporter.clear();
            OCExporter.convertFile(path.resolve(outputFolder, filename), function(err) {
                if (!err) {
                    OCExporter.getNQUADS(function(err, nquads){
                        filename = 'oc_bibliographic_resources_' + Date.now() + '.json';
                        fs.writeFile(path.resolve(outputFolder, filename), docs, function(err) {
                            if (err) {
                                console.log(err);
                                console.log("Exiting ... ")
                                process.exit()
                            }
                            console.log("Successfully written oc conversion to file ", path.resolve(outputFolder, filename));
                            process.exit();
                        });
                    });
                }
            });
        });
    });
}*/

convert(program.input_file, program.output_file);


