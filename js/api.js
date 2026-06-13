/**
 * CryptoLive Dashboard - API Manager
 * Handles real-time fetches with robust error handling, caching,
 * and realistic offline mock fallbacks for presentations.
 */

const API_BASE = "https://api.coingecko.com/api/v3";
const FNG_API = "https://api.alternative.me/fng/";
const NEWS_API = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";

// Cache structure to save API calls
const cache = {
  topCoins: {},
  coinDetails: {},
  chartData: {},
  fearAndGreed: null,
  news: null,
  timestamps: {
    topCoins: {},
    coinDetails: {},
    chartData: {},
    fearAndGreed: 0,
    news: 0
  }
};

// Cache durations (in milliseconds)
const CACHE_DURATIONS = {
  topCoins: 30000,       // 30 seconds
  coinDetails: 60000,    // 1 minute
  chartData: 300000,     // 5 minutes
  fearAndGreed: 3600000, // 1 hour
  news: 900000          // 15 minutes
};

// Current App Currency State
let currentCurrency = 'usd';

// Currency Symbols and Formatter Helpers
const currencyInfo = {
  usd: { symbol: '$', locale: 'en-US' },
  eur: { symbol: '€', locale: 'de-DE' },
  inr: { symbol: '₹', locale: 'en-IN' }
};

/**
 * Format numeric values to selected currency string
 */
