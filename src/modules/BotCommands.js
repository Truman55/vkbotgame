const VKBot = require('node-vk-bot-api');
const shuffle = require('lodash.shuffle');
const sortBy = require('lodash.sortby');
const moment = require('moment');
moment.locale('ru');

const DataBase = require('./DataBase');
const GayOfDay = require('./GayOfDay');
const BotApi = require('./BotApi');
const { 
    HELP_TEXT, 
    GROUP_EXIST, 
    GROUP_REGISTERED,
    NO_REGISTERED_USERS,
    ALREADY_IN_GAME,
    GAME_NOT_STARTED,
    ANSWERS
} = require('../text/main');


/**
 * Команды бота
 * @class 
 */
class BotCommands {
    /**
     * @param {VKBot} bot 
     * @param {DataBase} database 
     * @param {string} accessToken
     * @param {GayOfDay} gayOfDay
     */
    constructor (bot, database, accessToken, gayOfDay, server) {
        this.bot = bot;
        this.accessToken = accessToken;
        this.db = database;
        this.gayOfDay = gayOfDay;
        this.server = server;
    }

    init () {
        // main handlers
        this._onHelp();
        this._onGayOfDayStart();
        this._onGetGayOfDayStandings();
        this._onSearchPidor();
        this._onGayOfDayRegisterUser();
        this.bot.on((ctx) => {
            ctx.reply(JSON.stringify(ctx.message).replace(/,/g, '\n'));
        });
    }
    
    /**
     * Устанавливает действия бота при определенной команде
     * @param {string} command
     * @param {Function} cb
     */
    on (command, cb) {
        this.bot.command(command, async (ctx) => await cb(ctx));
    }

    /**
     * Запускает игру в беседе (регистрация)
     */
    _onGayOfDayStart () {
        this.on('/gayofday', (async (ctx) => {
            const { message: { peer_id: groupId }} = ctx;
            const isExistGroup = await this.gayOfDay.isExistGroup(groupId);

            if (!isExistGroup) {
                this.gayOfDay.regGroup(groupId);
                ctx.reply(GROUP_REGISTERED);
                return;
            }

            ctx.reply(GROUP_EXIST);
        }));
    }

    /**
     * Строит таблицу лидеров
     */
    _onGetGayOfDayStandings () {
        this.on('/pidorstats', async (ctx) => {
            const { message: { peer_id: groupId }} = ctx;
            const users = await this.gayOfDay.getAllUsers(groupId);
            
            const data = Object.keys(users).map(key => {
                return users[key];
            })

            if (!data.length) {
                ctx.reply(NO_REGISTERED_USERS);
                return;
            }

            const sortedData = sortBy(data, 'pidorCount').reverse();
            let message = '';
            
            sortedData.forEach((item, index) => {
                if (index === 0) {
                    message += `1⃣ ${item.userName} 👉 ${item.pidorCount}\n`;
                    return;
                }

                if (index === 1) {
                    message += `2⃣ ${item.userName} 👉 ${item.pidorCount}\n`;
                    return;
                }

                if (index === 2) {
                    message += `3⃣ ${item.userName} 👉 ${item.pidorCount}\n`;
                    return;
                }

                message += `${index + 1}. ${item.userName} 👉 ${item.pidorCount}\n`;
            })

            ctx.reply('ТУРНИРНАЯ ТАБЛИЦА');
            ctx.reply(message);
            ctx.reply(`Смотреть подробнее: ${this.server}/?group=${groupId}`);
        })
    }
    

    /**
     * Регистрирует пользователя в игре
     */
    _onGayOfDayRegisterUser () {
        this.on('/pidorreg', async (ctx) => {
            const { message: { from_id: userId, peer_id: groupId }} = ctx;
            const isExistGroup = await this.gayOfDay.isExistGroup(groupId);
            const isExistUser = await this.gayOfDay.isExistUser(groupId, userId);

            if (isExistUser) {
                ctx.reply(ALREADY_IN_GAME);
                return;
            }

            if (!isExistGroup) {
                throw new Error('GROUP DOES NOT EXIST!');
            }

            const profiles = await BotApi.getConversationMembers(ctx.bot.api, {
                peer_id: groupId,
                access_token: this.accessToken
            });

            const user = profiles.find(pr => pr.id === userId);
            if (!user) {
                throw new Error('USER IS NOT EXIST!');
            }

            this.gayOfDay.regUser({
                id: userId,
                groupId,
                userName: `${user.first_name} ${user.last_name}`,
                screenName: user.screen_name
            })

            ctx.reply(`💪 Игрок ${user.first_name} ${user.last_name} aka @${user.screen_name} успешно зарегистрировался в игре "ПИДОР ДНЯ" 💪`)
        })
    }

    /**
     * Выводит справку о боте
     */
    _onHelp () {
        this.on('/help', async (ctx) => {
            ctx.reply(HELP_TEXT);
        })
    }

    /**
     * Поиск победителя
     * 
     */
    _onSearchPidor () {
        this.on('/pidor', async (ctx) => {
            const groupId = this.groupID(ctx);
            

            const isExistGroup = await this.gayOfDay.isExistGroup(groupId);

            if (!isExistGroup) {
                ctx.reply(GAME_NOT_STARTED)
                return;
            }

            const lastGame = await this.gayOfDay.lastGame(groupId);
            
            if (lastGame) {
                const lastGameDate = moment(lastGame.date).utcOffset('+0300');
                const now = moment(Date.now()).utcOffset('+0300');

                if (lastGameDate.isSame(now, 'day')) {
                    const timeToReset = moment(now).add(1, 'day').startOf('day');
                    ctx.reply(`📢 [Пидор дня]: Прошлая игры была ${lastGameDate.format('D MMMM')} в ${lastGameDate.format('HH:mm')} (МСК)`);
                    ctx.reply(`📢 [Пидор дня]: Следующий раунд ${moment().to(timeToReset)}. Пидор дня в прошлой игре ${lastGame.winner}`);
                    return;
                }
            }

            const users = await this.gayOfDay.getAllUsers(groupId);

            const usersIds = Object.keys(users);
            const [pidorOfDayId] = shuffle(usersIds);

            const weekday = moment().weekday();
            const messagesArray = ANSWERS[weekday];
            const [todayMessage] = shuffle(messagesArray);

            let timeout = 0;
            todayMessage.forEach((msg) => {
                this.msg(ctx, msg, timeout+= 2000)
            });

            setTimeout(() => {
                const pidor = users[pidorOfDayId];

                const pidorCount = pidor.pidorCount + 1;
                const winnerName = pidor.userName;

                this.gayOfDay.saveResult(pidorCount, pidorOfDayId, groupId, winnerName);

                ctx.reply(`📢 [Пидор дня]: 🐔 🐔 ${pidor.userName} @${pidor.screenName} 🐔 🐔`);
            }, timeout+= 2000);
        })
    }

    msg (ctx, msg, timeout) {
        setTimeout(() => {
            ctx.reply(msg)
        }, timeout);
    }

    groupID (ctx) {
        return ctx.message.peer_id;
    }
}

module.exports = BotCommands;

