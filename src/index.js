const App = require('./App');

let options = {
    applicationId: "09e363f1-3d97-459d-9877-f790785baf7e",
    server: {
        port: 8081,
    },
    endpoint: "api.innque.com/v1"
}

new App(options)
    .start()
    .then(() => {
        console.log("server running on port " + options.server.port + ".");
    });