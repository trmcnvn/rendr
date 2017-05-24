const cluster = require('cluster');
const ClusterCache = require('cluster-node-cache');

const FIVE_MINUTES = 5 * 60;

class RendrCache {
  constructor() {
    this.expiry = process.env.CACHE_EXPIRATION || FIVE_MINUTES;
    this.cache = ClusterCache(cluster, {
      stdTTL: this.expiry
    });
  }

  fetch(path) {
    const key = this._getCacheKey(path);
    return this.cache.get(key).then((response) => (
      response.value[key]
    ));
  }

  push(path, data) {
    const key = this._getCacheKey(path);
    return this.cache.set(key, data);
  }

  _getCacheKey(path) {
    return `path=${path}`;
  }
}

module.exports = RendrCache;