const ngrok = require('ngrok');
const { ngrokApiKey } = require('./config');

const server = (async () => {
    return await ngrok.connect({
        addr: 8888,
        authtoken: ngrokApiKey
    });
});

module.exports = server;