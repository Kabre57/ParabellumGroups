
const { createClient } = require('redis');
const { RedisStore } = require('rate-limit-redis');

const redisUrl = process.env.REDIS_URL;
const client = redisUrl ? createClient({ url: redisUrl }) : null;

if (client) {
  client.on('error', (error) => {
    console.error('[rate-limit] Redis connection error:', error.message);
  });
}

const connectRateLimitRedis = async () => {
  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('REDIS_URL is required in production for shared rate limiting');
    }
    console.warn('[rate-limit] REDIS_URL not set; using per-process memory stores');
    return;
  }

  if (!client.isOpen) await client.connect();
  await client.ping();
};

const createRateLimitStore = (prefix) => {
  if (!client) return undefined;

  let redisStore;
  let windowMs;
  const getRedisStore = () => {
    if (!client.isReady) throw new Error('Shared rate-limit Redis is not ready');
    if (!redisStore) {
      redisStore = new RedisStore({
        prefix: `parabellum:rate-limit:${prefix}:`,
        sendCommand: (...args) => client.sendCommand(args),
      });
      redisStore.init({ windowMs });
    }
    return redisStore;
  };

  return {
    localKeys: false,
    init(options) {
      windowMs = options.windowMs;
    },
    increment(key) {
      return getRedisStore().increment(key);
    },
    decrement(key) {
      return getRedisStore().decrement(key);
    },
    resetKey(key) {
      return getRedisStore().resetKey(key);
    },
    get(key) {
      return getRedisStore().get(key);
    },
    resetAll() {
      return redisStore?.resetAll();
    },
    shutdown() {
      redisStore?.shutdown();
    },
  };
};

const isRateLimitRedisReady = () => !redisUrl || Boolean(client?.isReady);

const closeRateLimitRedis = async () => {
  if (client?.isOpen) await client.quit();
};

module.exports = {
  connectRateLimitRedis,
  createRateLimitStore,
  isRateLimitRedisReady,
  closeRateLimitRedis,
};
