const expect = require('chai').expect;

describe('src/index', function () {
    const { Migration } = require('../src/index');
    const migration = new Migration({ migrationCollection: 'migration' });
    it('should throw error in case Migration collection is not provided', function () {
        expect(function () { new Migration({}) }).to.throw(Error);
    });
    it('should should assert the given properties', function () {
        expect(migration).to.have.property('collection', 'migration');
        expect(migration).to.have.property('db', null);
        expect(migration).to.have.property('down');
        expect(migration).to.have.property('expired');
    });
    it('should set the migrationArray and build number', function () {
        migration.add([1,2,3],10);
        expect(migration.migrationArray).to.eql([1,2,3]);
        expect(migration.buildNumber).to.eq(10);
    });
});
