const express = require('express');
const HttpServer = require('./HttpServer');
const router = require('./router');

/**
 * an express app
 */
class App {
    constructor(options) {
        // init express
        this.express = express();
        this.express.disable('x-powered-by');
        this.options = options;
        this.express.use(router);
    }

    async startHttpServer() {
        try {
            this.httpServer = new HttpServer(this.options.server.port, this.express);
            await this.httpServer.start();
            console.log('REST server running...');
        } catch (error) {
            console.error('Failed to start HTTP server:', error);
            throw error; // Rethrow or handle the error as needed
        }
    }

    async start() {
        try {
            await this.startHttpServer();
        } catch (error) {
            console.error('Failed to start the server:', error);
            process.exit(1);
        }
    }

}

module.exports = App;
