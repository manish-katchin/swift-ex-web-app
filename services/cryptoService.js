const axios = require('axios');
const PROVIDERS = {
    COINRANKING: 'https://api.coinranking.com',
    COINGECKO: 'https://api.coingecko.com/api/v3'
};

const coinrankingClient = axios.create({
    baseURL: PROVIDERS.COINRANKING,
    timeout: 30000,
    headers: {
        'x-access-token': process.env.COINRANKING_API_KEY || ''
    }
});


const coinGeckoClient = axios.create({
    baseURL: PROVIDERS.COINGECKO,
    timeout: 30000
});

const normalizeCoinrankingList = (coins) => {
    return coins.map(coin => ({
        id: coin.uuid,
        symbol: coin.symbol?.toUpperCase(),
        name: coin.name,
        image: coin.iconUrl,
        current_price: parseFloat(coin.price) || 0,
        price_change_percentage_24h: parseFloat(coin.change) || 0,
        market_cap: parseFloat(coin.marketCap) || 0,
        total_volume: parseFloat(coin['24hVolume']) || 0,
        market_cap_rank: coin.rank,
        sparkline: coin.sparkline?.filter(p => p !== null).map(p => parseFloat(p)) || [],
        last_updated: new Date().toISOString(),
        provider: 'coinranking'
    }));
};

const normalizeCoinrankingDetail = (coin) => ({
    id: coin.uuid,
    symbol: coin.symbol?.toUpperCase(),
    name: coin.name,
    image: coin.iconUrl,
    description: coin.description || null,
    market_cap_rank: coin.rank,
    current_price: parseFloat(coin.price) || 0,
    market_cap: parseFloat(coin.marketCap) || 0,
    total_volume: parseFloat(coin['24hVolume']) || 0,
    high_24h: null,
    low_24h: null,
    price_change_24h: null,
    price_change_percentage_24h: parseFloat(coin.change) || 0,
    circulating_supply: parseFloat(coin.supply?.circulating) || null,
    total_supply: parseFloat(coin.supply?.total) || null,
    max_supply: parseFloat(coin.supply?.max) || null,
    ath: parseFloat(coin.allTimeHigh?.price) || null,
    ath_date: coin.allTimeHigh?.timestamp ? new Date(coin.allTimeHigh.timestamp * 1000).toISOString() : null,
    atl: null,
    atl_date: null,
    sparkline: coin.sparkline?.filter(p => p !== null).map(p => parseFloat(p)) || [],
    links: coin.links || [],
    tags: coin.tags || [],
    last_updated: new Date().toISOString(),
    provider: 'coinranking'
});

const normalizeCoinrankingHistory = (history, change) => {
    const prices = history.map(h => [
        h.timestamp * 1000,
        parseFloat(h.price)
    ]);
    return {
        prices,
        change: parseFloat(change) || 0,
        provider: 'coinranking'
    };
};

const normalizeCoinGeckoList = (coins) => {
    return coins.map(coin => ({
        id: coin.id,
        symbol: coin.symbol?.toUpperCase(),
        name: coin.name,
        image: coin.image,
        current_price: coin.current_price,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        market_cap: coin.market_cap,
        total_volume: coin.total_volume,
        market_cap_rank: coin.market_cap_rank,
        sparkline: coin.sparkline_in_7d?.price || [],
        last_updated: coin.last_updated,
        provider: 'coingecko'
    }));
};

const normalizeCoinGeckoDetail = (coin) => ({
    id: coin.id,
    symbol: coin.symbol?.toUpperCase(),
    name: coin.name,
    image: coin.image?.large || coin.image?.small,
    description: coin.description?.en?.split('.').slice(0, 3).join('.') + '.',
    market_cap_rank: coin.market_cap_rank,
    current_price: coin.market_data?.current_price?.usd,
    market_cap: coin.market_data?.market_cap?.usd,
    total_volume: coin.market_data?.total_volume?.usd,
    high_24h: coin.market_data?.high_24h?.usd,
    low_24h: coin.market_data?.low_24h?.usd,
    price_change_24h: coin.market_data?.price_change_24h,
    price_change_percentage_24h: coin.market_data?.price_change_percentage_24h,
    circulating_supply: coin.market_data?.circulating_supply,
    total_supply: coin.market_data?.total_supply,
    max_supply: coin.market_data?.max_supply,
    ath: coin.market_data?.ath?.usd,
    ath_date: coin.market_data?.ath_date?.usd,
    atl: coin.market_data?.atl?.usd,
    atl_date: coin.market_data?.atl_date?.usd,
    sparkline: [],
    links: [],
    tags: [],
    last_updated: coin.last_updated,
    provider: 'coingecko'
});

const normalizeCoinGeckoChart = (data) => ({
    prices: data.prices,
    change: null,
    provider: 'coingecko'
});

