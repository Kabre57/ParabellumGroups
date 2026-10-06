const test = require('node:test');
const assert = require('node:assert/strict');

const rateLimitStorePath = require.resolve('../utils/rateLimitStore');

const withEnvironment = async (values, run) => {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]])
  );

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  delete require.cache[rateLimitStorePath];
  try {
    await run(require('../utils/rateLimitStore'));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    delete require.cache[rateLimitStorePath];
  }
};

test('production refuses to start shared rate limiting without Redis', async () => {
  await withEnvironment(
    { NODE_ENV: 'production', REDIS_URL: undefined },
    async ({ connectRateLimitRedis }) => {
      await assert.rejects(
        connectRateLimitRedis(),
        /REDIS_URL is required in production/
      );
    }
  );
});

test('rate limiters receive separate Redis stores for separate prefixes', async () => {
  await withEnvironment(
    { NODE_ENV: 'production', REDIS_URL: 'redis://localhost:6379' },
    async ({ createRateLimitStore }) => {
      const globalStore = createRateLimitStore('global');
      const authStore = createRateLimitStore('auth');

      assert.ok(globalStore);
      assert.ok(authStore);
      assert.notStrictEqual(globalStore, authStore);
    }
  );
});