function formatCurrency(value, currency = currentCurrency) {
  if (value === undefined || value === null) return 'N/A';
  const info = currencyInfo[currency] || currencyInfo.usd;
  
  // Choose decimal places based on size of number
  let decimals = 2;
  if (value < 1 && value > 0.0001) decimals = 6;
  else if (value < 0.0001) decimals = 8;
  
  return new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format numbers with compact notations (e.g. $1.2B)
 */
function formatCompact(value, currency = currentCurrency) {
  if (value === undefined || value === null) return 'N/A';
  const info = currencyInfo[currency] || currencyInfo.usd;
  
  const formatter = new Intl.NumberFormat(info.locale, {
    notation: 'compact',
    compactDisplay: 'short',
    style: 'currency',
    currency: currency.toUpperCase()
  });
  
  return formatter.format(value);
}

/**
 * Format large integers without currency symbol (e.g. for volumes)
 */
function formatNumber(value) {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Generate simulated price sparkline arrays (7 days of hourly points)
 */
function generateMockSparkline(startPrice, trend = 'up') {
  const points = 168; // 24 * 7
  const arr = [];
  let current = startPrice;
  for (let i = 0; i < points; i++) {
    const changePercent = (Math.random() - (trend === 'up' ? 0.47 : 0.53)) * 0.02; // drift
    current = current * (1 + changePercent);
    arr.push(current);
  }
  return arr;
}

// Global variable indicating if we are currently running in Offline/Fallback Mode
let isOfflineMode = false;

/* ==========================================
   HIGH-QUALITY OFFLINE FALLBACK DATA
   ========================================== */
const offlineMockData = {
  getTopCoins: (currency) => {
    const rate = currency === 'inr' ? 83.5 : currency === 'eur' ? 0.92 : 1.0;
    
    // Top 10 offline coins
    const baseCoins = [
      { id: "bitcoin", name: "Bitcoin", symbol: "btc", rank: 1, basePrice: 68520, change: 2.45, volume: 28450000000, cap: 1350000000000, supply: 19712000, trend: 'up' },
      { id: "ethereum", name: "Ethereum", symbol: "eth", rank: 2, basePrice: 3845, change: -1.20, volume: 15120000000, cap: 462000000000, supply: 120150000, trend: 'down' },
      { id: "binancecoin", name: "BNB", symbol: "bnb", rank: 3, basePrice: 588.4, change: 5.62, volume: 1850000000, cap: 86500000000, supply: 147500000, trend: 'up' },
      { id: "solana", name: "Solana", symbol: "sol", rank: 4, basePrice: 154.25, change: 8.94, volume: 3450000000, cap: 69400000000, supply: 449200000, trend: 'up' },
      { id: "ripple", name: "Ripple", symbol: "xrp", rank: 5, basePrice: 0.518, change: -0.42, volume: 920000000, cap: 28700000000, supply: 55400000000, trend: 'down' },
      { id: "dogecoin", name: "Dogecoin", symbol: "doge", rank: 6, basePrice: 0.148, change: 12.35, volume: 2100000000, cap: 21400000000, supply: 144700000000, trend: 'up' },
      { id: "cardano", name: "Cardano", symbol: "ada", rank: 7, basePrice: 0.465, change: -2.15, volume: 380000000, cap: 16500000000, supply: 35600000000, trend: 'down' },
      { id: "shiba-inu", name: "Shiba Inu", symbol: "shib", rank: 8, basePrice: 0.0000224, change: 4.81, volume: 850000000, cap: 13200000000, supply: 589270000000000, trend: 'up' },
      { id: "avalanche-2", name: "Avalanche", symbol: "avax", rank: 9, basePrice: 35.8, change: -3.40, volume: 410000000, cap: 13900000000, supply: 388000000, trend: 'down' },
      { id: "polkadot", name: "Polkadot", symbol: "dot", rank: 10, basePrice: 6.25, change: 0.85, volume: 180000000, cap: 8900000000, supply: 1430000000, trend: 'up' }
    ];

    return baseCoins.map(coin => {
      // Add slight jitter for dynamic UI simulations
      const jitter = (Math.random() - 0.5) * 0.002; // ±0.1% change
      const finalPrice = coin.basePrice * rate * (1 + jitter);
      const finalChange = coin.change + (Math.random() - 0.5) * 0.2;
      
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: `images/${coin.symbol}.png`, // Falls back to network or local
        current_price: finalPrice,
        market_cap: coin.cap * rate,
        market_cap_rank: coin.rank,
        total_volume: coin.volume * rate,
        price_change_percentage_24h: finalChange,
        circulating_supply: coin.supply,
        sparkline_in_7d: {
          price: generateMockSparkline(finalPrice, coin.trend)
        }
      };
    });
  },

  getCoinDetails: (id, currency) => {
    const coins = offlineMockData.getTopCoins(currency);
    const coin = coins.find(c => c.id === id) || coins[0];
    
    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      description: {
        en: `${coin.name} (${coin.symbol.toUpperCase()}) is a leading digital currency operating on a decentralized framework. Built as a high-performance network, it provides cryptographic security, rapid transaction finality, and serves as an important benchmark in the decentralized finance (DeFi) ecosystem.`
      },
      image: {
        large: coin.image,
        small: coin.image
      },
      market_data: {
        market_cap_rank: coin.market_cap_rank,
        current_price: { [currency]: coin.current_price },
        market_cap: { [currency]: coin.market_cap },
        total_volume: { [currency]: coin.total_volume },
        price_change_percentage_24h: coin.price_change_percentage_24h,
        high_24h: { [currency]: coin.current_price * 1.04 },
        low_24h: { [currency]: coin.current_price * 0.96 },
        circulating_supply: coin.circulating_supply,
        ath: { [currency]: coin.current_price * 1.45 },
        atl: { [currency]: coin.current_price * 0.02 }
      }
    };
  },

  getChartData: (id, currency, days) => {
    const coins = offlineMockData.getTopCoins(currency);
    const coin = coins.find(c => c.id === id) || coins[0];
    const currentPrice = coin.current_price;
    
    // Choose number of historical data points
    let dataPoints = 24; // Default 24H
    if (days === 7) dataPoints = 168;
    else if (days === 30) dataPoints = 30;
    else if (days === 365) dataPoints = 365;

    const prices = [];
    let priceCursor = currentPrice / (1 + (coin.price_change_percentage_24h / 100)); // start relative to 24h change
    
    const now = Date.now();
    const timeStep = (days * 24 * 60 * 60 * 1000) / dataPoints;

    for (let i = 0; i < dataPoints; i++) {
      const stepTime = now - (days * 24 * 60 * 60 * 1000) + (i * timeStep);
      // Random walk with slight upward drift
      const change = (Math.random() - 0.49) * (days > 30 ? 0.05 : 0.02);
      priceCursor = priceCursor * (1 + change);
      prices.push([stepTime, priceCursor]);
    }
    
    // Force final point close to current price
    prices.push([now, currentPrice]);

    return { prices };
  },

  getFearAndGreed: () => {
    return {
      data: [{
        value: "68",
        value_classification: "Greed",
        timestamp: Math.floor(Date.now() / 1000).toString()
      }]
    };
  },

  getNews: () => {
    return {
      Data: [
        {
          id: "101",
          published_on: Math.floor(Date.now() / 1000) - 1800, // 30m ago
          title: "Institutional Inflows in Cryptocurrencies Hit New Record Highs Amid Regulatory Optimism",
          url: "https://cryptocompare.com",
          source: "CoinDesk",
          body: "Major asset management firms report surging inflows into digital asset products, driving bullish indicators. Key regulators hint at streamlined staking frameworks, providing solid market clarity for multi-billion institutions.",
          imageurl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=400&q=80"
        },
        {
          id: "102",
          published_on: Math.floor(Date.now() / 1000) - 7200, // 2h ago
          title: "Ethereum Gas Fees Fall to Multi-Year Lows as Layer-2 Protocols Dominate Network Activity",
          url: "https://cryptocompare.com",
          source: "Decrypt",
          body: "Average gas prices on the Ethereum base network fell significantly as major scaling solutions host the majority of token swaps and smart contract computations, paving the way for retail dapp scale.",
          imageurl: "https://images.unsplash.com/photo-1622790698141-94e304bc7ef9?auto=format&fit=crop&w=400&q=80"
        },
        {
          id: "103",
          published_on: Math.floor(Date.now() / 1000) - 14400, // 4h ago
          title: "Layer 1 Blockchain Scalability Approaches New Thresholds with Innovative Sharding Protocols",
          url: "https://cryptocompare.com",
          source: "Blockworks",
          body: "Developer groups demonstrate groundbreaking transaction execution structures combining parallel VM environments and zero-knowledge storage models, targeting over 100,000 sub-second transactions.",
          imageurl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=400&q=80"
        }
      ]
    };
  }
};

