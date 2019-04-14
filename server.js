const ngrok = require('ngrok');
const { ngrokApiKey } = require('./config');


(async () => {
    const url = await ngrok.connect({
        addr: 8888,
        authtoken: ngrokApiKey
    });

    console.log(url);
})();