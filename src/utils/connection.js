const assert = require('assert');
const MongoClient = require('mongodb').MongoClient;
/**
 * Class to create a connection with Mongo server 
 * as per the given configuration details
 */

class Connection {
    constructor(config) {
        if (config.mongoUri) {
            this.connectionUri = config.mongoUri;
        } else {
            assert.notEqual(config.host, null);
            this.host = config.host;
            this.db = config.db;
            this.user = config.user;
            this.password = config.password;
            this.replicaSet = config.replicaSet;
        }
    }

    connect() {
        return new Promise(async (res, rej) => {
            try {
                const uri = this.connectionUri || this.getConnectionUri();
                this.client = new MongoClient(uri, { useNewUrlParser: true });
                const connectionInstance = await this.client.connect();
                const db = connectionInstance.db(this.db);
                res(db);
            } catch (err) {
                console.error(`An error occurred while connecting to Mongo Server: ${err}`);
                rej(err);
            }
        });
    }

    close() {
        this.client.close();
    }

    getConnectionUri() {
        let uri = 'mongodb://';
        if (this.user) {
            uri += this.user;
            if (this.password) {
                uri += ':' + this.password;
            }
            uri += '@';
        }
        uri += this.host + '/';
        if (this.db) {
            uri += this.db;
        }
        if (this.replicaSet) {
            uri += '?replicaSet=' + this.replicaSet;
        }
        return uri;
    }
}

module.exports = Connection;