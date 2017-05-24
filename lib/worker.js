const chalk = require('chalk');
const express = require('express');
const RendrCacheMiddleware = require('./middleware/cache');
const RendrRenderMiddleware = require('./middleware/render');

class RendrWorker {
  constructor({ cache }) {
    this.cache = cache;
    this.cacheMiddleware = new RendrCacheMiddleware({ cache });
    this.renderMiddleware = new RendrRenderMiddleware({ cache });
    this.app = express();

    process.on('SIGINT', () => {
      this.renderMiddleware.close();
    }).on('exit', () => {
      this.renderMiddleware.close();
    });
  }

  start() {
    this.serve().then(() => {
      process.send({ event: 'http-online' });     
    }).catch((error) => {
      console.log(chalk.cyan(error.stack));
    });
  }

  serve() {
    this.app.use(require('compression')());
    this.app.get('/*', this.cacheMiddleware.handler());
    this.app.get('/*', this.renderMiddleware.handler());

    return new Promise((resolve) => {
      const listener = this.app.listen(process.env.PORT || 3000, () => {
        console.log(chalk.green('HTTP server started.'));
        resolve();
      });
    });
  }
}

module.exports = RendrWorker;