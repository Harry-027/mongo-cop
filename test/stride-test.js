const expect = require('chai').expect;

describe('stride/stride', function () {
    const Stride = require('../src/stride/stride');
    it('should give a stride object based on the config details', function () {
        const stride = new Stride({ id: 1 });
        expect(stride).to.have.property('id', 1);
        expect(stride).to.have.property('migrationStatus', null);
        expect(stride).to.have.property('rollbackStatus', null);
        expect(stride).to.have.property('buildNumber', null);
    });
    it('should throw error in case id parameter is not provided', function () {
        expect(function () {
            new Stride()
        }).to.throw(Error);
    });
});
