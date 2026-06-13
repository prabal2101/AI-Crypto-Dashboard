/**
 * CryptoLive Dashboard - App Orchestrator
 * Coordinates startup, schedules refreshes, handles throttled sync requests,
 * and manages mock Web3 wallets.
 */

// Application state for price updates flash checks
let previousCoinsList = [];

// Refresh Throttling variables
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 15000; // 15 seconds minimum between updates

/**
 * Primary orchestrator to fetch and update all dashboard components
 */
async function refreshDashboardData(isManual = false) {
  const now = Date.now();
  
  // Throttle check for manual refreshes to protect API rate-limits
  if (isManual && (now - lastRefreshTime < REFRESH_COOLDOWN)) {
    const remaining = Math.ceil((REFRESH_COOLDOWN - (now - lastRefreshTime)) / 1000);
    window.CryptoUI.showToast(`Please wait ${remaining}s before refreshing again.`, 'warning');
    return;
  }

  console.log("Refreshing dashboard data...");
  lastRefreshTime = now;

  // Show refreshing visual feedback on manual triggers
  const refreshBtn = document.getElementById('manual-refresh-btn');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '🔄 Syncing...';
  }

  try {
    // 1. Fetch Top Coins List
    const coins = await window.CryptoAPI.getTopCoins();
    
    // Save to global window scope so other modules can access
    window.currentCoinsList = coins;
    
    // 2. Fetch Fear & Greed index
    const fng = await window.CryptoAPI.getFearAndGreed();
    window.currentFearAndGreedData = fng?.data ? fng.data[0] : null;

    // 3. Fetch News articles
    const news = await window.CryptoAPI.getNews();
    window.currentNewsData = news?.Data || [];

    // Render Components
    window.CryptoUI.setAPIConnected();
    window.CryptoUI.renderMarketOverview(window.currentCoinsList, window.currentFearAndGreedData);
    window.CryptoUI.renderSidebarWidgets(window.currentCoinsList);
    window.CryptoUI.renderNews(window.currentNewsData);
    
    // Render main list (with flashing animation if it's an update)
    if (previousCoinsList.length > 0) {
      window.CryptoUI.renderTable();
      window.CryptoUI.flashPriceUpdates(previousCoinsList, window.currentCoinsList);
    } else {
      window.CryptoUI.renderTable();
    }
    
    // Cache for future comparison
    previousCoinsList = JSON.parse(JSON.stringify(window.currentCoinsList));
    
    if (isManual) {
      window.CryptoUI.showToast("Data synced successfully with CoinGecko!", "success");
    }
  } catch (error) {
    console.error("Dashboard refresh error:", error);
    window.CryptoUI.showToast("Error updating dashboard data.", "error");
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '🔄 Refresh';
    }
  }
}

/**
 * Mock Web3 Wallet connection behavior
 */
function handleWalletConnection() {
  const walletBtn = document.getElementById('wallet-btn');
  if (!walletBtn) return;

  // Check if already connected
  if (walletBtn.dataset.connected === 'true') {
    // Disconnect
    walletBtn.dataset.connected = 'false';
    walletBtn.innerHTML = '🔌 Connect Wallet';
    walletBtn.className = 'btn-primary';
    window.CryptoUI.showToast("Wallet disconnected.", "info");
    return;
  }

  // Simulate connection loading state
  walletBtn.disabled = true;
  walletBtn.innerHTML = '⏳ Connecting...';

  setTimeout(() => {
    walletBtn.disabled = false;
    walletBtn.dataset.connected = 'true';
    walletBtn.innerHTML = '🦊 0x71C...3A9B';
    walletBtn.className = 'btn-primary badge-success'; // styled with success colors
    
    window.CryptoUI.showToast("MetaMask Wallet connected successfully!", "success");
    window.CryptoChatbot.appendMessage("System note: Wallet connected: **0x71C270822F69c84918e95D56A9eA50E5cE6B3A9B** on Ethereum Mainnet.", "bot");
  }, 1200);
}

/**
 * App initialization setup
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log("Initializing CryptoLive Dashboard...");

  // Initialize UI Event listeners & pass refresh function for currency select
  window.CryptoUI.initUI(async () => {
    await refreshDashboardData(false);
  });

  // Initialize simulated chatbot
  window.CryptoChatbot.initChatbot();

  // Show skeleton loading states
  window.CryptoUI.showTableSkeletons();
  window.CryptoUI.showWidgetSkeletons();

  // Initial load
  await refreshDashboardData(false);

  // Bind manual refresh button click
  const refreshBtn = document.getElementById('manual-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => refreshDashboardData(true));
  }

  // Bind Wallet connection button click
  const walletBtn = document.getElementById('wallet-btn');
  if (walletBtn) {
    walletBtn.addEventListener('click', handleWalletConnection);
  }

  // Background refresh scheduler (every 60s)
  setInterval(() => {
    refreshDashboardData(false);
  }, 60000);
  
  // Prompt a welcome note in chatbot after short delay
  setTimeout(() => {
    window.CryptoChatbot.appendMessage(
      "Welcome to **CryptoLive Analytics**! I can help you analyze coin prices, check Fear & Greed indices, or read latest headlines. What would you like to track?", 
      "bot"
    );
  }, 2000);
});
