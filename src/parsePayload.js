function parsePayload(lines) {
    return lines.reduce((acc, cur) => {
        const payload = {};
        cur.forEach(item => {
            const [key, value] = item.split('=');
            if (key && value) {
                payload[key] = value;
            }
        });
        if (Object.keys(payload).length > 0) {
            acc.push(payload);
        }
        return acc;
    }, [])
}

module.exports = parsePayload;