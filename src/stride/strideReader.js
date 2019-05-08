const fs = require('fs');
const crypto = require('crypto')
const assert = require('assert');
const merge = require('lodash/merge');
const Stride = require('./stride');
const modeTypes = require('../utils/constants').mode;

/**
 * Class to read the config details, encrypt the migration file content
 * and initialize the stride object
 */

class Strider {
    constructor(data) {
        assert.notEqual(data.path, null);
        assert.notEqual(-1, ['up', 'down', 'expired'].indexOf(data.mode));
        this.path = data.path;
        this.mode = data.mode;
        this.content = null;
        this.checksum = null;
        this.key = 'mongo-cop';
        this.encoding = 'utf8';
        this.algo = 'sha1';
        this.digest = 'hex';
    }

    readNcrypt() {
        this.content = fs.readFileSync(this.path, { encoding: this.encoding });
        this.checksum = crypto.createHmac(this.algo, this.key).update(this.content).digest(this.digest);
        return this;
    }

    getStride() {
        const obj = require(this.path);
        if(this.mode == modeTypes.up || this.mode === modeTypes.down) {
            assert.notEqual(obj[this.mode], null);
        }
        return new Stride(merge(obj, { checksum: this.checksum, mode: this.mode }));
    }
}

module.exports = Strider;
