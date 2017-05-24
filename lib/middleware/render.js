const { ChromeLauncher } = require('lighthouse/lighthouse-cli/chrome-launcher');
const chrome = require('chrome-remote-interface');
const cluster = require('cluster');

class RendrRenderMiddleware {
  constructor({ cache }) {
    this.cache = cache;
    this.port = 9222 + (cluster.worker.id - 1);
    this.launchChrome().then((launcher) => {
      this.chrome = launcher;
      this.connectToChrome().then((protocol) => {
        this.protocol = protocol;
      }).catch((error) => {
        console.error(error.stack);
      });
    }).catch(() => {
      console.error('Chrome failed to launch');
    });
  }

  handler() {
    return (request, response, next) => {
      const OK = () => {
        response.set('content-type', 'text/plain');
        response.status(200).send('OK');
      }
      const NOTOK = () => {
        response.set('content-type', 'text/plain');
        response.status(500).send('NOT OK');
      }

      const target = request.path.substring(1);
      if (!target) { return OK(); }
      if (!this.chrome) { return NOTOK(); }

      this.render(target).then((result) => {
        this.cache.push(request.path, result);
        response.set('content-type', 'text/html');
        response.status(200).send(result);
      }).catch((error) => {
        console.error(error.stack);
        NOTOK();
      });
    };
  }

  launchChrome() {
    const launcher = new ChromeLauncher({
      port: this.port,
      autoSelectChrome: true,
      additionalFlags: [
        '--headless',
        '--disable-gpu',
        '--user-agent="Rendr/1.0.0 (Chrome Headless)"']
    });
    return launcher.run().then(() => launcher).catch(() => {
      launcher.kill();
    });
  }

  connectToChrome() {
    return new Promise((resolve, reject) => {
      chrome({ port: this.port }, (protocol) => {
        const { Page, Network, Runtime } = protocol;
        Promise.all([
          Page.enable(), 
          Network.enable(), 
          Runtime.enable()
        ]).then(() => {
          resolve(protocol);
        }).catch((error) => {
          reject(error);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  close() {
    if (this.protocol) { this.protocol.close(); }
    if (this.chrome) { this.chrome.kill(); }
  }

  render(target) {
    return new Promise((resolve, reject) => {
      this.protocol.Page.domContentEventFired(() => {
        const expr = 'document.documentElement.innerHTML';
        this.protocol.Runtime.evaluate({ expression: expr }).then((result) => {
          resolve(result.result.value);
          this.protocol.Page.navigate({ url: 'about:blank' });
        }).catch((error) => {
          reject(error);
        });
      })
      this.protocol.Page.navigate({ url: target }).catch((error) => {
        reject(error);
      });
    });
  }
}

module.exports = RendrRenderMiddleware;