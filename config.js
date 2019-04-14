require('dotenv').config();

const botConfig = {
    accessToken: process.env.VK_BOT_TOKEN,
    confirmation: process.env.VK_BOT_CONFIRM,
    secret: process.env.VK_BOT_SECRET
}

const fireBaseConfig = {
    apiKey: process.env.FIREBASE_TOKEN,
    authDomain: "vkbot-57994.firebaseapp.com",
    databaseURL: "https://vkbot-57994.firebaseio.com",
    projectId: "vkbot-57994",
    storageBucket: "vkbot-57994.appspot.com",
    messagingSenderId: "746788938985"
};

const ngrokApiKey = process.env.NGROK_API_KEY;

module.exports = { 
    botConfig,
    fireBaseConfig,
    ngrokApiKey
};