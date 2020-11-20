[![Build Status](https://travis-ci.com/Harry-027/mongo-cop.svg?branch=master)](https://travis-ci.com/Harry-027/mongo-cop)

# mongo-cop

### The Problem
Working on an enterprise level application that connects to Mongo database! Dealing with multiple environments, adhering to CI-CD strictly! Then db migrations must be a concern.

### The Solution
No worries, mongo-cop is here to rescue. It's a node js library that takes care of all your migration needs.
With utmost flexibility, it provides following features:
 * It takes care of running all your migration scripts asynchronously.
 * It can serve both - standalone database connection & replica sets.
 * You can run multiple migration scripts on multiple databases for a given cluster at a time.
 * It persists migration report (migration or rollback) with status(success or failure) in database against last updated date. 
   You may also opt for persisting build number against each migration record in case you are consuming mongo-cop within CI-CD pipeline itself.
 * It provides you an option to keep a hash for an executed migration script so to keep a check & prevent its next execution in case of any change.
 * Once executed a migration script , won't run again unless you decide to toggle the mode (up to down/ down to up) & rollback the migration.
 * A script once marked as expired (when you set the mode as 'expired') won't run again, even if you change the mode.
 * It also provides you an option to remove expired migration script records from migration report if any.

----

### Installation

```
npm install mongo-cop --save

```

### Usage

```
const Migration = require('mongo-cop').Migration;

```

#### Configuration

An object that contains db access credentials (to connect to database) & collection name (to store the migration report).
Pass this to Migration class constructor to get a new migration object
```
{
   host: 'localhost',
   db: 'admin',
   user : 'username',
   password : 'password',
   mongoUri : 'mongodb://user:pass@mongo.host.com:27017/dbname',
   migrationCollection: 'migration'
}

```

Note that host or mongoUri, either of them are required parameter. Also migrationCollection is mandatory for report collection, this would be the collection where migration status will be stored.Use user & password parameters if db authentication is required.

#### Replica set support

To connect to a replica set, add replicaSet name and host in configuration:

```
const config =  {
    // ...
    host: 'my.host.com:27017,my.otherhost.com:27018,my.newhost.com:27019',
    replicaSet : 'thereplica',
   
    // or mention replica set in connection string itself
    mongoUri: 'mongodb://my.host.com:27017,my.otherhost.com:27018,my.newhost.com:27019/dbName?replicaSet=thereplica'
}

```

#### Checksum

Whenever a migration step is done, the step file checksum is saved on database. Its actually the hash of migration file. If you want to keep a check if already executed migration script has been changed, you can pass an optional boolean param validateChecksum as true to config object. This will validate the checksum stored in db against the checksum of given file before processing file again for migration. Migration process will abort & an error will be thrown in case the migration file was changed after its last execution (since there would be hash mismatch).

```
const config =  {
    // ...
    validateChecksum: true
}

```

#### Migration File example

This file should export an object containing following 3 properties:

    * id - Migration id. It should be unique. Migration report to be prepared against it.
           Migration won't proceed in case - multiple migration files containing duplicate Ids.
    * up - Migration script. Receives MongoDB native driver (to execute the migration) & callback method.
    * down - Rollback script. Receives MongDB native driver (to execute the rollback) & callback method.

Callback execution after script execution is required. In case of any error, pass error object to given callback for propagation.

```
function updateTest(db) {
    return new Promise(async (res, rej) => {
        try {
            await db.collection('test').insertOne({ id: 0, name: 'Hello World!' });
            res();
        } catch(err) {
            rej(err);
        }
    });
}

module.exports = {
    id: 'simple-query',

    up : function(db, cb){
        updateTest(db).then(async () => {
            await cb(); // in case migration is successfull
        }).catch(async (err) => {
            await cb(err); // in case any error occurs pass err to cb
        })
    },

    down : function(db, cb){
        db.collection('testcollection').remove({ name: 'Hello-world' });
        await cb();
    }
}

```

#### Migration Object

Invoke the Migration constructor & initialise it with configuration object. This will result back a migration object. 
Migration object exposes an add api which takes an array of objects(containing path & mode information) and the CI-CD build number(optional param). Path is the relative path to migration script and mode will decide whether to run migration , rollback or set the migration record as expired. Mode can have these values:
    * up - to run the migration step.
    * down - to run the roll back step.
    * expired - to set the migration record as expired. (once migration record has been marked as expired, it won't execute again).

Its preferable to use mongo-cop in CI-CD pipeline itself, before the code deployment. Once migration or rollback (whether passed/failed, status can be verified in migration report) is complete , it won't get executed again in successive builds unless you toggle the mode. Toggling mode will execute migration again (based on mode). Also it will reset the last mode status (to null) and set the current mode status (to success or failure). This will help to rollback the migration in case it failed in last build.You can toggle the mode (up to down) to run the rollback script in next build. 

```

const Migration = require('mongo-cop').Migration;
const config = {
                host: 'localhost',
                db: 'mydbName',
                migrationCollection: 'migration'
            };
const buildNumber = 100; // optional param, may be injected through CI-CD.
const migrationObj = new Migration(config);
migrationObj.add([
    { path: path.join(__dirname, 'path-to-migration-script'), mode: 'up' },
    { path: path.join(__dirname, 'path-to-migration-script'), mode: 'down' }], buildNumber);

```

#### Running migration

Once add has been invoked on migrationObj, execute migrate method to execute all the given migration scripts based on their mode details:

```
migrationObj.migrate(function(err, results){});

```

The migrate callback will receive two params:
    * err - An error in case any issue occurs(such as failure to update the migration report) or any rule violation happens(such as duplicate migration ids in different migration files). Note that error won't be thrown in case any error is thrown from migration script, instead it will mark migration status as failed in migration report.
    * results - An object stating the result whether success or failure for each migration file/step.

After execution completion you can check the status as passed or failed in migration report collection.


#### Removing expired migration records from migration report collection

Migration object also exposes a method called removeExpiredVersions. Invoking it will remove all the migration records marked as expired from migration collection if any.

```
(async function removeExpired() {
    try {
        await migrationObj.removeExpiredVersions();
    } catch (err) {
        console.log(err);
    }
})();

```

#### Sync/Async migrations

You can run multiple asynchronous queries as part of single migration

```
const async = require('async');

module.exports = {
    id: 'multiple-migration-query',

    up : function(db, cb){
        async.series(
            [
                function(cb){db.collection('test').insert({ name: 'Hi' }, cb)},
                function(cb){db.collection('test').insert({ name: 'Hello' }, cb)},
                function(cb){db.collection('test').insert({ name: 'World' }, cb)}
            ],
            cb
        );
    }

    down : function(db, cb){
        async.parallel(
            [
                function(cb){db.collection('test').insert({ name: 'Hi' }, cb)},
                function(cb){db.collection('test').insert({ name: 'Hello' }, cb)},
                function(cb){db.collection('test').insert({ name: 'World' }, cb)}
            ],
            cb
        );
    }
}

```

#### Multiple databases migrations

You can run the migration scripts in multiple databases at same time. Please check examples for further details.

### LICENSE
MIT
