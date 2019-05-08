# mongo-cop

### The Problem
Working on an enterprise level application that connects to MongoDB database! Dealing with multiple environments, adhering to CI-CD strictly. Then db migrations must be a concern.

### The Solution
No worries, mongo-cop is here to rescue. It's a node js library that take cares of all your db migration needs.
It provides you utmost flexibility with following features:
 * It takes care of running all your migration scripts asynchronously.
 * It supports both - simple database connection & replica sets.
 * It helps you to run your migration scripts on multiple databases.
 * It persists migration report (migration or rollback) with status(success or failure) in database against last updated date. You may also opt for persisting build number against each migration record in case you are consuming mongo-cop within CI-CD pipeline itself.
 * It provides you an option to keep a check if already run migration script has been changed.
 * Once executed a migration script , won't run again unless you decide to toggle the mode (up to down/ down to up) & rollback the migration.
 * A script once marked as expired (when you set the mode as 'expired') won't run again even if you change the mode.
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

It's a javascript object that contains the MongoDB access credentials (to connect to database) & collection name (to store the migration report).

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

Note that host or mongoUri , either of them is a required param. Also migrationCollection is a mandatory one, this is the collection where migration status will be stored.
Use user & password parameters if db authentication is required.

#### Replica set support

To connect to a replica set, enter your replicaSet name and add the replica set host on your Configuration:

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

Whenever a migration step is done, the step file checksum is saved on database. Its actually the hash of your migration file. If you want to keep a check if already run migration script has been changed you can pass an optional param validateChecksum as true to your config object. It will validate the checksum stored in db against the checksum of given file before processing file again for migration. Migration process will abort & an error will be thrown in case the migration file was changed after its last execution.

```
const config =  {
    // ...
    validateChecksum: true
}

```

#### Migration File example

This should export an object containing following 3 properties:

    * id - Migration id. It should be unique. Migration report to be prepared against it.
           Migration won't proceed in case multiple migration files containing duplicate Ids.
    * up - Migration script. Receives MongoDB native driver (to run the migration) & callback method.
    * down - Rollback script. Receives MongDB native driver (to run the rollback) & callback method.

Never forget to invoke the callback after script completion. In case of any error , pass the error object to given callback.

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
        db.collection('testcollection').remove({ name: 'Hello-world' }, cb);
    }
}

```

#### Migration Object

Require the Migration constructor first & initialise it with configuration to get the Migration object. 
Migration object exposes an add api which takes an array of objects(containing path & mode information)
and the CI-CD build number(optional param). Path is nothing but the relative path to your migration script and mode is something that decides whether to run migration , rollback or set the migration record as expired. Mode can have only 3 values:
    * up - to run the migration step.
    * down - to run the roll back step.
    * expired - to set the migration record as expired. (toggling mode won't initiate the migration again once migration record has been marked as expired).

Its preferable to use mongo-cop in CI-CD pipeline itself, before even the code deployment step. Once your migration or rollback (whether passed/failed, status can be verified in migration report) is complete , it won't get executed again in successive builds unless you toggle the mode. Toggling mode will execute migration again (based on mode). Also it will reset the last mode status (to null) and set the current mode status (to success or failure). In case your migration script failed in last build, you can toggle the mode (up to down) to run the rollback script in next build. 

```

const Migration = require('mongo-cop').Migration;
const config = {
                host: 'localhost',
                db: 'mydbName',
                migrationCollection: 'migration'
            };
const buildNumber = 100; // optional param, may come from CI-CD buildNumber.
const migrationObj = new Migration(config);
migrationObj.add([
    { path: path.join(__dirname, 'path-to-migration-script'), mode: 'up' },
    { path: path.join(__dirname, 'path-to-migration-script'), mode: 'down' }], buildNumber);

```

#### Running migration

After providing all the necessary parameters to migration object using add api, simply run :

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

You can run the migration scripts in multiple databases at same time. Please check examples for further info.

### LICENSE
MIT