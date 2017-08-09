# Linked Open Citation Database (LOC-DB)

[![Build Status](https://travis-ci.org/locdb/loc-db.svg?branch=master)](https://travis-ci.org/locdb/loc-db)
[![Greenkeeper badge](https://badges.greenkeeper.io/locdb/loc-db.svg)](https://greenkeeper.io/)

This is the central component of the LOC-DB project.

## Project Overview
The LOC-DB project will develop ready-to-use tools and processes based on the linked-data technology that make it possible for a single library to meaningfully contribute to an open, distributed infrastructure for the cataloguing of citations.

More information can be found here: https://locdb.bib.uni-mannheim.de/blog/en/ .

## Installation

1. Download MongoDB and follow their installation instructions, see https://www.mongodb.com .

2. Download the project itself and change to project directory
```
cd loc-db
```

3. Install
```
npm install
```

## Usage Instructions

Start the backend with
```
swagger project start
```
or run the tests
```
swagger project test
```
