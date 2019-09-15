# OCExporter

Exports the bibliographic resources and citation data from the LOC-DB system in OpenCitations format.

## Usage
Step (1): Generate a .json dump of the bibliographic resources collection. There are several ways to do so, 
One way is to call ```wget``` on the specific /bibliographicResources endpoint of the system of interest.
For example:
```
 wget http://locdb.bib.uni-mannheim.de/locdb/bibliographicResources
```

Step (2): Use this tool to convert the .json dump to an OpenCitations .jsonld. The script expects two arguments, the path 
to the input dump and a path to the desired output file.

```
Usage: export [options]

Options:
  -i, --input_file <f>   Input file
  -o, --output_file <o>  Output file
  -m, --maximum <N>      Process only first <N> entries
  -h, --help             output usage information
```
  
For example:
```
node export.js -i ~/export/bibliographicResources -o ~/export/bibliographicResourcesOC.jsonld
```
 Or process only the first 5 entries:
 ```
 node export.js -i ~/export/bibliographicResources -o ~/export/bibliographicResourcesOC.jsonld -m 5
 ```
 