const firebase = require("firebase");
const { fireBaseConfig } = require('../config');


class DataBase {
    constructor () {
        firebase.initializeApp(fireBaseConfig);
        this.db = firebase;
    }

    get database () {
        return this.db.database();
    }

    /**
     * Записывает данные
     * 
     * @param {string} path
     * @param {Object} data
     * 
     */
    set (path, data) {
        try {
            this.database.ref(path).set(data);
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * Получает данные из базы
     * @param {string} path 
     */
    async get (path) {
        try {
            const dataSnapshot = await this.database.ref(path).once('value');
            return dataSnapshot.val();
        } catch (error) {
            console.log(error);
        }
    }
}

module.exports = DataBase;