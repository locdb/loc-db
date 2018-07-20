'use strict';

var config = {
    DB: {
        HOST: (process.env.LOCDB_DB_HOST || "localhost"),
        PORT: (process.env.LOCDB_DB_PORT || "27017"),
        USER: (process.env.LOCDB_DB_USER || ""),
        PWD: (process.env.LOCDB_DB_PWD || ""),
        SCHEMA: (process.env.LOCDB_DB_SCHEMA || "test"),
    },
    PATHS: {
        UPLOAD: (process.env.LOCDB_UPLOAD_PATH || "./test/api/data/ocr_data/"),
    }
};

module.exports = config;
