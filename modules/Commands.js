const shuffle = require('lodash.shuffle');
const groupBy = require('lodash.groupby');
const sortBy = require('lodash.sortby');
const moment = require('moment');
moment.locale('ru');

class Commands {
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

    gameStartHandler () {
        const self = this;
        this.bot.command('/start', (ctx) => {
            const groupId = ctx.message.peer_id;

            this.database.checkGroup(groupId).then((snapshot) => {
                const groupIsExist = snapshot.val() && snapshot.val().registered;

                if (groupIsExist) {
                    ctx.reply('Беседа уже в игре! Для регистрации в ежедневном определении пидора напиши /pidorReg');
                    return;
                }

                self.database.regGroup(groupId);
                ctx.reply('☠☠☠ Игра "Пидор дня" запущена ☠☠☠');
            });;
        })
    }

    total () {
        this.bot.command('/pidorStats', async (ctx) => {
            const groupId = ctx.message.peer_id;
            const usersSnapshot = await this.database.getAllUsers(groupId);
            const users = usersSnapshot.val();

            const data = Object.keys(users).map(key => {
                return users[key];
            })

            const sortedData = sortBy(data, 'pidorCount').reverse();
            let message = '';
            
            sortedData.forEach((item, index) => {
                message += `${index + 1}. ${item.userName} ❤ ${item.pidorCount} ❤\n`;
            })

            ctx.reply('ТУРНИРНАЯ ТАБЛИЦА');
            ctx.reply(message);
        })
    }

    userGameRegistration () {
        this.bot.command('/pidorReg', async (ctx) => {
            const userId = ctx.message.from_id;
            const groupId = ctx.message.peer_id;

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
        this.bot.command('/help', async (ctx) => {
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
        this.bot.command('/pidor', async (ctx) => {
            const groupId = ctx.message.peer_id;

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

            ctx.reply('🚑 🚑 🚑 АКТИВИРОВАН ПОИСК ПИДОРА 🚑 🚑 🚑');

            setTimeout(() => {
                ctx.reply('👓 👓ИЩЕМ ПИДОРА 👓 👓')
            }, 2000);

            setTimeout(() => {
                ctx.reply('🕵️‍♂🕵️‍♂🕵️‍♂ ПИДОР ТЫ ГДЕ??? 🕵️‍♂🕵️‍♂🕵️‍♂');
            }, 4000);

            setTimeout(() => {
                const pidor = users[pidorOfDayId];
                this.database.saveResult(pidor.pidorCount + 1, pidorOfDayId, groupId, pidor.userName);
                ctx.reply(`ПИДОР ДНЯ: 🐔 🐔 ${pidor.userName} @${pidor.screenName} 🐔 🐔`);
            }, 6000);
        })
    }
}

module.exports = Commands;