require('dotenv').config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const prefix = IS_PRODUCTION ? '' : 'DEV_';

const botConfig = {
    accessToken: process.env[`${prefix}VK_BOT_TOKEN`],
    confirmation: process.env[`${prefix}VK_BOT_CONFIRM`],
    secret: process.env[`${prefix}VK_BOT_SECRET`]
}

const fireBaseConfig = {
    apiKey: process.env[`${prefix}FIREBASE_TOKEN`],
    authDomain: "vkbot-57994.firebaseapp.com",
    databaseURL: "https://vkbot-57994.firebaseio.com",
    projectId: "vkbot-57994",
    storageBucket: "vkbot-57994.appspot.com",
    messagingSenderId: "746788938985"
};

const ngrokApiKey = process.env[`${prefix}NGROK_API_KEY`];

module.exports = { 
    botConfig,
    fireBaseConfig,
    ngrokApiKey
};