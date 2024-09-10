const config = require('./config');
const request = require('./request');

class AttendanceUseCase {

    send(data) {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Application-Id': config.applicationId
            },
            body: JSON.stringify(data)
        }
        const url = `${config.endpoint}/collections/daily_time_record`;
        return request(url, options);
    }

    async execute(query, lines) {
        let total = 0;
        for (let line of lines) {
            const [employee_id, timestamp, status1, status2, status3, status4, status5] = line;
            const attendance = {
                employee: {id: employee_id}, date: timestamp
            }
            try {
                await this.send(attendance);
                total++;
            }catch (error){
                console.error('error send',error.text);
            }
        }
        return `OK: ${total}`;
    }
}

module.exports = AttendanceUseCase;