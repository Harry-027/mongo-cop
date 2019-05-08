const async = require('async');
const assert = require('assert');
const _ = require('lodash');
const Connection = require('./utils/connection');
const Strider = require('./stride').Strider;
const modeTypes = require('./utils/constants').mode;
const statuses = require('./utils/constants').statuses;

const _getDocs = Symbol('getDocs');
const _update = Symbol('update');
const _setSteps = Symbol('setSteps');
const _validator = Symbol('validator');
const _migratecb = Symbol('migratecb');
const _processor = Symbol('processor');
const _processSteps = Symbol('processSteps');
const _checkSumValidator = Symbol('checkSumValidator');
const _stepDecisionMaker = Symbol('stepDecisionMaker');
const _setConnection = Symbol('setConnection');

/**
 * Class to conduct the migration process.
 */

class Migration {
    constructor(config) {
        assert.notEqual(config.migrationCollection, null);
        this.db = null;
        this.config = config;
        this.up = [];
        this.down = [];
        this.steps = [];
        this.expired = [];
        this.migrationArray = [];
        this.collection = config.migrationCollection;
    }
    // public methods
    add(stepsList, buildNumber = null) {
        this.migrationArray = this.migrationArray.concat(stepsList);
        this.buildNumber = buildNumber;
    }

    async migrate(processedCB) {
        try {
            await this[_setConnection]();
            this[_setSteps]();
            await this[_validator]();
            this[_processSteps](processedCB);
        } catch (err) {
            console.error('An error occurred while migration', err);
            this[_migratecb](err, processedCB);
        }
    }

    async removeExpiredVersions() {
        try {
            await this[_setConnection]();
            let expDocs = await this[_getDocs](true);
            expDocs = expDocs.map((doc) => doc.id);
            if (expDocs.length) {
                await this.db.collection(this.collection).deleteMany({ id: { $in: expDocs } });
                this.driver.close();
                return `Expired docs removed from ${this.collection} collection successfully`;
            }
            this.driver.close();
            return `No expired docs in ${this.collection} collection`;
        } catch (err) {
            console.log('Error occurred while removing expired docs from migration collection', err);
            throw err;
        }
    }
    // private methods
    async [_setConnection]() {
        try {
            this.driver = new Connection(this.config);
            this.db = await this.driver.connect();
        } catch (err) {
            console.log('Error occurred while connecting with Mongo server', err);
            throw err;
        }
    }

    async [_getDocs](expired = false) {
        try {
            const docs = await this.db.collection(this.collection).find({ hasExpired: expired }).toArray();
            return docs;
        } catch (err) {
            console.log('Error occurred while fetching required docs', err);
            throw err;
        }
    }

    [_setSteps]() {
        this.migrationArray.forEach((obj) => {
            const stride = new Strider(obj).readNcrypt().getStride();
            stride.buildNumber = this.buildNumber;
            this[stride.mode].push(stride);
        });
    }

    async [_update](step, cb) {
        try {
            const { id, checksum, buildNumber, hasExpired, rollbackStatus, migrationStatus } = step;
            await this.db.collection(this.collection).updateOne({ id: step.id },
                {
                    $set: {
                        id, checksum, buildNumber, hasExpired, rollbackStatus, migrationStatus,
                        lastUpdated: new Date().toJSON().slice(0, 10).split('-').reverse().join('/')
                    }
                },
                { upsert: true });
            cb();
        } catch (err) {
            step.status = statuses.error;
            cb(`[" + step.id + "] failed to save the migration status: ${err}`);
        }
    }

    [_processor](step, cb) {
        if (step.mode === modeTypes.expired) {
            step.status = modeTypes.expired;
            step.hasExpired = true;
            this[_update](step, cb);
        } else if (step.mode === modeTypes.up || step.mode === modeTypes.down) {
            const modeType = step.mode === modeTypes.up ? statuses.migrationStatus : statuses.rollbackStatus;
            const otherModeType = step.mode === modeTypes.up ? statuses.rollbackStatus : statuses.migrationStatus;
            step[step.mode](this.db, (err) => {
                if (err) {
                    step.status = statuses.error;
                    step[modeType] = statuses.failed;
                } else {
                    step.status = statuses.success;
                    step[modeType] = statuses.success;
                    step[otherModeType] = null;
                }
                this[_update](step, cb);
            });
        }
    }

    [_processSteps](processedCB) {
        this.steps = [...this.up, ...this.down, ...this.expired];
        async.series(this.steps.map(step => {
            return (cb) => {
                this[_processor](step, cb);
            }
        }),
            (err) => {
                if (err) {
                    console.error('An error occurred while processing the step', err);
                    throw err;
                }
                this[_migratecb](null, processedCB);
            });
    }

    [_migratecb](err, processedCB) {
        let result = this.steps.map((step) => {
            return { id: step.id, status: step.status };
        });
        result = result.length === 0 ? 'Zero(0) Migration Files Processed...' : result;
        this.driver.close();
        processedCB(err, result);
    }

    [_checkSumValidator](doc, mode) {
        const step = _.filter(this[mode], (o) => o.id == doc.id)[0];
        if (step.checksum !== doc.checksum) {
            throw new Error(`Checksum validation failed for id ${doc.id}`);
        }
    }

    [_stepDecisionMaker](arr, doc) {
        arr.forEach((el) => {
            _.remove(el, (obj) => obj.id === doc.id);
        });
    }

    async[_validator]() {
        try {
            if (this.db) {
                this.steps = [...this.up, ...this.down, ...this.expired];
                const uniqueSteps = _.uniqBy(this.steps, 'id');
                if (uniqueSteps.length < this.steps.length) {
                    throw new Error('Cannot proceed further as Migration files containing duplicate Ids');
                }
                const activeMigrationDocs = await this[_getDocs]();
                const inactiveMigrationDocs = await this[_getDocs](true);
                activeMigrationDocs.forEach((doc) => {
                    const mode = doc.migrationStatus ? modeTypes.up : modeTypes.down;
                    if (this.config.validateChecksum) {
                        this[_checkSumValidator](doc, mode);
                    }
                    this[_stepDecisionMaker]([this[mode]], doc);
                });
                inactiveMigrationDocs.forEach((doc) => {
                    this[_stepDecisionMaker]([this.expired, this.up, this.down], doc);
                });
            }
        } catch (err) {
            console.error('An error occurred while steps validation', err);
            throw err;
        }
    }
}

module.exports = {
    Migration
};