const chainMiddleware = require("./chainMiddleware");
const promiseResponse = require("./promiseResponse");

/**
 * A base class for router
 */
class PromiseRouter {
  constructor() {
    this.routes = [];
  }

  mount(app) {
    // mount routes to express app
    this.routes.forEach((route) => {
      const method = route.method.toLowerCase();
      app[method](route.path, route.callback);
    });
  }

  /**
   * Add route used for express router
   * @param method
   * @param path
   * @param handlers is a function with promise return
   */
  route(method, path, ...handlers) {
    this.routes.push({
      method: method,
      path: path,
      callback: promiseResponse(chainMiddleware(handlers)),
    });
  }
}

module.exports = PromiseRouter;
