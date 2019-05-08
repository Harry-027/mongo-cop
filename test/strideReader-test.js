const expect = require('chai').expect;
const path = require('path');

describe('stride/strideReader', function () {
    const Strider = require('../src/stride/strideReader');
    it('should give a stride object based on the config details', function () {
        const stride = new Strider({ path: 1, mode: 'up' });
        expect(stride).to.have.property('path', 1);
        expect(stride).to.have.property('mode', 'up');
        expect(stride).to.have.property('content', null);
        expect(stride).to.have.property('checksum', null);
    });
    it('should throw error in case path & mode parameter are not provided', function () {
        expect(function () {
            new Strider()
        }).to.throw(Error);
    });
    it('should generate checksum & return back the stride object', function () {
        const stride = new Strider({ path: path.join(__dirname, 'strideReader-test.js'), mode: 'up' }).readNcrypt();
        expect(stride.checksum).not.eql(null);
    });
    it('should throw error in case id is not found in file content', function () {
        expect(function () { new Strider({ path: path.join(__dirname, 'strideReader-test.js'), mode: 'expired' }).getStride() })
            .to.throw(Error);
    });
});
