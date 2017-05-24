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
          console.log(chalk.green('cache hit'));
          response.send(result);
        } else {
          console.log(chalk.red('cache miss'));
          next();
        }
      }).catch((error) => {
        console.error(error.stack);
        next();
      });
    };
  }
}

module.exports = RendrCacheMiddleware;