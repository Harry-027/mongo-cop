const async = require('async');

module.exports = {
    id: 'serial-query',

    up : function(db, cb){
        async.series(
            [
                function(cb){db.collection('testcollection').insert({ name: 'Hello-world' }, cb)},
                function(cb){db.collection('testcollection').insert({ name: 'Test starts' }, cb)},
            ],
            cb
        );
    },

    down : function(db, cb){
        async.series(
            [
                function(cb){db.collection('testcollection').insert({ name: 'Hello-world' }, cb)},
                function(cb){db.collection('testcollection').insert({ name: 'Rollback starts' }, cb)},
            ],
            cb
        );
    }
}