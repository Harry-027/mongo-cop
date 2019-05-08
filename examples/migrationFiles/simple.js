module.exports = {
    id: 'simple-query',

    up : function(db, cb){
        db.collection('testcollection').insert({ name: 'Hello' }, cb);
    },

    down : function(db, cb){
        db.collection('testcollection').remove({ name: 'world' }, cb);
    }
}