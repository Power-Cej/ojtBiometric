const http = require('http');

class HttpServer {
    constructor(port, callback) {
        this.port = port;
        this.callback = callback;
        this.server = http.createServer(this.callback);
    }

    start() {
        return new Promise(resolve => {
            this.server.listen(this.port, resolve);
        });
    }

    close() {
        return new Promise(resolve => {
            this.server.close(resolve);
        });
    }

    restart() {
        return this.close()
            .then(() => this.start());
    }

}

module.exports = HttpServer;
