class DataBase {
    constructor (firebase) {
        this.firebase = firebase;
    }

    userRegistration (userId, name, email) {
        this.database.ref('users/' + userId).set({
            username: name,
            email: email
        });
    }

    get database () {
        return this.firebase.database();
    }

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

    saveResult (pidorCount, userID, groupId, winnerName) {
        this.database.ref(`/groups/${groupId}/lastGame`).set({
            date: Date.now(),
            winner: winnerName
        });
        this.database.ref(`/groups/${groupId}/users/${userID}/pidorCount`).set(pidorCount);
    }

    async lastGame (groupId) {
        return await this.database.ref(`/groups/${groupId}/lastGame`).once('value');
    }

    async getAllUsers (groupId) {
        return await this.database.ref(`/groups/${groupId}/users`).once('value');
    }
}

module.exports = DataBase;