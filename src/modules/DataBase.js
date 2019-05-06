class DataBase {
    constructor (firebase) {
        this.firebase = firebase;
    }

    get database () {
        return this.firebase.database();
    }

    /**
     * Регистрирует пользователя в db
     * 
     * @param {number} userId 
     * @param {string} name 
     * @param {string} email 
     */
    userRegistration (userId, name, email) {
        this.database.ref('users/' + userId).set({
            username: name,
            email: email
        });
    }

    /**
     * Проверка, существует ли группа
     *
     * @async
     * @param {number} id
     * @returns {boolean}
     */
    async checkGroup (id) {
        return await this.database.ref('/groups/' + id).once('value');
    }

    async checkUser (groupId, userId) {
        return await this.database.ref(`/groups/${groupId}/users/${userId}`).once('value');
    }

    regGroup (id) {
        this.database.ref('/groups/' + id).set({ registered: true });
    }

    regUser ({ userName, id, screenName, groupId, pidorCount = 0 }) {
        this.database.ref(`/groups/${groupId}/users/${id}`).set({
            userName,
            screenName,
            pidorCount
        })
    }

    /**
     * Сохраняет результат игры в firebase
     * @param {number} pidorCount 
     * @param {number} userID
     * @param {number} groupId
     * @param {string} winnerName
     */
    saveResult (pidorCount, userID, groupId, winnerName) {
        const date = Date.now()
        this.database.ref(`/groups/${groupId}/history/${date}`).set({
            winnerName,
            winnerId: userID
        })
        this.database.ref(`/groups/${groupId}/lastGame`).set({
            date,
            winner: winnerName
        });
        this.database.ref(`/groups/${groupId}/users/${userID}/pidorCount`).set(pidorCount);
    }

    /**
     * Возращает данные последней игры
     * 
     * @param {number} groupId 
     */
    async lastGame (groupId) {
        return await this.database.ref(`/groups/${groupId}/lastGame`).once('value');
    }

    /**
     * Возращает данные всех юзеров по id беседы
     * 
     * @param {number} groupId 
     */
    async getAllUsers (groupId) {
        return await this.database.ref(`/groups/${groupId}/users`).once('value');
    }

    /**
     * Получаем историю игр 
     * @param {number} groupId 
     */
    async getHistory (groupId) {
        return await this.database.ref(`/groups/${groupId}/history`).once('value');
    }
}

module.exports = DataBase;