const App = require('./App');
const config = require('./config');


new App(config)
    .start()
    .then(() => {
        console.log("server running on port " + config.server.port + ".");
    });