# Linked Open Citation Database (LOC-DB)

[![Build Status](https://travis-ci.org/locdb/loc-db.svg?branch=master)](https://travis-ci.org/locdb/loc-db)

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

### Simple Setting (swagger)

Start the backend with
```
swagger project start
```
or run the tests
```
swagger project test
```

### Deployment Setting (pm2)

In the deployment setting we use `pm2` as production manager in order to manage different versions and environments on our server. The currently running applications can be listed with
```
pm2 list
```
This command also prints the link to our keymetrics monitoring, where you can manage the apps with a GUI.
Using the console, apps can be restarted with
```
pm2 restart <app_name>
```
Restart and start will keep the environment variables if you specify the app name correctly. Starting an app from scratch should be avoided. If you have to do so, make sure that you specify the concrete environment. In order to manage those, we use a specific json file [pm2.json](pm2.json), which is located in the root of our source code. Starting the app in all three specified modes can be done with
```
pm2 start pm2.json --env development
pm2 start pm2.json --env demo
pm2 start pm2.json --env production
```
Stopping an app can be done with
```
pm2 stop <app_name>
```
