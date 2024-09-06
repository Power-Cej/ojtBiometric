class HandShakeUseCase {


    execute(query) {
        console.log(`Received initialization request from `, query);
        // Respond with configuration settings
        return `GET OPTION FROM: ${query.SN}\r\n` +
            `Stamp=9999\r\n` +
            `OpStamp=${Math.floor(Date.now() / 1000)}\r\n` +
            `ErrorDelay=60\r\n` +
            `Delay=30\r\n` +
            `ResLogDay=18250\r\n` +
            `ResLogDelCount=10000\r\n` +
            `ResLogCount=50000\r\n` +
            `TransTimes=00:00;14:05\r\n` +
            `TransInterval=1\r\n` +
            `TransFlag=1111000000\r\n` +
            `Realtime=1\r\n` +
            `Encrypt=0`;
    }
}

module.exports = HandShakeUseCase;