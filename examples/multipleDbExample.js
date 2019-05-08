const Migration = require('mongo-cop').Migration;
const path = require('path');

function runMigration(migrationObj) {
    return new Promise((res, rej) => {
        migrationObj.migrate((err, results) => {
            if (err) {
                console.log('An error occured', err);
                rej(err);
            } else {
                console.log('Results ', ' - ', JSON.stringify(results));
                res(results);
            }
        });
    });
}

(async function testRunner() {
    const migratorArr = [];
    try {
        dbNameCollection = ['admin', 'mydb', 'testdb', 'hello', 'world'];
        dbNameCollection.forEach((orgName) => {
            const config = {
                host: 'localhost',
                db: orgName,
                migrationCollection: 'migration'
            };
            const migrationObj = new Migration(config);
            migrationObj.add([
                { path: path.join(__dirname, './migrationFiles/simple.js'), mode: 'up' },
                { path: path.join(__dirname, './migrationFiles/serial.js'), mode: 'down' }], 100);
            migratorArr.push(migrationObj);
        });
        await Promise.all(migratorArr.map(runMigration));
        process.exit(0);
    } catch (e) {
        console.log('An error occured ', e);
        process.exit(1);
    }
}());

