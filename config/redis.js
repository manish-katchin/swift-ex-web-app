const Redis = require('ioredis');
require('dotenv').config();

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    lazyConnect: true
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err.message);
});

redisClient.on('connect', () => {
    console.log('Redis connected');
});

const testConnection = async () => {
    try {
        await redisClient.connect();
        await redisClient.ping();
        console.log('Redis connection test passed');
        return true;
    } catch (err) {
        console.error('Redis connection test failed:', err.message);
        return false;
    }
};

module.exports = { redisClient, testConnection };