/* ==========================================
   PRIMARY API CALL HANDLERS
   ========================================== */

/**
 * Helper to execute fetch calls with timeout and rate-limit parsing
 */
async function fetchWithFallback(url, cacheKey, duration, offlineFallbackFunc, subKey = null) {
  // Check memory cache first
  const now = Date.now();
  if (cacheKey === 'topCoins' && cache.topCoins[currentCurrency]) {
    const elapsed = now - (cache.timestamps.topCoins[currentCurrency] || 0);
    if (elapsed < duration) {
      console.log(`Cache hit: topCoins[${currentCurrency}]`);
      return cache.topCoins[currentCurrency];
    }
  } else if (cacheKey === 'coinDetails' && subKey && cache.coinDetails[subKey]) {
    const elapsed = now - (cache.timestamps.coinDetails[subKey] || 0);
    if (elapsed < duration) {
      console.log(`Cache hit: coinDetails[${subKey}]`);
      return cache.coinDetails[subKey];
    }
  } else if (cacheKey === 'chartData' && subKey && cache.chartData[subKey]) {
    const elapsed = now - (cache.timestamps.chartData[subKey] || 0);
    if (elapsed < duration) {
      console.log(`Cache hit: chartData[${subKey}]`);
      return cache.chartData[subKey];
    }
  } else if (cache[cacheKey] && (now - cache.timestamps[cacheKey] < duration)) {
    console.log(`Cache hit: ${cacheKey}`);
    return cache[cacheKey];
  }

  // Attempt Network Fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout
    
    console.log(`Fetching from network: ${url}`);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("HTTP 429: Too Many Requests (Rate Limit)");
      }
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    isOfflineMode = false; // reset mode

    // Save to Cache
    if (cacheKey === 'topCoins') {
      cache.topCoins[currentCurrency] = data;
      cache.timestamps.topCoins[currentCurrency] = now;
    } else if (cacheKey === 'coinDetails' && subKey) {
      cache.coinDetails[subKey] = data;
      cache.timestamps.coinDetails[subKey] = now;
    } else if (cacheKey === 'chartData' && subKey) {
      cache.chartData[subKey] = data;
      cache.timestamps.chartData[subKey] = now;
    } else {
      cache[cacheKey] = data;
      cache.timestamps[cacheKey] = now;
    }

    return data;
  } catch (error) {
    console.warn(`Network fetch failed for ${cacheKey}. Using mock fallback.`, error);
    isOfflineMode = true;
    
    // Call UI indicator handler (will be bound in UI layer)
    if (window.onAPIFailure) {
      window.onAPIFailure(error.message);
    }
    
    return offlineFallbackFunc();
  }
}

/**
 * Fetch top 100 cryptocurrencies
 */
async function getTopCoins() {
  const url = `${API_BASE}/coins/markets?vs_currency=${currentCurrency}&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h`;
  return fetchWithFallback(
    url, 
    'topCoins', 
    CACHE_DURATIONS.topCoins, 
    () => offlineMockData.getTopCoins(currentCurrency)
  );
}

/**
 * Fetch detailed metrics for a specific coin
 */
async function getCoinDetails(coinId) {
  const url = `${API_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
  return fetchWithFallback(
    url,
    'coinDetails',
    CACHE_DURATIONS.coinDetails,
    () => offlineMockData.getCoinDetails(coinId, currentCurrency),
    `${coinId}_${currentCurrency}`
  );
}

/**
 * Fetch historical data for a specific coin
 * days can be 1 (24H), 7 (7D), 30 (30D), 365 (1Y)
 */
async function getCoinChartData(coinId, days = 1) {
  const url = `${API_BASE}/coins/${coinId}/market_chart?vs_currency=${currentCurrency}&days=${days}`;
  return fetchWithFallback(
    url,
    'chartData',
    CACHE_DURATIONS.chartData,
    () => offlineMockData.getChartData(coinId, currentCurrency, days),
    `${coinId}_${currentCurrency}_${days}`
  );
}

/**
 * Fetch Fear and Greed Index
 */
async function getFearAndGreed() {
  return fetchWithFallback(
    FNG_API,
    'fearAndGreed',
    CACHE_DURATIONS.fearAndGreed,
    offlineMockData.getFearAndGreed
  );
}

/**
 * Fetch latest crypto news articles
 */
async function getNews() {
  return fetchWithFallback(
    NEWS_API,
    'news',
    CACHE_DURATIONS.news,
    offlineMockData.getNews
  );
}

// Export functions to global window namespace so other scripts can access them easily
window.CryptoAPI = {
  getTopCoins,
  getCoinDetails,
  getCoinChartData,
  getFearAndGreed,
  getNews,
  formatCurrency,
  formatCompact,
  formatNumber,
  setCurrency: (currency) => { 
    currentCurrency = currency.toLowerCase(); 
  },
  getCurrency: () => currentCurrency,
  getCurrencySymbol: () => (currencyInfo[currentCurrency] || currencyInfo.usd).symbol,
  getIsOfflineMode: () => isOfflineMode
};
