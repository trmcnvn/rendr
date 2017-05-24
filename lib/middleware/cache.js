const chalk = require('chalk');

class RendrCacheMiddleware {
  constructor({ cache }) {
    this.cache = cache;
  }

  handler() {
    return (request, response, next) => {
      const path = request.path;
      this.cache.fetch(path).then((result) => {
        if (result) {
          chalk.green('cache hit');
          response.send(result);
        } else {
          chalk.red('cache miss');
          next();
        }
      }).catch((error) => {
        chalk.red(error.stack);
        next();
      });
    };
  }
}

module.exports = RendrCacheMiddleware;