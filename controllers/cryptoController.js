const cacheService = require('../services/cacheService');
const cryptoService = require('../services/cryptoService');


const getCoins = async (req, res) => {
    try {
        let coins = await cacheService.getCachedCoins();

        if (!coins) {
            coins = await cryptoService.fetchTopCoins(100);
            await cacheService.cacheCoins(coins);
        }

        res.json({
            success: true,
            data: coins,
            count: coins.length,
            cached: !!coins
        });
    } catch (err) {
        console.error('getCoins error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

const getCoinDetail = async (req, res) => {
    try {
        const { id } = req.params;
        let coinDetail = await cacheService.getCachedCoinDetail(id);
        if (!coinDetail) {
            coinDetail = await cryptoService.fetchCoinDetail(id);
            await cacheService.cacheCoinDetail(id, coinDetail);
        }

        res.json({ success: true, data: coinDetail });
    } catch (err) {
        console.error('getCoinDetail error:', err.message);

        if (err.message.includes('All providers failed')) {
            res.status(503).json({
                success: false,
                error: 'All providers are currently unavailable. Please try again later.',
                code: 'PROVIDERS_UNAVAILABLE'
            });
        } else {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

const getCoinChart = async (req, res) => {
    try {
        const { id } = req.params;
        const timePeriod = req.query.timePeriod || '7d';
        if (timePeriod) {
            const coins = await cacheService.getCachedCoins();
            const coin = coins?.find(c => c.id === id);

            if (coin?.sparkline?.length > 0) {
                const now = Date.now();
                const interval = (7 * 24 * 60 * 60 * 1000) / coin.sparkline.length;
                const prices = coin.sparkline.map((price, index) => [
                    now - (coin.sparkline.length - index) * interval,
                    price
                ]);

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
        let history = await cacheService.getCachedCoinHistory(id, timePeriod);

        if (!history) {
            history = await cryptoService.fetchCoinChart(id, timePeriod);
            await cacheService.cacheCoinHistory(id, timePeriod, history);
        }

        res.json({ success: true, data: history });
    } catch (err) {
        console.error('getCoinChart error:', err.message);

        if (err.message.includes('All providers failed')) {
            res.status(503).json({
                success: false,
                error: 'All providers are currently unavailable. Please try again later.',
                code: 'PROVIDERS_UNAVAILABLE'
            });
        } else {
            res.status(500).json({ success: false, error: err.message });
        }
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
