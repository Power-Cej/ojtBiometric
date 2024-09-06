const http = require('http');
const https = require('https');
const {URL} = require('url');

// Client map to handle different protocols
const clients = {
    'http:': http,
    'https:': https,
};

/**
 * HTTPResponse class
 * Wraps the http response and provides additional methods
 */
class HTTPResponse {
    /**
     * Creates a new HTTPResponse instance.
     *
     * @param {http.IncomingMessage} response - The http.IncomingMessage instance.
     * @param {Buffer} body - The response body.
     */
    constructor(response, body) {
        this.status = response.statusCode;
        this.headers = response.headers || {};
        this.body = body;
        this.ok = this.status >= 200 && this.status < 300;
    }

    /**
     * Converts the response body to a string.
     *
     * @returns {string} The response body as a string.
     */
    get text() {
        if (Buffer.isBuffer(this.body)) {
            return this.body.toString();
        }
    }

    /**
     * Converts the response body to a JSON object.
     *
     * @returns {Object|string} The response body as a JSON object or as a string if parsing fails.
     */
    get json() {
        if (Buffer.isBuffer(this.body)) {
            const text = this.body.toString();
            try {
                return JSON.parse(text);
            } catch (e) {
                return text;
            }
        }
    }
}

/**
 * Callback for handling the http response.
 *
 * @param {Function} resolve - The resolve function from the Promise.
 * @param {Function} reject - The reject function from the Promise.
 * @returns {Function} The callback function.
 */
function callback(resolve, reject) {
    return function (res) {
        const chunks = [];
        res.on('data', chunk => {
            chunks.push(chunk);
        });
        res.on('end', () => {
            const body = Buffer.concat(chunks);
            const response = new HTTPResponse(res, body);
            if (response.ok) {
                resolve(response);
            } else {
                reject(response);
            }
        });
        res.on('error', error => {
            reject(error);
        });
    };
}

/**
 * Makes an http request to a specified host.
 *
 * @param {string} host - The host url.
 * @param {Object} options - The request options.
 * @returns {Promise<HTTPResponse>} The promise that resolves to a HTTPResponse instance.
 */
function request(host, options = {}) {
    const url = new URL(host);
    const client = clients[url.protocol];

    if (!client) {
        throw new Error(`Protocol not supported: ${url.protocol}`);
    }

    options.headers = {
        'User-Agent': 'Node client',
        ...options.headers
    };

    // set Content-Length if there's a body
    if (options.body) {
        options.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    options.timeout = options.timeout || 10000;// 10second

    return new Promise((resolve, reject) => {
        const req = client.request(url, options, callback(resolve, reject));
        options.body && req.write(options.body);
        req.on('error', error => {
            reject(error);
        });
        req.end();
    });
}

module.exports = request;
