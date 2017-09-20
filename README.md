# Linked Open Citation Database (LOC-DB)

[![Build Status](https://travis-ci.org/locdb/loc-db.svg?branch=master)](https://travis-ci.org/locdb/loc-db)
[![Greenkeeper badge](https://badges.greenkeeper.io/locdb/loc-db.svg)](https://greenkeeper.io/)

This is the central component of the LOC-DB project.

## project overview
The LOC-DB project will develop ready-to-use tools and processes based on the linked-data technology that make it possible for a single library to meaningfully contribute to an open, distributed infrastructure for the cataloguing of citations.

More information can be found here: https://locdb.bib.uni-mannheim.de/blog/en/ .

## Basic usage instructions
### 0. Download MongoDB and follow their installation instructions
See https://www.mongodb.com .
### 1. Download Elasticsearch and follow their installation instructions
See Link
### 2. Download the project itself and change to project directory
```
cd loc-db
```
### 3. Install the Node.js modules needed
```
npm install
```
### 4. Start or run the tests
```
npm start
```
or
```
npm test
```

## Configuration
The configuration of the project can be managed in two ways:
### 1. Editing config.js
The file /api/config/config.js holds basic configuration, such as database host and port.
You can edit the string values to define your own default configuration.
### 2. Setting environment variables
Another way to specify the configuration of the project is to use a set of predefined environment variables.
When the project is loaded, the default values in config.js are overwritten with the values of the corresponding
environment variables in case they are set.