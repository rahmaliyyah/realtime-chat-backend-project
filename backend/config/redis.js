const { createClient } = require('redis');

let redisClient = null;

async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis client connected');
  });

  await redisClient.connect();
  return redisClient;
}

module.exports = { getRedisClient };
