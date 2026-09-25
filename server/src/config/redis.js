const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

class CacheManager {
  constructor() {
    this.client = null;
    this.memoryCache = new Map();
    this.memoryExpirations = new Map();
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (!config.REDIS_ENABLED || process.env.NODE_ENV === 'test') {
      logger.info('Redis disabled or running in test mode. Using In-Memory Cache.');
      return;
    }

    try {
      this.client = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 2) {
            logger.warn('Redis connection failed, continuing with In-Memory Cache.');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 1000);
        }
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis Cache successfully.');
      });

      this.client.on('error', (err) => {
        logger.warn(`Redis Cache error (${err.message}). Using In-Memory fallback.`);
      });
    } catch (e) {
      logger.warn(`Could not initialize Redis: ${e.message}`);
      this.client = null;
    }
  }

  async get(key) {
    this.init();
    if (this.client && this.client.status === 'ready') {
      try {
        const val = await this.client.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        logger.warn(`Redis get failed (${err.message}), falling back to memory.`);
      }
    }

    // In-memory cache fallback
    if (this.memoryCache.has(key)) {
      const exp = this.memoryExpirations.get(key);
      if (!exp || Date.now() < exp) {
        return this.memoryCache.get(key);
      }
      this.memoryCache.delete(key);
      this.memoryExpirations.delete(key);
    }
    return null;
  }

  async set(key, value, ttlSeconds = 120) {
    this.init();
    const strVal = JSON.stringify(value);

    if (this.client && this.client.status === 'ready') {
      try {
        await this.client.set(key, strVal, 'EX', ttlSeconds);
        return true;
      } catch (err) {
        logger.warn(`Redis set failed (${err.message}), setting in memory.`);
      }
    }

    // In-memory cache fallback
    this.memoryCache.set(key, value);
    if (ttlSeconds > 0) {
      this.memoryExpirations.set(key, Date.now() + ttlSeconds * 1000);
    }
    return true;
  }

  async del(key) {
    this.init();
    if (this.client && this.client.status === 'ready') {
      try {
        await this.client.del(key);
      } catch (e) {}
    }
    this.memoryCache.delete(key);
    this.memoryExpirations.delete(key);
    return true;
  }

  async clearPattern(pattern) {
    this.init();
    if (this.client && this.client.status === 'ready') {
      try {
        const keys = await this.client.keys(pattern);
        if (keys && keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch (e) {}
    }

    if (pattern === '*' || pattern === '') {
      this.memoryCache.clear();
      this.memoryExpirations.clear();
      return;
    }

    const prefix = pattern.replace('*', '');
    const keys = Array.from(this.memoryCache.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
        this.memoryExpirations.delete(key);
      }
    }
  }
}

const cache = new CacheManager();
module.exports = cache;