const fetchCoinrankingCoins = async (limit = 100) => {
    const coins = [];
    const pageSize = 50;
    const pages = Math.ceil(limit / pageSize);

    for (let page = 0; page < pages; page++) {
        const offset = page * pageSize;
        const response = await coinrankingClient.get('/v2/coins', {
            params: {
                limit: pageSize,
                offset,
                orderBy: 'marketCap',
                orderDirection: 'desc'
            }
        });

        if (response.data?.status === 'success' && response.data?.data?.coins) {
            coins.push(...response.data.data.coins);
        }
        if (coins.length >= limit || !response.data?.data?.coins?.length) {
            break;
        }
    }

    return normalizeCoinrankingList(coins.slice(0, limit));
};

const fetchCoinrankingDetail = async (uuid) => {
    const response = await coinrankingClient.get(`/v2/coin/${uuid}`);
    if (response.data?.status === 'success' && response.data?.data?.coin) {
        return normalizeCoinrankingDetail(response.data.data.coin);
    }
    throw new Error('Invalid response from Coinranking');
};

const fetchCoinrankingHistory = async (uuid, timePeriod = '7d') => {
    const response = await coinrankingClient.get(`/v2/coin/${uuid}/history`, {
        params: { timePeriod }
    });
    if (response.data?.status === 'success' && response.data?.data?.history) {
        return normalizeCoinrankingHistory(
            response.data.data.history,
            response.data.data.change
        );
    }
    throw new Error('Invalid history response from Coinranking');
};

const fetchCoinGeckoCoins = async (limit = 100) => {
    const response = await coinGeckoClient.get('/coins/markets', {
        params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: limit,
            page: 1,
            sparkline: true,
            price_change_percentage: '24h'
        }
    });
    return normalizeCoinGeckoList(response.data);
};

const fetchCoinGeckoDetail = async (coinId) => {
    const response = await coinGeckoClient.get(`/coins/${coinId}`, {
        params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
            sparkline: false
        }
    });
    return normalizeCoinGeckoDetail(response.data);
};

const fetchCoinGeckoChart = async (coinId, days = 7) => {
    const response = await coinGeckoClient.get(`/coins/${coinId}/market_chart`, {
        params: { vs_currency: 'usd', days }
    });
    return normalizeCoinGeckoChart(response.data);
};

const fetchTopCoins = async (limit = 100) => {
    try {
        console.log('Fetching coins from Coinranking...');
        const coins = await fetchCoinrankingCoins(limit);
        console.log(`Coinranking: Got ${coins.length} coins`);
        return coins;
    } catch (err) {
        console.warn('Coinranking failed:', err.message);

        if (err.response?.status === 429) {
            console.warn('Coinranking rate limited, falling back to CoinGecko...');
        }
        try {
            console.log('Falling back to CoinGecko...');
            const coins = await fetchCoinGeckoCoins(limit);
            console.log(`CoinGecko: Got ${coins.length} coins`);
            return coins;
        } catch (geckoErr) {
            console.error('CoinGecko also failed:', geckoErr.message);
            throw new Error('All providers failed for coins list');
        }
    }
};

const fetchCoinDetail = async (coinId, symbol = null) => {
    try {
        console.log(`Fetching detail from Coinranking: ${coinId}`);
        return await fetchCoinrankingDetail(coinId);
    } catch (err) {
        console.warn(`Coinranking detail failed for ${coinId}:`, err.message);
        if (err.response?.status === 429 || err.response?.status === 404) {
            try {
                console.log(`Falling back to CoinGecko for: ${coinId}`);
                return await fetchCoinGeckoDetail(coinId.toLowerCase());
            } catch (geckoErr) {
                console.error('CoinGecko detail also failed:', geckoErr.message);
            }
        }
        throw new Error(`All providers failed for coin detail: ${coinId}`);
    }
};

const fetchCoinChart = async (coinId, timePeriod = '7d') => {
    try {
        console.log(`Fetching history from Coinranking: ${coinId}, period: ${timePeriod}`);
        return await fetchCoinrankingHistory(coinId, timePeriod);
    } catch (err) {
        console.warn(`Coinranking history failed for ${coinId}:`, err.message);
        if (err.response?.status === 429 || err.response?.status === 404) {
            try {
                const daysMap = {
                    '3h': 1,
                    '24h': 1,
                    '7d': 7,
                    '30d': 30,
                    '3m': 90,
                    '1y': 365,
                    '3y': 1095,
                    '5y': 1825
                };
                const days = daysMap[timePeriod] || 7;

                console.log(`Falling back to CoinGecko for chart: ${coinId}, days: ${days}`);
                return await fetchCoinGeckoChart(coinId.toLowerCase(), days);
            } catch (geckoErr) {
                console.error('CoinGecko chart also failed:', geckoErr.message);
            }
        }
        throw new Error(`All providers failed for chart: ${coinId}`);
    }
};

module.exports = {
    fetchTopCoins,
    fetchCoinDetail,
    fetchCoinChart,
    fetchCoinrankingCoins,
    fetchCoinrankingDetail,
    fetchCoinrankingHistory,
    fetchCoinGeckoCoins,
    fetchCoinGeckoDetail,
    fetchCoinGeckoChart
};
