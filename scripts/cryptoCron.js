const cron = require('node-cron');
const cryptoService = require('../services/cryptoService');
const cacheService = require('../services/cacheService');

const refreshCryptoData = async () => {
    try {
        console.log('Cron: Fetching top 100 coins...');
        const coins = await cryptoService.fetchTopCoins(100);
        await cacheService.cacheCoins(coins);
        await cacheService.batchUpdateCoinDetails(coins);
        console.log('Cron: Cached and batched', coins.length, 'coins at', new Date().toISOString());
    } catch (err) {
        console.error('Cron: Failed to refresh crypto data:', err.message);
    }
};

const startCryptoJob = () => {
    cron.schedule('*/15 * * * *', refreshCryptoData);
    console.log('Crypto cron job scheduled (every 15 minutes)');
    refreshCryptoData();
};

module.exports = { startCryptoJob, refreshCryptoData };
