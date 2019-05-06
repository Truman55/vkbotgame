const express = require('express');
const firebase = require("firebase");
const bodyParser = require('body-parser');

const server = require('./server');
const Bot = require('./modules/Bot');
const Commands = require('./modules/Commands');
const DataBase = require('./modules/DataBase');
const { botConfig, fireBaseConfig } = require('./config');
const { accessToken, confirmation, secret } = botConfig;


(async () => {
    const serverUrl = await server();
    console.log(serverUrl);
})();

// init app
const app = express();
app.use(bodyParser());

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
    firebase.initializeApp(fireBaseConfig);

    const db = new DataBase(firebase);
    new Commands(bot, db, accessToken);
    app.post('/', bot.webhookCallback);
    app.listen(8888);
};

appStart();
