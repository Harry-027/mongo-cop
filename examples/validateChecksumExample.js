'use strict';

const path = require('path');
const Migration = require('mongo-cop').Migration;

const config = {
    host: 'localhost',
    db: 'testdb',
    migrationCollection: 'migration',
    validateChecksum: true
};

const migration = new Migration(config);

migration.add([
    { path: path.join(__dirname, './migrationFiles/simple.js'), mode: 'up' },
    { path: path.join(__dirname, './migrationFiles/serial.js'), mode: 'down' }], 100);

migration.migrate(function (err, results) {
    console.log(err, results);
});