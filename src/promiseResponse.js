function promiseResponse(handler) {
    return function (req, res, next) {
        handler(req, res)
            .then(data => {
                res.status(200); // Default status code
                if (Buffer.isBuffer(data)) {
                    res.end(data);
                    return;
                }
                if (typeof data === 'object') {
                    res.json(data);
                    return;
                }
                // String/number or anything else
                res.setHeader('Content-Type', 'text/plain');
                res.send(data);
            })
            .catch(error => {
                next(error);
            });
    };
}



module.exports = promiseResponse;
