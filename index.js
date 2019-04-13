const express = require('express');
const bodyParser = require('body-parser');
const { botConfig, fireBaseConfig } = require('./config');
const VkBotApp = require('./modules/App');
const Commands = require('./modules/Commands');
const DataBase = require('./modules/DataBase');

const firebase = require("firebase");

// init app
const app = express();
app.use(bodyParser());

const { accessToken, confirmation, secret } = botConfig;

const botReadyChecker = () => new Promise((resolve, reject) => {
    try {
        const bot = new VkBotApp({ accessToken, confirmation, secret });

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

botReadyChecker().then((bot) => {
    firebase.initializeApp(fireBaseConfig);

    const dataBase = new DataBase(firebase);
    const commands = new Commands(bot, dataBase, accessToken);
    app.post('/', bot.webhookCallback);
    app.listen(8888);
})

