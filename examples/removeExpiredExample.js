'use strict';

const Migration = require('mongo-cop').Migration;

const config = {
    host: 'localhost',
    db: 'testdb',
    migrationCollection: 'migration',
    validateChecksum: true
};

const migration = new Migration(config);

(async function removeExpired() {
    try {
        await migration.removeExpiredVersions();
    } catch (err) {
        console.log(err);
    }
})();