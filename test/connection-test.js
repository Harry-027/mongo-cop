const expect = require('chai').expect;

describe('utils/connection', function () {
    const MongoConn = require('../src/utils/connection');

    describe('MongoConnection', function () {

        describe('#constructor(options)', function () {
            it('requires options.mongoUri or options.host', function () {
                expect(function () {
                    new MongoConn()
                }).to.throw(Error);
                expect(function () {
                    new MongoConn({mongoUri: 'Mongo Uri//'})
                }).not.to.throw(Error);
                expect(function () {
                    new MongoConn({host: 'host'})
                }).not.to.throw(Error);
            });
            it('has additional opts: db, user, password, replicaSet', function () {
                const connUtil = new MongoConn({
                    host: 'localhost', db:'test', user: 'world'});
                expect(connUtil).to.have.property('host', 'localhost')
                expect(connUtil).to.have.property('db','test')
                expect(connUtil).to.have.property('user','world')
            });
        })

        describe('#getConnectionUri()', function () {
            it('pass give the mongo uri', function () {
                const uri = new MongoConn({host: 'localhost'}).getConnectionUri();
                expect(uri).to.equal('mongodb://localhost/');
            });
            it('builds connectionUri from given uri', function () {
                const conn = new MongoConn({
                    mongoUri: '1'
                });
                expect(conn.connectionUri).to.equal('1');
            });
        });
    });
});
