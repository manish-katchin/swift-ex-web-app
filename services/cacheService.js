const { redisClient } = require('../config/redis');

const CACHE_KEYS = {
    COINS_LIST: 'crypto:coins:list',
    COIN_DETAIL: 'crypto:coin:detail:',
    COIN_HISTORY: 'crypto:coin:history:',
    LAST_UPDATE: 'crypto:last_update'
};

const TTL = {
    COINS_LIST: 1200,
    COIN_DETAIL: 86400,
    COIN_HISTORY: 7200
};

const DAILY_COINRANKING_LIMIT = 155;
const MONTHLY_COINRANKING_LIMIT = 4600;

let inMemoryDailyCalls = 0;
let inMemoryDailyDate = new Date().toISOString().slice(0, 10);
let inMemoryMonthlyCalls = 0;
let inMemoryMonth = new Date().toISOString().slice(0, 7);

const memoryCache = new Map();
const MAX_MEMORY_ITEMS = 1000;

const pruneMemoryCache = () => {
    const now = Date.now();
    for (const [key, item] of memoryCache.entries()) {
        if (now > item.expiresAt) {
            memoryCache.delete(key);
        }
    }
    if (memoryCache.size > MAX_MEMORY_ITEMS) {
        const excess = memoryCache.size - MAX_MEMORY_ITEMS;
        const keys = memoryCache.keys();
        for (let i = 0; i < excess; i++) {
            const nextKey = keys.next().value;
            if (nextKey) {
                memoryCache.delete(nextKey);
            }
        }
    }
};

const setMemory = (key, value, ttlSeconds) => {
    if (memoryCache.size >= MAX_MEMORY_ITEMS) {
        pruneMemoryCache();
    }
    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000
    });
};

