const cron = require('node-cron');
const cryptoService = require('../services/cryptoService');
const cacheService = require('../services/cacheService');

const refreshCryptoData = async () => {
    try {
        console.log('Cron: Fetching top 100 coins...');
        const coins = await cryptoService.fetchTopCoins();
        await cacheService.cacheCoins(coins);
        console.log('Cron: Cached', coins.length, 'coins at', new Date().toISOString());
    } catch (err) {
        console.error('Cron: Failed to refresh crypto data:', err.message);
    }
};

const startCryptoJob = () => {
    cron.schedule('*/20 * * * *', refreshCryptoData);
    console.log('Crypto cron job scheduled (every 20 minutes)');
    refreshCryptoData();
};

module.exports = { startCryptoJob, refreshCryptoData };
