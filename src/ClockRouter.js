const queryToJson = require('./queryToJson');
const PromiseRouter = require('./PromiseRouter');
const parsePayload = require('./parsePayload');
// UseCases
const HandShakeUseCase = require('./HandShakeUseCase');
const AttendanceUseCase = require('./AttendanceUseCase');
const RegisterEmployeeUseCase = require('./RegisterEmployeeUseCase');
let upload = true;

class FunctionsRouter extends PromiseRouter {
    constructor() {
        super();
        this.route('GET', '/iclock/cdata', this.handleHandshake.bind(this));
        this.route('POST', '/iclock/cdata', this.handleUpload.bind(this));
        this.route('GET', '/iclock/getrequest', this.handleRequest.bind(this));
    }

    handleHandshake(req) {
        const query = queryToJson(req.query);
        const handshake = new HandShakeUseCase();
        return handshake.execute(query);
    }

    handleUpload(req) {
        const query = queryToJson(req.query);
        const lines = req.body.split(/\r?\n/)// Split the data by new lines
            .reduce((acc, cur) => {
                if (cur.trim() !== '') {
                    acc.push(cur.split('\t'));
                }
                return acc;
            }, []);

        const attendance = new AttendanceUseCase();
        console.log('received device upload');
        console.log('query', query);
        console.log('body', req.body);
        console.log('lines', lines);
        switch (query.table) {
            case 'ATTLOG':
                return attendance.execute(query, lines);
            case 'OPERLOG':
                const payloads = parsePayload(lines);
                console.log('Payloads:', payloads);
                if (payloads.length === 0) {
                    return this.handleOperationLog(lines);
                } else {
                    return this.handleOperationUpload(payloads);
                }
            default:
                return Promise.resolve('OK');

        }

    }

    handleOperationUpload(payloads) {
        const register = new RegisterEmployeeUseCase();
        return register.execute(payloads);
    }

    handleOperationLog(lines) {
        lines.forEach(line => {
            const [type] = line;
            switch (type) {
                case 'OPLOG 4':// Access Menu
                case 'OPLOG 9':// Delete User
                case 'OPLOG 30':// Initialize new user
                default:
            }
        });
        return Promise.resolve('OK');
    }

    handleRequest(req) {
        const query = queryToJson(req.query);
        const data =
            {
                'FP PIN': '3',
                FID: '6',
                Size: '1636',
                Valid: '1',
                TMP: 'SpFTUzIxAAAD0tIECAUHCc7QAADr0nEBAAAAg38dQNIzAPkPigD8AIvdmQBFAAwPfwBE0owPPQBcALEPsdJ5AIwPpQBIABHdeACdAH4P2gDH0ucPRgDSAKUPHdLVAFUPYQAeAFzdeADiAF4PBADl0qEPmgD0AE0PVtL+AEUPegDOATDdIAAUAUoPWQAd068PNgAhAfsP1tIkAUoPtQD9AWHdVABDASoPBQBE02EPZwBJAeMOe9JMARMPWQCYASjcOgBjASoO7gBm0zQOzoePc1bvFq8G/X+TEYW/gaBQd4E7AYMFF3/8PS77TX6/AWaCRljilDuH92yWI+wl3JCqiquL6AOh3LN+7XAq9q4PLtCwA3IerQL/2mH8VxoXWzv3Sy5hhO/qCupKFl4I2SBjhjauTQ7uBvQl901qfpIrHPYgKmYUoumO7nqeRtfDtQoZZQVUA2HLyAH6Gse2oBTqL7T++eza6T/pMtQQA84A0fSXADHQSAxHDDMOuM992SE6AQJUHQcEA1kAAzAKAG3NBsIt/kBTDQBOy/3/v0b+wMDCBMXBFt4rAwBDGXAGCgOUL+39/UHCgxAD+zDtwML8KID//S16BQBHNf0EMgnSlUOJcHhbwgCfmxFKOAQAvo8T/C0HACBT+lY6CwO+SwP//ljA+gQD61h9nQ8AQZn0LCxFOMH//gTFOWOjaw0AsHSQr4SGog8ArnqJ/7HCwbB1BAC2ehaPBwN7igwzPQ4AZIyPE3B1/4PBBsWoksE8/xMACJ0iRD0tNFvA/TsIxXSeUoHBexQAIwHpwuFV/v7/QUGJFQPQxNf+//84hTY7LMFLAwAbx6XCFdIGzd5H//46ODHq/kDACwBKCus2/P87HAAi0SLAPxI6/zX+/sA6/sMswf///sD9OgkDkNBpklvCBMUa1o5+BgBF1mAEiwXSIdhXwcBpyABmCvH+/f4o/Tr9/i0GAF3aacNGwg7SXt9gw2yDBW0K0nTjZMPDxKvCE9Kb8JrDycMBko0WxcXDGQCWMI/FGsXCwsLDxA3EwRbDw8LCwsIBw8ARwgoAnfgpOP3+Kfn5/P8FEJQBTxCXAxCIASI4BhOFA0BswQMQQgM0EQUQHRZPiM0QIMVHZ8HD/gnVnxllwsTMzMKq3hDW8sHBwsF6iAeGb77D/3DBBRD2JUASlAYQOSU6osILwtAoTMD//+IHEwUpQ/8x/gbVtj+I/h0FEFRG8sV62xG+S1wu/D4pB8JnTTDDwiXVeFLyxcTFwojBBMPCEJKCwsLBwVbCwhPAZ8JvUkLFC0DTAQALRVIA'
            }


        console.log('Received request from device:', query);

        const cmdId = 123;  // Incremental command ID for tracking
        const userId = 2;  // User PIN for which the fingerprint needs to be enrolled
        const fingerId = 6;  // Fingerprint ID (e.g., thumb, index finger, etc.)
        const retry = 3;  // Number of retry attempts
        const overwrite = 1;  // Whether to overwrite an existing fingerprint
        const tmpData = data.TMP;  // Your fingerprint template data in base64 format

        // const command = `C:${cmdId}:ENROLL_FP PIN=${userId}\tFID=${fingerId}\tRETRY=${retry}\tOVERWRITE=${overwrite}\tTMP=${tmpData}`;

        const tab = '\t';
        // const command = `C:1:DATA USER PIN=2`;
        // const command = `C:1:DATA UPDATE USERINFO PIN=2${tab}Name=John Doe${tab}Passwd=1234${tab}TMP=${tmpData}`;
        // const command = `C:2:ENROLL_FP PIN=2${tab}FID=6${tab}RETRY=3${tab}OVERWRITE=1${tab}TMP=${tmpData}`;
        const commandF = `C:2:DATA UPDATE FINGERTMP PIN=2${tab}FID=6${tab}Size=1288${tab}Valid=1${tab}TMP=${tmpData}`;
        const command = `C:1:DATA USER PIN=2${tab}Name=John Doe${tab}\n`+commandF;
        // const command = `C:123:DATA UPDATE SMS MSG=Hello World!${tab}TAG=254${tab}UID=001${tab}MIN=5${tab}StartTime=2024-08-31 13:16:00`;

        if (upload) {
            upload = false;
            console.log(`Sending fingerprint enroll command to device:`);
            // return Promise.resolve(enrollCommand);
            return Promise.resolve(command);
        }
        return Promise.resolve('OK');

    }
}

module.exports = FunctionsRouter;