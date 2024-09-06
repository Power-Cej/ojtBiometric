/**
 * @param handlers Array of functions
 * @returns function Return new function that take argument req,res
 * This new function returns a promise that will be resolved by chaining.
 */
function chainMiddleware(handlers) {
    return function (req, res) {
        return handlers.reduce((promise, handler) => {
            return promise.then(() => handler(req, res));
        }, Promise.resolve());
    }
}

module.exports = chainMiddleware;