const getMemory = (key) => {
    const item = memoryCache.get(key);
    if (!item) {
        return null;
    }
    if (Date.now() > item.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return item.value;
};

const cacheCoins = async (coins) => {
    try {
        setMemory(CACHE_KEYS.COINS_LIST, coins, TTL.COINS_LIST);
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
        const memData = getMemory(CACHE_KEYS.COINS_LIST);
        if (memData) {
            return memData;
        }
        const data = await redisClient.get(CACHE_KEYS.COINS_LIST);
        if (data) {
            const parsed = JSON.parse(data);
            setMemory(CACHE_KEYS.COINS_LIST, parsed, 300);
            return parsed;
        }
        return null;
    } catch (err) {
        console.error('Get cached coins error:', err.message);
        return getMemory(CACHE_KEYS.COINS_LIST);
    }
};

const cacheCoinDetail = async (coinId, detail, customTTL = TTL.COIN_DETAIL) => {
    try {
        const key = CACHE_KEYS.COIN_DETAIL + coinId;
        setMemory(key, detail, customTTL);
        await redisClient.setex(key, customTTL, JSON.stringify(detail));
        return true;
    } catch (err) {
        console.error('Cache coin detail error:', err.message);
        return false;
    }
};

const getCachedCoinDetail = async (coinId) => {
    try {
        const key = CACHE_KEYS.COIN_DETAIL + coinId;
        const memData = getMemory(key);
        if (memData) {
            return memData;
        }
        const data = await redisClient.get(key);
        if (data) {
            const parsed = JSON.parse(data);
            setMemory(key, parsed, 300);
            return parsed;
        }
        return null;
    } catch (err) {
        console.error('Get cached coin detail error:', err.message);
        return getMemory(CACHE_KEYS.COIN_DETAIL + coinId);
    }
};

const batchUpdateCoinDetails = async (coins) => {
    try {
        if (!coins || !Array.isArray(coins)) {
            return false;
        }

        const pipeline = typeof redisClient.pipeline === 'function' ? redisClient.pipeline() : null;

        for (const coin of coins) {
            const key = CACHE_KEYS.COIN_DETAIL + coin.id;
            const existing = getMemory(key);

            let detail;
            if (existing && existing.description) {
                detail = {
                    ...existing,
                    current_price: coin.current_price,
                    market_cap: coin.market_cap,
                    total_volume: coin.total_volume,
                    price_change_percentage_24h: coin.price_change_percentage_24h,
                    market_cap_rank: coin.market_cap_rank,
                    sparkline: coin.sparkline && coin.sparkline.length > 0 ? coin.sparkline : existing.sparkline,
                    last_updated: coin.last_updated || new Date().toISOString()
                };
            } else {
                detail = {
                    id: coin.id,
                    symbol: coin.symbol,
                    name: coin.name,
                    image: coin.image,
                    description: existing ? existing.description : null,
                    market_cap_rank: coin.market_cap_rank,
                    current_price: coin.current_price,
                    market_cap: coin.market_cap,
                    total_volume: coin.total_volume,
                    high_24h: existing ? existing.high_24h : null,
                    low_24h: existing ? existing.low_24h : null,
                    price_change_24h: existing ? existing.price_change_24h : null,
                    price_change_percentage_24h: coin.price_change_percentage_24h,
                    circulating_supply: existing ? existing.circulating_supply : null,
                    total_supply: existing ? existing.total_supply : null,
                    max_supply: existing ? existing.max_supply : null,
                    ath: existing ? existing.ath : null,
                    ath_date: existing ? existing.ath_date : null,
                    atl: existing ? existing.atl : null,
                    atl_date: existing ? existing.atl_date : null,
                    sparkline: coin.sparkline || [],
                    links: existing ? existing.links : [],
                    tags: existing ? existing.tags : [],
                    last_updated: coin.last_updated || new Date().toISOString(),
                    provider: coin.provider || 'coinranking'
                };
            }

            setMemory(key, detail, TTL.COIN_DETAIL);
            if (pipeline) {
                pipeline.setex(key, TTL.COIN_DETAIL, JSON.stringify(detail));
            } else {
                await redisClient.setex(key, TTL.COIN_DETAIL, JSON.stringify(detail));
            }
        }

        if (pipeline) {
            await pipeline.exec();
        }
        return true;
    } catch (err) {
        console.error('Batch update coin details error:', err.message);
        return false;
    }
};

const cacheCoinHistory = async (coinId, timePeriod, history) => {
    try {
        const key = `${CACHE_KEYS.COIN_HISTORY}${coinId}:${timePeriod}`;
        setMemory(key, history, TTL.COIN_HISTORY);
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
        const memData = getMemory(key);
        if (memData) {
            return memData;
        }
        const data = await redisClient.get(key);
        if (data) {
            const parsed = JSON.parse(data);
            setMemory(key, parsed, 300);
            return parsed;
        }
        return null;
    } catch (err) {
        console.error('Get cached coin history error:', err.message);
        return getMemory(`${CACHE_KEYS.COIN_HISTORY}${coinId}:${timePeriod}`);
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

const getCoinrankingUsage = async () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    if (inMemoryDailyDate !== todayStr) {
        inMemoryDailyDate = todayStr;
        inMemoryDailyCalls = 0;
    }
    if (inMemoryMonth !== monthStr) {
        inMemoryMonth = monthStr;
        inMemoryMonthlyCalls = 0;
    }

    try {
        const dayKey = `coinranking:day:${todayStr}`;
        const monthKey = `coinranking:month:${monthStr}`;
        const dayVal = await redisClient.get(dayKey);
        const monthVal = await redisClient.get(monthKey);
        const dayCount = dayVal ? parseInt(dayVal, 10) : inMemoryDailyCalls;
        const monthCount = monthVal ? parseInt(monthVal, 10) : inMemoryMonthlyCalls;
        return {
            day: dayCount,
            month: monthCount,
            dailyLimit: DAILY_COINRANKING_LIMIT,
            monthlyLimit: MONTHLY_COINRANKING_LIMIT
        };
    } catch {
        return {
            day: inMemoryDailyCalls,
            month: inMemoryMonthlyCalls,
            dailyLimit: DAILY_COINRANKING_LIMIT,
            monthlyLimit: MONTHLY_COINRANKING_LIMIT
        };
    }
};

const canUseCoinranking = async () => {
    const usage = await getCoinrankingUsage();
    return usage.day < usage.dailyLimit && usage.month < usage.monthlyLimit;
};

const recordCoinrankingUsage = async () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    inMemoryDailyCalls++;
    inMemoryMonthlyCalls++;

    try {
        const dayKey = `coinranking:day:${todayStr}`;
        const monthKey = `coinranking:month:${monthStr}`;

        await redisClient.incr(dayKey);
        await redisClient.expire(dayKey, 2 * 24 * 3600);

        await redisClient.incr(monthKey);
        await redisClient.expire(monthKey, 35 * 24 * 3600);
    } catch {}
};

const getCacheHealth = async () => {
    try {
        await redisClient.ping();
        const lastUpdate = await getLastUpdate();
        const coinrankingUsage = await getCoinrankingUsage();
        return {
            status: 'healthy',
            lastUpdate,
            connected: true,
            memoryItems: memoryCache.size,
            coinrankingUsage
        };
    } catch (err) {
        const coinrankingUsage = await getCoinrankingUsage();
        return {
            status: 'degraded',
            lastUpdate: null,
            connected: false,
            memoryItems: memoryCache.size,
            coinrankingUsage,
            error: err.message
        };
    }
};

module.exports = {
    cacheCoins,
    getCachedCoins,
    cacheCoinDetail,
    getCachedCoinDetail,
    batchUpdateCoinDetails,
    cacheCoinHistory,
    getCachedCoinHistory,
    getLastUpdate,
    getCacheHealth,
    canUseCoinranking,
    recordCoinrankingUsage,
    getCoinrankingUsage,
    TTL
};
