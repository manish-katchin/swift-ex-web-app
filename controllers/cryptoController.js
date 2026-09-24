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

        const coins = await cacheService.getCachedCoins();
        const matched = coins?.find(c =>
            c.id === id ||
            c.symbol?.toLowerCase() === id.toLowerCase() ||
            c.name?.toLowerCase() === id.toLowerCase()
        );

        if (!coinDetail && matched) {
            coinDetail = await cacheService.getCachedCoinDetail(matched.id);
        }

        if (!coinDetail || !coinDetail.description) {
            if (inFlightDetailRequests.has(id)) {
                coinDetail = await inFlightDetailRequests.get(id);
            } else {
                const fetchPromise = (async () => {
                    try {
                        const targetId = matched ? matched.id : id;
                        const coinName = matched ? matched.name : null;
                        const coinSymbol = matched ? matched.symbol : null;

                        const fullDetail = await cryptoService.fetchCoinDetail(targetId, coinName, coinSymbol);

                        const finalDetail = matched ? {
                            ...fullDetail,
                            id: matched.id,
                            symbol: matched.symbol,
                            name: matched.name,
                            image: fullDetail.image || matched.image,
                            current_price: matched.current_price || fullDetail.current_price,
                            market_cap: matched.market_cap || fullDetail.market_cap,
                            total_volume: matched.total_volume || fullDetail.total_volume,
                            price_change_percentage_24h: matched.price_change_percentage_24h || fullDetail.price_change_percentage_24h,
                            market_cap_rank: matched.market_cap_rank || fullDetail.market_cap_rank,
                            sparkline: matched.sparkline?.length > 0 ? matched.sparkline : fullDetail.sparkline,
                            last_updated: matched.last_updated || fullDetail.last_updated || new Date().toISOString()
                        } : fullDetail;

                        await cacheService.cacheCoinDetail(targetId, finalDetail);
                        if (matched) {
                            if (matched.symbol) {
                                await cacheService.cacheCoinDetail(matched.symbol.toLowerCase(), finalDetail);
                            }
                            if (matched.name) {
                                await cacheService.cacheCoinDetail(matched.name.toLowerCase(), finalDetail);
                            }
                        }

                        return finalDetail;
                    } catch (fetchErr) {
                        if (fetchErr.isNotFound || fetchErr.statusCode === 404) {
                            await cacheService.cacheCoinDetail(id, { notFound: true }, 300);
                        }
                        if (coinDetail) {
                            return coinDetail;
                        }
                        if (matched) {
                            return {
                                id: matched.id,
                                symbol: matched.symbol,
                                name: matched.name,
                                image: matched.image,
                                description: null,
                                market_cap_rank: matched.market_cap_rank,
                                current_price: matched.current_price,
                                market_cap: matched.market_cap,
                                total_volume: matched.total_volume,
                                high_24h: null,
                                low_24h: null,
                                price_change_24h: null,
                                price_change_percentage_24h: matched.price_change_percentage_24h,
                                circulating_supply: null,
                                total_supply: null,
                                max_supply: null,
                                ath: null,
                                ath_date: null,
                                atl: null,
                                atl_date: null,
                                sparkline: matched.sparkline || [],
                                links: [],
                                tags: [],
                                last_updated: matched.last_updated || new Date().toISOString(),
                                provider: matched.provider || 'coinranking'
                            };
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
