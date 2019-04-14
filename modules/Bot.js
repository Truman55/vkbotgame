const VKBot = require('node-vk-bot-api');

class Bot {
    /**
     * Конструктор создания бота
     *
     * @param {{ accessToken: string, confirmation: string, secret: string }} param0
     */
    constructor ({ accessToken, confirmation, secret }) {
        this.accessToken = accessToken;
        this.confirmation = confirmation;
        this.secret = secret;
        this.bot = null;
        this.init();
    }

    /**
     * Инициализация бота
     */
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

    /**
     * @returns {VKBot}
     */
    get context () {
        return this.bot;
    }
}

module.exports = Bot;