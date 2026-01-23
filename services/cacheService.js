const { redisClient } = require('../config/redis');

const CACHE_KEYS = {
    COINS_LIST: 'crypto:coins:list',
    COIN_DETAIL: 'crypto:coin:detail:',
    COIN_HISTORY: 'crypto:coin:history:',
    LAST_UPDATE: 'crypto:last_update'
};

const TTL = {
    COINS_LIST: 1200,   // 20 minutes
    COIN_DETAIL: 1200,
    COIN_HISTORY: 1200
};


// COINS LIST CACHE
const cacheCoins = async (coins) => {
    try {
        await redisClient.setex(CACHE_KEYS.COINS_LIST, TTL.COINS_LIST, JSON.stringify(coins));
        await redisClient.set(CACHE_KEYS.LAST_UPDATE, new Date().toISOString());
        return true;
    } catch (err) {
        console.error('Cache coins error:', err.message);
        return false;
    }
};

const getCachedCoins = async () => {
    try {
        const data = await redisClient.get(CACHE_KEYS.COINS_LIST);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error('Get cached coins error:', err.message);
        return null;
    }
};

// COIN DETAIL CACHE
const cacheCoinDetail = async (coinId, detail) => {
    try {
        const key = CACHE_KEYS.COIN_DETAIL + coinId;
        await redisClient.setex(key, TTL.COIN_DETAIL, JSON.stringify(detail));
        return true;
    } catch (err) {
        console.error('Cache coin detail error:', err.message);
        return false;
    }
};

const getCachedCoinDetail = async (coinId) => {
    try {
        const key = CACHE_KEYS.COIN_DETAIL + coinId;
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error('Get cached coin detail error:', err.message);
        return null;
    }
};

// COIN HISTORY CACHE
const cacheCoinHistory = async (coinId, timePeriod, history) => {
    try {
        const key = `${CACHE_KEYS.COIN_HISTORY}${coinId}:${timePeriod}`;
        await redisClient.setex(key, TTL.COIN_HISTORY, JSON.stringify(history));
        return true;
    } catch (err) {
        console.error('Cache coin history error:', err.message);
        return false;
    }
};

const getCachedCoinHistory = async (coinId, timePeriod) => {
    try {
        const key = `${CACHE_KEYS.COIN_HISTORY}${coinId}:${timePeriod}`;
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error('Get cached coin history error:', err.message);
        return null;
    }
};


const getLastUpdate = async () => {
    try {
        return await redisClient.get(CACHE_KEYS.LAST_UPDATE);
    } catch (err) {
        console.error('Get last update error:', err.message);
        return null;
    }
};

const getCacheHealth = async () => {
    try {
        await redisClient.ping();
        const lastUpdate = await getLastUpdate();
        return {
            status: 'healthy',
            lastUpdate,
            connected: true
        };
    } catch (err) {
        return {
            status: 'unhealthy',
            lastUpdate: null,
            connected: false,
            error: err.message
        };
    }
};

module.exports = {
    cacheCoins,
    getCachedCoins,
    cacheCoinDetail,
    getCachedCoinDetail,
    cacheCoinHistory,
    getCachedCoinHistory,
    getLastUpdate,
    getCacheHealth,
    TTL
};
