const ngrok = require('ngrok');
const { ngrokApiKey } = require('./config');

const server = (async () => {
    return await ngrok.connect({
        addr: 8888,
        authtoken: ngrokApiKey
    });
});

if (process.env.NODE_ENV !== 'production') {
    (async () => {
        try {
            await server();
        } catch (e) {
            console.log(e);
        }
    })();
}

module.exports = server;