const shuffle = require('lodash.shuffle');
const sortBy = require('lodash.sortby');
const moment = require('moment');
const DataBase = require('./DataBase');
const VKBot = require('node-vk-bot-api');
const text = require('../text/text');
moment.locale('ru');

/**
 * Команды бота
 * @class 
 */
class Commands {
    /**
     * @param {VKBot} bot 
     * @param {DataBase} database 
     * @param {string} accessToken 
     */
    constructor (bot, database, accessToken) {
        this.bot = bot;
        this.accessToken = accessToken;
        this.database = database;
        this.init();
    }

    init () {
        this.gameStartHandler();
        this.help();
        this.userGameRegistration();
        this.total();
        this.searchPidor();
        // on every message
        this.bot.on((ctx) => {
            console.log('MESSAGE ', ctx.message);
        })
    }
    
    /**
     * Устанавливает действия бота при определенной команде
     * @param {string} command
     * @param {Function} cb
     */
    setCommand (command, cb) {
        this.bot.command(command, async (ctx) => await cb(ctx));
    }

    /**
     * Запускает игру в беседе (регистрация)
     */
    gameStartHandler () {
        this.setCommand('/start', async (ctx) => {
            const groupId = this.groupID(ctx);
            const groupsSnapshot = await this.database.checkGroup(groupId);
            const groupIsExist = groupsSnapshot.val() && groupsSnapshot.val().registered;

            if (!groupIsExist) {
                this.database.regGroup(groupId);
                ctx.reply(text.groupRegistered);
                return;
            }

            ctx.reply(text.groupExist);
        })
    }

    /**
     * Строит таблицу лидеров
     */
    total () {
        this.setCommand('/pidorStats', async (ctx) => {
            const groupId = this.groupID(ctx);
            const usersSnapshot = await this.database.getAllUsers(groupId);

            const users = usersSnapshot.val();
            const data = Object.keys(users).map(key => {
                return users[key];
            })

            const sortedData = sortBy(data, 'pidorCount').reverse();
            let message = '';
            
            sortedData.forEach((item, index) => {
                if (index === 0) {
                    message += `
                        1⃣ ${item.userName} 👉 ${item.pidorCount}\n`;
                    return;
                }

                if (index === 1) {
                    message += `
                        2⃣ ${item.userName} 👉 ${item.pidorCount}\n`;
                    return;
                }

                if (index === 2) {
                    message += `
                        3⃣ ${item.userName} 👉 ${item.pidorCount}\n\n
                    ========================================\n`;
                    return;
                }

                message += `${index + 1}. ${item.userName} 👉 ${item.pidorCount}\n`;
            })

            ctx.reply('ТУРНИРНАЯ ТАБЛИЦА');
            ctx.reply(message);
        })
    }

    userGameRegistration () {
        this.setCommand('/pidorReg', async (ctx) => {
            const userId = ctx.message.from_id;
            const groupId = this.database(ctx);

            const snapshotGroup = await this.database.checkGroup(groupId);
            const groupIsExist = snapshotGroup.val() && snapshotGroup.val().registered;

            const snapshotUser = await this.database.checkUser(groupId, userId);
            const userIsExist = snapshotUser.val();

            if (userIsExist) {
                ctx.reply('Вы уже в игре!');
                return;
            }

            if (groupIsExist) {
                const { response: { profiles } } = await ctx.bot.api('messages.getConversationMembers', {
                    peer_id: groupId,
                    access_token: this.accessToken,
                    fields: 'screen_name'
                })

                const user = profiles.find(pr => pr.id === userId);

                if (!user) {
                    throw new Error('USER IS NOT EXIST!');
                }

                this.database.regUser({
                    groupId,
                    userName: `${user.first_name} ${user.last_name}`,
                    id: userId,
                    screenName: user.screen_name
                })

                ctx.reply(`💪 Игрок ${user.first_name} ${user.last_name} aka @${user.screen_name} успешно зарегистрировался в игре "ПИДОР ДНЯ" 💪`)
            }
        })
    }

    help () {
        this.setCommand('/help', async (ctx) => {
            const message = `
                👨‍❤️‍💋‍👨 Команды игры "Пидор дня" 👨‍❤️‍💋‍👨
                
                /help - помощь
                /pidor - запустить новый раунд или узнать победителя прошлого
                /pidorstats - турнирная таблица
                /pidorreg - регистрация в игре
                /start - активировать игру в беседе

                По всем вопросам обращайтесь к https://vk.com/g.truman
            `;
            ctx.reply(message);
        })
    }

    searchPidor () {
        this.setCommand('/pidor', async (ctx) => {
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

module.exports = Commands;

