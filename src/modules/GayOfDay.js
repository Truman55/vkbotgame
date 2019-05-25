
const DataBase = require('./DataBase');
const sortBy = require('lodash.sortby');
const moment = require('moment');
moment.locale('ru');

class GayOfDay {
    /**
     * Игра GayOfDay 
     * @param {DataBase} db 
     */
    constructor (db) {
        this.db = db;
    }

    /**
     * Регистрирует пользователя в db
     * 
     * @param {number} userId 
     * @param {string} name 
     * @param {string} email 
     */
    userRegistration (userId, username, email) {
        const path = `users/${userId}`;
        this.db.set(path, { username, email });
    }

    /**
     * Проверка, существует ли группа
     *
     * @async
     * @param {number} id
     * @returns {boolean}
     */
    async isExistGroup (id) {
        const group = await this.db.get(`/groups/${id}`);
        return group !== null && group !== undefined && group.registered;
    }

    /**
     * Проверка, существует ли юзер
     *
     * @async
     * @param {number} groupId
     * @param {number}
     * @returns {boolean}
     */
    async isExistUser (groupId, userId) {
        const path = `/groups/${groupId}/users/${userId}`;
        const user = await this.db.get(path);
        return user !== null && user !== undefined;
    }

    /**
     * Регистрирует группу в базе данных
     * @param {number} id 
     */
    regGroup (id) {
        this.db.set(`/groups/${id}/registered`, true);
    }

    /**
     * Регистирует участника в базе данных
     * @param {{ userName: string, id: number, screenName: string, groupId: string }}
     */
    regUser ({ userName, id, screenName, groupId }) {
        const path = `/groups/${groupId}/users/${id}`;
        this.db.set(path, {
            userName,
            screenName,
            pidorCount: 0
        })
    }

    /**
     * Возращает данные последней игры
     *
     * @param {number} groupId 
     * @returns {Promise<any>}
     */
    async lastGame (groupId) {
        const path = `/groups/${groupId}/lastGame`;
        return await this.db.get(path);
    }

    /**
     * Возращает данные всех юзеров по id беседы
     *
     * @param {number} groupId
     * @returns {Promise<any>}
     */
    async getAllUsers (groupId) {
        const users = await this.db.get(`/groups/${groupId}/users`);

        return users || {};
    }

    /**
     * Получаем историю игр
     * @param {number} groupId
     *
     * @returns {Promise<any>}
     */
    async history (groupId) {
        return await this.db.get(`/groups/${groupId}/history`);
    }

    /**
     * Сохраняет результат игры в firebase
     *
     * @param {number} pidorCount 
     * @param {number} userID
     * @param {number} groupId
     * @param {string} winnerName
     */
    saveResult (pidorCount, userID, groupId, winnerName) {
        const date = Date.now();

        this.db.set(`/groups/${groupId}/history/${date}`, {
            winnerName,
            winnerId: userID
        });

        this.db.set(`/groups/${groupId}/lastGame`,{
            date,
            winner: winnerName
        });
    
        this.db.set(`/groups/${groupId}/users/${userID}/pidorCount`, pidorCount);
    }
    
    async getDataForFrontend (groupId) {
        const now = moment(Date.now()).utcOffset('+0300');
        const users = await this.getAllUsers(groupId);
        const lastGame = await this.lastGame(groupId);
        const lastGameDate = moment(lastGame.date).utcOffset('+0300');
        const timeToReset = moment(now).add(1, 'day').startOf('day');

        const data = Object.keys(users).map(key => {
            return users[key];
        })

        const standings = sortBy(data, 'pidorCount').reverse();
        return {
            standings,
            lastGameIsSame: lastGameDate.isSame(now, 'day'),
            lastGameDateText: `${lastGameDate.format('D MMMM')} в ${lastGameDate.format('HH:mm')}`,
            lastGameWinner: lastGame.winner,
            timeToReset: moment().to(timeToReset)
        }
    }

}

module.exports = GayOfDay;