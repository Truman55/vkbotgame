const express = require('express');
const bodyParser = require('body-parser');

const server = require('./server');
const Bot = require('./modules/Bot');
const BotCommands = require('./modules/BotCommands');
const DataBase = require('./modules/DataBase');
const { botConfig } = require('./config');
const { accessToken, confirmation, secret } = botConfig;

(async () => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('WE ARE RUNNING NOT PRODUCTION VERSION');
        return;
    }

    await server();
})();

// init app
const app = express();
app.use(bodyParser.json());

const botReadyChecker = () => new Promise((resolve, reject) => {
    try {
        const bot = new Bot({ accessToken, confirmation, secret });

        const waitingFor = setInterval(() => {
            const ctx = bot.context;
            if (ctx) {
                clearInterval(waitingFor);
                resolve(ctx);
            }
        }, 100);
    } catch (err) {
        reject(err);
    }
})

const appStart = async () => {
    const bot = await botReadyChecker();
    const db = new DataBase();

    const botCommands = new BotCommands(bot, db, accessToken);
    botCommands.init();

    app.post('/', (...args) => {
        const [req] = args;
        if (req.body.type && req.body.type === 'message_new') {
            console.log(req.body.object.text);
        }

        bot.webhookCallback(...args);
    });
    app.listen(8888);
};

try {
    appStart();
} catch (error) {
    console.log('APP START FAILED');
    console.log(error);
}
