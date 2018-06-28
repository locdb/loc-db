'use strict';

var config = {
    HOST: (process.env.LOCDB_HOST || "localhost"),
    PORT: (process.env.LOCDB_PORT || 80),
    BASEPATH: (process.env.LOCDB_BASEPATH || "/"),
    DB: {
        HOST: (process.env.LOCDB_DB_HOST || "localhost"),
        PORT: (process.env.LOCDB_DB_PORT || "27017"),
        USER: (process.env.LOCDB_DB_USER || ""),
        PWD: (process.env.LOCDB_DB_PWD || ""),
        SCHEMA: (process.env.LOCDB_DB_SCHEMA || "locdb")
    },
    SEARCHINDEX:{
        HOST: (process.env.LOCDB_SEARCHINDEX_HOST || "localhost"),
        PORT: (process.env.LOCDB_SEARCHINDEX_PORT || "9200"),
        PROTOCOL: (process.env.LOCDB_SEARCHINDEX_PROTOCOL || "http")
    },
    GVI:{
        HOST: 'gvi.bsz-bw.de',
        PORT: 80,
        CORE: 'GVI',
        //ROOTPATH: 'solr/GVI',
        //PROTOCOL: 'http'
    },
    K10plus:{
        HOST: 'findex.gbv.de',
        PORT: 80,
        CORE: '180',
        PATH: '/index'
        //ROOTPATH: 'solr/GVI',
        //PROTOCOL: 'http'
    },
    URLS: {
        SWB: "http://swb.bsz-bw.de/sru/DB=2.1/username=/password=/",
        ZDB: "http://services.dnb.de/sru/zdb",
        OLCSSGSOZ: "http://sru.gbv.de/olcssg-soz",
        OCR_FILEUPLOAD: "https://locdb-dev.opendfki.de/fileupload/",
        OCR_FILEVIEW: "https://locdb-dev.opendfki.de/fileview/",
        OCR_IMAGEVIEW: "https://locdb-dev.opendfki.de/getimage/"
    },
    PATHS: {
        UPLOAD: (process.env.LOCDB_UPLOAD_PATH || "./../upload/"),
        CACHE: (process.env.LOCDB_CACHE_PATH || "./../cache/")
    }
}

module.exports = config;

