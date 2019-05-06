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
    ALREADY_IN_GAME
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
     */
    constructor (bot, database, accessToken) {
        this.bot = bot;
        this.accessToken = accessToken;
        this.db = database;
        this.gayOfDay = new GayOfDay(this.db);
    }

    init () {
        // this.gameStartHandler();
        // this.userGameRegistration();
        // this.total();
        // this.searchPidor();

        // main handlers
        this._onHelp();
        this._onGayOfDayStart();
        this._onGetGayOfDayStandings();
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

            const profiles = await BotApi.getConversationMembers(ctx, {
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

    searchPidor () {
        this.on('/pidor', async (ctx) => {
            const groupId = this.groupID(ctx);

            const checkGroup = await this.database.checkGroup(groupId);
            const groupIsExist = checkGroup.val() && checkGroup.val().registered;

            if (!groupIsExist) {
                ctx.reply('Игра "Пидор дня" не запущена в данной беседе. Для запуска напишите /start')
                return;
            }

            const lastGame = await this.database.lastGame(groupId);
            
            if (lastGame && lastGame.val()) {
                const lastGameDate = moment(lastGame.val().date).utcOffset('+0300');
                const now = moment(Date.now()).utcOffset('+0300');

                if (lastGameDate.isSame(now, 'day')) {
                    const timeToReset = moment(now).add(1, 'day').startOf('day');
                    ctx.reply(`Прошлая игры была ${lastGameDate.format('D MMMM')} в ${lastGameDate.format('HH:mm')} (МСК)`);
                    ctx.reply(`Следующий раунд ${moment().to(timeToReset)}. Пидор дня в прошлой игре ${lastGame.val().winner}`)
                    return;
                }
            }

            const usersSnapshot = await this.database.getAllUsers(groupId);
            const users = usersSnapshot.val();

            const usersIds = Object.keys(users);
            const [pidorOfDayId] = shuffle(usersIds);

            const weekday = moment().weekday();
            const messagesArray = answers[weekday];
            const [todayMessage] = shuffle(messagesArray);

            let timeout = 0;
            todayMessage.forEach((msg) => {
                this.msg(ctx, msg, timeout+= 2000)
            });

            setTimeout(() => {
                const pidor = users[pidorOfDayId];
                this.database.saveResult(pidor.pidorCount + 1, pidorOfDayId, groupId, pidor.userName);
                ctx.reply(`ПИДОР ДНЯ: 🐔 🐔 ${pidor.userName} @${pidor.screenName} 🐔 🐔`);
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

const defMessage = [
    'Да как вы заебали со своими пидорами...',
    '📖 книгу бы лучше почитали...',
    '👓 👓 Я ТУТ ЧИТАЛ ОДНУ КНИГУ, И В НЕЙ БЫЛО НАПИСАНО 👓 👓'
]

const answers = {
    0: [
        [
            'Понедельник день тяжелый...Так что пидоров вокруг очень много',
            '👓 👓 ХОТЯ НУ КА НУ КА 👓 👓',
            '🕵️‍♂🕵️‍♂🕵️‍♂ МНЕ КАЖЕТСЯ Я ЧТО ТО ВИЖУ 🕵️‍♂🕵️‍♂🕵️‍♂',
            'АГА. ПОПАЛСЯ!'
        ]
    ],
    1: [
        [
            'Если к пиву добавить немного водки и хорошей компании, то даже вторник может превратиться в пятницу',
            'Только бы пидоров рядом не было...',
            '👓 👓 БЛЯЯЯЯ....Я ЧТО-ТО ВИЖУ 👓 👓'
        ]
    ],
    2: [
        [
            'Кто-то сказал, что среда - это маленькая пятница',
            'Но никто не сказал, кто же сегодня будет пидором дня',
            '🕵️‍♂🕵️‍♂🕵️‍♂ ПОЖАЛУЙ ВОЗЬМУ ЭТУ РОЛЬ НА СЕБЯ 🕵️‍♂🕵️‍♂🕵️‍♂',
        ]
    ],
    3: [
        [
            'Кого бы я не выбрал сегодня, знайте - один раз не пидорас. А вот если 2, я бы задумался',
            '🚀🚀 СТАРТУЕМ!!!',
            '👓 👓 ПЯТЬ СЕКУНД, ПОЛЕТ НОРМАЛЬНЫЙ 👓 👓'
        ]
    ],
    4: [
        [
            ...defMessage
        ]
    ],
    5: [
        [
            ...defMessage
        ]
    ],
    6: [
        [
            ...defMessage
        ]
    ]

}

module.exports = BotCommands;

