const VKBot = require('node-vk-bot-api');

class App {
    constructor ({ accessToken, confirmation, secret }) {
        this.accessToken = accessToken;
        this.confirmation = confirmation;
        this.secret = secret;
        this.bot = null;
        this.init();
    }

    init () {
        if (!this.accessToken) {
            throw new Error('Access token must be provided');
        }

        this.bot = new VKBot({
            token: this.accessToken,
            confirmation: this.confirmation,
            secret: this.secret
        })

        console.log('🚀🚀🚀 APP IS READY 🚀🚀🚀');
    }

    get context () {
        return this.bot;
    }
}

module.exports = App;