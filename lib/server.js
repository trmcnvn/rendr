const chalk = require('chalk');
const cluster = require('cluster');
const os = require('os');
const RendrCache = require('./cache');
const RendrWorker = require('./worker');

const FIVE_MINUTES = 5 * 60;

class RendrServer {
  constructor() {
    this.cache = new RendrCache();

    if (cluster.isWorker) {
      this.worker = new RendrWorker({ cache: this.cache });
      this.worker.start();
    } else {
      console.log(chalk.yellow('Starting master'));
      this.workerCount = process.env.WORKER_COUNT || os.cpus().length;
    }
  }

  start() {
    if (cluster.isWorker) { return; }
    const forks = [];
    for (let _i = 0; _i < this.workerCount; ++_i) {
      forks.push(this.forkWorker());
    }
    return Promise.all(forks).then(() => {
      console.log(chalk.yellow('Master started'));
    });
  }

  forkWorker() {
    const worker = cluster.fork();
    worker.on('exit', (code, signal) => {
      if (signal) {
        console.log(chalk.cyan(`Worker was killed by signal: ${signal}`));
      } else if (code !== 0) {
        console.log(chalk.cyan(`Worker exited with error code: ${code}`));
      } else {
        console.log(chalk.cyan('Worker exited'));
      }
      this.forkWorker();
    });

    return new Promise((resolve) => {
      console.log(chalk.cyan('Worker created'));
      worker.on('message', (message) => {
        if (message.event === 'http-online') {
          resolve();
        }
      });
    });
  }
}

module.exports = RendrServer;