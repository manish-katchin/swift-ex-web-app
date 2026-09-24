const cacheService = require('../services/cacheService');
const cryptoService = require('../services/cryptoService');

const inFlightDetailRequests = new Map();
const inFlightChartRequests = new Map();
const inFlightCoinsRequest = { promise: null };

const ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;
const VALID_PERIODS = new Set(['3h', '24h', '7d', '30d', '3m', '1y', '3y', '5y']);

const getCoins = async (req, res) => {
    try {
        let coins = await cacheService.getCachedCoins();

        if (!coins) {
            if (!inFlightCoinsRequest.promise) {
                inFlightCoinsRequest.promise = (async () => {
                    try {
                        const fetched = await cryptoService.fetchTopCoins(100);
                        await cacheService.cacheCoins(fetched);
                        return fetched;
                    } finally {
                        inFlightCoinsRequest.promise = null;
                    }
                })();
            }
            coins = await inFlightCoinsRequest.promise;
        }

        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
        res.json({
            success: true,
            data: coins,
            count: coins ? coins.length : 0,
            cached: !!coins
        });
    } catch (err) {
        console.error('getCoins error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

const getCoinDetail = async (req, res) => {
    try {
        const id = (req.params.id || '').trim();
        if (!id || !ID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid coin ID format'
            });
        }

        let coinDetail = await cacheService.getCachedCoinDetail(id);

        if (coinDetail && coinDetail.notFound) {
            return res.status(404).json({
                success: false,
                error: 'Coin not found',
                code: 'COIN_NOT_FOUND'
            });
        }

        if (!coinDetail || !coinDetail.description) {
            if (inFlightDetailRequests.has(id)) {
                coinDetail = await inFlightDetailRequests.get(id);
            } else {
                const fetchPromise = (async () => {
                    try {
                        const detail = await cryptoService.fetchCoinDetail(id);
                        await cacheService.cacheCoinDetail(id, detail);
                        return detail;
                    } catch (fetchErr) {
                        if (fetchErr.isNotFound || fetchErr.statusCode === 404) {
                            await cacheService.cacheCoinDetail(id, { notFound: true }, 300);
                        }
                        if (coinDetail) {
                            return coinDetail;
                        }
                        throw fetchErr;
                    } finally {
                        inFlightDetailRequests.delete(id);
                    }
                })();

                inFlightDetailRequests.set(id, fetchPromise);
                coinDetail = await fetchPromise;
            }
        }

        if (coinDetail && coinDetail.notFound) {
            return res.status(404).json({
                success: false,
                error: 'Coin not found',
                code: 'COIN_NOT_FOUND'
            });
        }

        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
        res.json({ success: true, data: coinDetail });
    } catch (err) {
        console.error('getCoinDetail error:', err.message);

        if (err.isNotFound || err.statusCode === 404 || err.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Coin not found',
                code: 'COIN_NOT_FOUND'
            });
        }

        if (err.message.includes('All providers failed')) {
            return res.status(503).json({
                success: false,
                error: 'All providers are currently unavailable. Please try again later.',
                code: 'PROVIDERS_UNAVAILABLE'
            });
        }

        res.status(500).json({ success: false, error: err.message });
    }
};

const getCoinChart = async (req, res) => {
    try {
        const id = (req.params.id || '').trim();
        if (!id || !ID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid coin ID format'
            });
        }

        const rawPeriod = (req.query.timePeriod || '7d').trim();
        const timePeriod = VALID_PERIODS.has(rawPeriod) ? rawPeriod : '7d';

        if (timePeriod === '7d') {
            const coins = await cacheService.getCachedCoins();
            const coin = coins?.find(c => c.id === id);

            if (coin?.sparkline?.length > 0) {
                const now = Date.now();
                const interval = (7 * 24 * 60 * 60 * 1000) / coin.sparkline.length;
                const prices = coin.sparkline.map((price, index) => [
                    now - (coin.sparkline.length - index) * interval,
                    price
                ]);

                res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
                return res.json({
                    success: true,
                    data: {
                        prices,
                        change: coin.price_change_percentage_24h,
                        provider: coin.provider,
                        source: 'sparkline'
                    }
                });
            }
        }

        const chartKey = `${id}:${timePeriod}`;
        let history = await cacheService.getCachedCoinHistory(id, timePeriod);

        if (!history) {
            if (inFlightChartRequests.has(chartKey)) {
                history = await inFlightChartRequests.get(chartKey);
            } else {
                const fetchPromise = (async () => {
                    try {
                        const data = await cryptoService.fetchCoinChart(id, timePeriod);
                        await cacheService.cacheCoinHistory(id, timePeriod, data);
                        return data;
                    } finally {
                        inFlightChartRequests.delete(chartKey);
                    }
                })();

                inFlightChartRequests.set(chartKey, fetchPromise);
                history = await fetchPromise;
            }
        }

        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
        res.json({ success: true, data: history });
    } catch (err) {
        console.error('getCoinChart error:', err.message);

        if (err.message.includes('All providers failed')) {
            return res.status(503).json({
                success: false,
                error: 'All providers are currently unavailable. Please try again later.',
                code: 'PROVIDERS_UNAVAILABLE'
            });
        }

        res.status(500).json({ success: false, error: err.message });
    }
};

const getHealth = async (req, res) => {
    try {
        const health = await cacheService.getCacheHealth();
        res.json({ success: true, data: health });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getCoins, getCoinDetail, getCoinChart, getHealth };
