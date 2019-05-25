const express = require('express');
const bodyParser = require('body-parser');

const server = require('./server');
const Bot = require('./modules/Bot');
const BotApi = require('./modules/BotApi');
const BotCommands = require('./modules/BotCommands');
const DataBase = require('./modules/DataBase');
const GayOfDay = require('./modules/GayOfDay');
const { botConfig } = require('./config');
const { accessToken, confirmation, secret } = botConfig;

let serverNgrok = '';

(async () => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('WE ARE RUNNING NOT PRODUCTION VERSION');
        return;
    }

    serverNgrok = await server();
})();

// init app
const app = express();
app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));

const botReadyChecker = () => new Promise((resolve, reject) => {
    try {
        const bot = new Bot({ accessToken, confirmation, secret });

        const waitingFor = setInterval(() => {
            const ctx = bot.context;
            if (ctx && serverNgrok) {
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
    const gayOfDay = new GayOfDay(db);

    const botCommands = new BotCommands(bot, db, accessToken, gayOfDay, serverNgrok);
    botCommands.init();

    app.post('/', (...args) => {
        const [req] = args;
        if (req.body.type && req.body.type === 'message_new') {
            console.log(req.body.object.text);
        }

        bot.webhookCallback(...args);
    });

    app.get('/', (req, res) => {
        if (req.query && 'group' in req.query) {
            res.sendFile(__dirname + '/index.html');
        } else {
            res.send('Error. Group id not found');
        }; 
    });

    app.post('/stats', async (req, res) => {

        if (req.body && req.body.groupID) {
            try {
                const groupID = req.body.groupID;
                const data = await BotApi.getConversationMembers(
                    botCommands.bot.api, 
                    { peer_id: groupID, access_token: accessToken, fields: 'photo_200, screen_name' }
                );

                const firebaseData = await gayOfDay.getDataForFrontend(groupID);
                const standings = firebaseData.standings.map(u => {
                    const [user] = data.filter(item => item.screen_name === u.screenName);

                    return {
                        ...u,
                        photo_200: user.photo_200
                    }
                });

                res.status(200).send({ ...firebaseData, standings });
            } catch (e) {
                console.log(e);
                res.status(500).send( { error: e })
            }
        } else {
            res.sendStatus(404);
        }
    })

    app.listen(8888);
};

try {
    appStart();
    console.log('APP READY...')
} catch (error) {
    console.log('APP START FAILED');
    console.log(error);
}
