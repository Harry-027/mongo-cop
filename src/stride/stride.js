const assert = require('assert');
const statuses = require('../utils/constants').statuses;

/**
 * class to initialize the stride object as per the given details.
 */

class Stride {
    constructor(obj) {
        assert.notEqual(obj.id, null);
        this.id = obj.id;
        this.up = obj.up;
        this.down = obj.down;
        this.mode = obj.mode;
        this.checksum = obj.checksum;
        this.status = statuses.notRun;
        this.migrationStatus = null;
        this.rollbackStatus = null;
        this.buildNumber = null;
        this.hasExpired = false;
    }
}

module.exports = Stride;