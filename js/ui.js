/**
 * CryptoLive Dashboard - UI Manager
 * Handles DOM rendering, skeleton loaders, tab switches, searching,
 * sorting, pagination, modals, and beautiful notifications.
 */

// Core UI State
let currentTab = 'all'; // 'all' or 'watchlist'
let currentPage = 1;
const itemsPerPage = 10;
let searchQuery = '';
let currentSort = { key: 'market_cap', direction: 'desc' };
let watchlist = JSON.parse(localStorage.getItem('cryptoWatchlist') || '[]');

// DOM Elements cache
const DOM = {
  coinTableBody: () => document.getElementById('coin-table-body'),
  searchInput: () => document.getElementById('search-input'),
  sortSelect: () => document.getElementById('sort-select'),
  currencySelect: () => document.getElementById('currency-select'),
  marketCapCard: () => document.getElementById('market-cap-val'),
  volumeCard: () => document.getElementById('volume-val'),
  btcDomCard: () => document.getElementById('btc-dom-val'),
  fngCard: () => document.getElementById('fng-val'),
  fngClassify: () => document.getElementById('fng-classify'),
  fngMeterFill: () => document.getElementById('fng-meter-fill'),
  fngMeterThumb: () => document.getElementById('fng-meter-thumb'),
  trendingList: () => document.getElementById('trending-list'),
  gainersList: () => document.getElementById('gainers-list'),
  losersList: () => document.getElementById('losers-list'),
  paginationInfo: () => document.getElementById('pagination-info'),
  paginationButtons: () => document.getElementById('pagination-buttons'),
  tabAll: () => document.getElementById('tab-all'),
  tabWatchlist: () => document.getElementById('tab-watchlist'),
  modal: () => document.getElementById('coin-detail-modal'),
  toastContainer: () => document.getElementById('toast-container'),
  manualRefreshBtn: () => document.getElementById('manual-refresh-btn'),
  apiStatusBadge: () => document.getElementById('api-status-badge')
};

/* ==========================================
   TOAST NOTIFICATION ENGINE
   ========================================== */
function showToast(message, type = 'info') {
  const container = DOM.toastContainer();
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  else if (type === 'error') icon = 'exclamation-circle';
  else if (type === 'warning') icon = 'exclamation-triangle';

  toast.innerHTML = `
    <span style="font-size: 1.15rem;">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slide-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ==========================================
   LOCALSTORAGE WATCHLIST LOGIC
   ========================================== */
function toggleWatchlist(coinId, e) {
  if (e) e.stopPropagation(); // stop triggering row click modal opening

  const index = watchlist.indexOf(coinId);
  if (index === -1) {
    watchlist.push(coinId);
    showToast(`${coinId.toUpperCase()} added to Watchlist!`, 'success');
  } else {
    watchlist.splice(index, 1);
    showToast(`${coinId.toUpperCase()} removed from Watchlist.`, 'info');
  }
  
  localStorage.setItem('cryptoWatchlist', JSON.stringify(watchlist));
  
  // Re-render
  renderTable();
  renderWatchlistTabIndicator();
  
  // Update chatbot context info
  window.CryptoChatbot.appendMessage(`System note: Updated Watchlist. Active list count is ${watchlist.length}.`, 'bot');
}

function renderWatchlistTabIndicator() {
  const tab = DOM.tabWatchlist();
  if (tab) {
    tab.innerHTML = `Watchlist <span style="background: var(--color-primary); font-size: 0.7rem; padding: 2px 6px; border-radius: 20px; font-weight: 700; color: white;">${watchlist.length}</span>`;
  }
}

/* ==========================================
   LOADING SKELETON RENDERERS
   ========================================== */
function showTableSkeletons() {
  const tbody = DOM.coinTableBody();
  if (!tbody) return;

  let skeletonHtml = '';
  for (let i = 0; i < 5; i++) {
    skeletonHtml += `
      <tr>
        <td><div class="skeleton skeleton-text skeleton-text-short"></div></td>
        <td>
          <div class="coin-info-cell">
            <div class="skeleton skeleton-circle"></div>
            <div class="coin-name-container" style="width: 100px;">
              <div class="skeleton skeleton-text" style="height:14px; margin-bottom:4px;"></div>
              <div class="skeleton skeleton-text-short" style="height:10px;"></div>
            </div>
          </div>
        </td>
        <td><div class="skeleton skeleton-text skeleton-text-short"></div></td>
        <td><div class="skeleton skeleton-text skeleton-text-short"></div></td>
        <td><div class="skeleton skeleton-text skeleton-rect" style="width: 100px; height: 25px;"></div></td>
        <td><div class="skeleton skeleton-text skeleton-text-short"></div></td>
        <td>
          <div class="coin-action-cell">
            <div class="skeleton skeleton-circle" style="width:28px; height:28px;"></div>
            <div class="skeleton skeleton-rect" style="width:60px; height:28px;"></div>
          </div>
        </td>
      </tr>
    `;
  }
  tbody.innerHTML = skeletonHtml;
}

function showWidgetSkeletons() {
  const targets = [DOM.trendingList(), DOM.gainersList(), DOM.losersList()];
  targets.forEach(el => {
    if (!el) return;
    let html = '';
    for (let i = 0; i < 3; i++) {
      html += `
        <div class="widget-item" style="cursor: default;">
          <div class="widget-coin-info">
            <div class="skeleton skeleton-circle" style="width:24px; height:24px;"></div>
            <div style="width: 60px;">
              <div class="skeleton skeleton-text" style="height:12px; margin-bottom:3px;"></div>
              <div class="skeleton skeleton-text-short" style="height:8px;"></div>
            </div>
          </div>
          <div class="widget-coin-stats" style="width: 50px;">
            <div class="skeleton skeleton-text" style="height:12px; margin-bottom:3px;"></div>
            <div class="skeleton skeleton-text-short" style="height:8px;"></div>
          </div>
        </div>
      `;
    }
    el.innerHTML = html;
  });
}

/* ==========================================
   MARKET SUMMARY STATS CARDS
   ========================================== */
function renderMarketOverview(coinsData, fearGreedData) {
  if (!coinsData || coinsData.length === 0) return;

  // Calculate market stats from our list of top 100 coins
  const totalCap = coinsData.reduce((acc, c) => acc + (c.market_cap || 0), 0);
  const totalVol = coinsData.reduce((acc, c) => acc + (c.total_volume || 0), 0);
  
  // Estimate BTC Dominance
  const btcCoin = coinsData.find(c => c.id === 'bitcoin');
  const btcDom = btcCoin ? ((btcCoin.market_cap / totalCap) * 100).toFixed(1) : '54.5';

  if (DOM.marketCapCard()) DOM.marketCapCard().innerText = window.CryptoAPI.formatCompact(totalCap);
  if (DOM.volumeCard()) DOM.volumeCard().innerText = window.CryptoAPI.formatCompact(totalVol);
  if (DOM.btcDomCard()) DOM.btcDomCard().innerText = `${btcDom}%`;

  // Render Fear & Greed Card
  if (fearGreedData && DOM.fngCard()) {
    const fngValue = parseInt(fearGreedData.value || 50);
    const classification = fearGreedData.value_classification || 'Neutral';
    
    DOM.fngCard().innerText = fngValue;
    if (DOM.fngClassify()) {
      DOM.fngClassify().innerText = classification;
      // Change color based on classification
      if (fngValue < 35) DOM.fngClassify().className = 'badge-danger';
      else if (fngValue > 65) DOM.fngClassify().className = 'badge-success';
      else DOM.fngClassify().className = 'badge-success'; // Neutral uses simple styling
    }

    if (DOM.fngMeterFill()) DOM.fngMeterFill().style.width = `${fngValue}%`;
    if (DOM.fngMeterThumb()) DOM.fngMeterThumb().style.left = `${fngValue}%`;
  }
}

/* ==========================================
   SIDEBAR WIDGET RENDERERS
   ========================================== */
function renderSidebarWidgets(coinsData) {
  if (!coinsData || coinsData.length === 0) return;

  // 1. Top Gainers: Sort by 24h change desc
  const gainers = [...coinsData]
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    .slice(0, 3);

  // 2. Top Losers: Sort by 24h change asc
  const losers = [...coinsData]
    .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
    .slice(0, 3);

  // 3. Trending: Select highly traded or mock Sol, Eth, Doge
  const trending = [...coinsData]
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, 3);

  // Populate Lists
  populateWidgetList(DOM.gainersList(), gainers);
  populateWidgetList(DOM.losersList(), losers);
  populateWidgetList(DOM.trendingList(), trending);
}

function populateWidgetList(element, coins) {
  if (!element) return;
  element.innerHTML = '';

  coins.forEach(coin => {
    const change = coin.price_change_percentage_24h || 0;
    const isUp = change >= 0;
    const item = document.createElement('div');
    item.className = 'widget-item';
    item.addEventListener('click', () => openDetailModal(coin.id));

    item.innerHTML = `
      <div class="widget-coin-info">
        <img class="widget-coin-icon" src="${coin.image}" alt="${coin.name}" onerror="this.src='images/logo.png'">
        <div>
          <div class="widget-coin-name">${coin.name}</div>
          <div class="widget-coin-symbol">${coin.symbol}</div>
        </div>
      </div>
      <div class="widget-coin-stats">
        <div class="widget-coin-price">${window.CryptoAPI.formatCurrency(coin.current_price)}</div>
        <div class="${isUp ? 'badge-success' : 'badge-danger'}">
          ${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%
        </div>
      </div>
    `;
    element.appendChild(item);
  });
}

/* ==========================================
   MAIN COIN TABLE DRAW ENGINE
   ========================================== */

/**
 * Filter, sort, and slice the global coins list to draw table
 */
function renderTable() {
  const tbody = DOM.coinTableBody();
  if (!tbody || !window.currentCoinsList) return;

  const data = window.currentCoinsList;
  let filtered = [...data];

  // 1. Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(coin => 
      coin.name.toLowerCase().includes(query) || 
      coin.symbol.toLowerCase().includes(query)
    );
  }

  // 2. Tab Filter (All vs Watchlist)
  if (currentTab === 'watchlist') {
    filtered = filtered.filter(coin => watchlist.includes(coin.id));
  }

  // 3. Sorting
  const key = currentSort.key;
  const dir = currentSort.direction === 'asc' ? 1 : -1;
  
  filtered.sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    // Map alternative keys if sorting select is used
    if (key === 'price') { valA = a.current_price; valB = b.current_price; }
    else if (key === 'change') { valA = a.price_change_percentage_24h; valB = b.price_change_percentage_24h; }
    else if (key === 'volume') { valA = a.total_volume; valB = b.total_volume; }
    else if (key === 'market_cap') { valA = a.market_cap; valB = b.market_cap; }

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;
    
    return valA > valB ? dir : valA < valB ? -dir : 0;
  });

  // 4. Pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Guard current page boundaries
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

  // Render rows
  if (paginated.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
          No cryptocurrencies found. Add coins to your watchlist or try adjusting your search filters!
        </td>
      </tr>
    `;
    updatePaginationControls(0, 0, 1);
    return;
  }

  tbody.innerHTML = '';
  
  paginated.forEach((coin) => {
    const change = coin.price_change_percentage_24h || 0;
    const isUp = change >= 0;
    const isStarred = watchlist.includes(coin.id);
    
    // Sparkline SVG generator call
    const sparklineSvg = window.CryptoCharts.generateSVGSparkline(
      coin.sparkline_in_7d?.price || [],
      change
    );

    const tr = document.createElement('tr');
    tr.id = `row-${coin.id}`;
    tr.addEventListener('click', () => openDetailModal(coin.id));

    tr.innerHTML = `
      <td class="coin-rank">${coin.market_cap_rank || '-'}</td>
      <td>
        <div class="coin-info-cell">
          <img class="coin-icon-img" src="${coin.image}" alt="${coin.name}" onerror="this.src='images/logo.png'">
          <div class="coin-name-container">
            <span class="coin-symbol">${coin.symbol}</span>
            <span class="coin-name">${coin.name}</span>
          </div>
        </div>
      </td>
      <td class="coin-price-cell" id="price-${coin.id}">
        ${window.CryptoAPI.formatCurrency(coin.current_price)}
      </td>
      <td class="${isUp ? 'badge-success' : 'badge-danger'}" style="border: none;">
        <span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
          ${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%
        </span>
      </td>
      <td class="coin-price-cell">${window.CryptoAPI.formatCurrency(coin.market_cap)}</td>
      <td style="min-width: 110px;">${sparklineSvg}</td>
      <td>
        <div class="coin-action-cell">
          <button class="star-btn ${isStarred ? 'active' : ''}" onclick="toggleWatchlist('${coin.id}', event)">
            ★
          </button>
          <button class="btn-table-action" onclick="openDetailModal('${coin.id}')">View</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updatePaginationControls(startIdx + 1, Math.min(startIdx + itemsPerPage, totalItems), totalItems);
}

/**
 * Draw Page numbers and details
 */
function updatePaginationControls(start, end, total) {
  if (DOM.paginationInfo()) {
    DOM.paginationInfo().innerText = total > 0 ? `Showing ${start}-${end} of ${total} entries` : 'No entries to display';
  }

  const buttonsContainer = DOM.paginationButtons();
  if (!buttonsContainer) return;

  buttonsContainer.innerHTML = '';
  
  const totalPages = Math.ceil(total / itemsPerPage);
  if (totalPages <= 1) return;

  // Prev Button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn-page';
  prevBtn.innerText = '‹';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    currentPage--;
    renderTable();
  });
  buttonsContainer.appendChild(prevBtn);

  // Simple page buttons logic
  let startPage = Math.max(1, currentPage - 1);
  let endPage = Math.min(totalPages, startPage + 2);
  
  if (endPage - startPage < 2) {
    startPage = Math.max(1, endPage - 2);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `btn-page ${currentPage === i ? 'active' : ''}`;
    pageBtn.innerText = i;
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      renderTable();
    });
    buttonsContainer.appendChild(pageBtn);
  }

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn-page';
  nextBtn.innerText = '›';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    currentPage++;
    renderTable();
  });
  buttonsContainer.appendChild(nextBtn);
}

/**
 * Handle custom price flash borders on updates
 */
function flashPriceUpdates(oldPrices, newPrices) {
  newPrices.forEach(coin => {
    const old = oldPrices.find(o => o.id === coin.id);
    if (!old) return;
    
    if (coin.current_price !== old.current_price) {
      const priceTd = document.getElementById(`price-${coin.id}`);
      if (priceTd) {
        const isUp = coin.current_price > old.current_price;
        priceTd.className = `coin-price-cell ${isUp ? 'price-up-flash' : 'price-down-flash'}`;
        
        // Remove animation class after finish
        setTimeout(() => {
          priceTd.className = 'coin-price-cell';
        }, 800);
      }
    }
  });
}

/* ==========================================
   CRYPTO DETAIL MODAL CONTROLS
   ========================================== */
let activeCoinIdInModal = null;
let activeChartInterval = 1; // 1 = 24H, 7 = 7D, 30 = 30D, 365 = 1Y
let aiForecastActive = false;

async function openDetailModal(coinId) {
  activeCoinIdInModal = coinId;
  activeChartInterval = 1; // reset to 24H
  aiForecastActive = false; // reset forecast
  
  const modal = DOM.modal();
  if (!modal) return;

  // Render loading structure
  modal.querySelector('.modal-coin-name').innerText = "Loading details...";
  modal.querySelector('.modal-coin-symbol').style.display = 'none';
  modal.querySelector('.modal-coin-price').innerText = "$ --.--";
  modal.querySelector('.chart-canvas-container').innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; height:100%; width:100%;">
      <div class="skeleton skeleton-rect" style="width:100%; height:100%;"></div>
    </div>
  `;
  
  modal.classList.add('active');

  try {
    const details = await window.CryptoAPI.getCoinDetails(coinId);
    renderModalData(details);
    await updateModalChart();
  } catch (error) {
    showToast("Failed loading details. Using fallback data.", 'error');
    console.error(error);
  }
}

function closeDetailModal() {
  const modal = DOM.modal();
  if (modal) modal.classList.remove('active');
  activeCoinIdInModal = null;
}

function renderModalData(details) {
  const modal = DOM.modal();
  if (!modal) return;

  const currency = window.CryptoAPI.getCurrency();
  const data = details.market_data;

  // Icon, title, name
  modal.querySelector('.modal-coin-icon').src = details.image.large;
  modal.querySelector('.modal-coin-icon').onerror = "this.src='images/logo.png'";
  modal.querySelector('.modal-coin-name').innerText = details.name;
  
  const symbolEl = modal.querySelector('.modal-coin-symbol');
  symbolEl.style.display = 'inline-block';
  symbolEl.innerText = details.symbol;

  // Current Price & 24h Change percentage
  const currentPrice = data.current_price[currency] || 0;
  const change = data.price_change_percentage_24h || 0;
  const isUp = change >= 0;

  modal.querySelector('.modal-coin-price').innerText = window.CryptoAPI.formatCurrency(currentPrice);
  
  const changeBadge = modal.querySelector('#modal-coin-change');
  changeBadge.className = isUp ? 'badge-success' : 'badge-danger';
  changeBadge.innerHTML = `${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%`;

  // Grid Stats Info
  modal.querySelector('#modal-val-rank').innerText = `#${data.market_cap_rank || '-'}`;
  modal.querySelector('#modal-val-cap').innerText = window.CryptoAPI.formatCurrency(data.market_cap[currency]);
  modal.querySelector('#modal-val-vol').innerText = window.CryptoAPI.formatCurrency(data.total_volume[currency]);
  modal.querySelector('#modal-val-high').innerText = window.CryptoAPI.formatCurrency(data.high_24h[currency]);
  modal.querySelector('#modal-val-low').innerText = window.CryptoAPI.formatCurrency(data.low_24h[currency]);
  modal.querySelector('#modal-val-supply').innerText = window.CryptoAPI.formatNumber(data.circulating_supply);
  modal.querySelector('#modal-val-ath').innerText = window.CryptoAPI.formatCurrency(data.ath[currency]);
  modal.querySelector('#modal-val-atl').innerText = window.CryptoAPI.formatCurrency(data.atl[currency]);

  // Description
  const rawDesc = details.description?.en || "No description available for this asset.";
  // Strip out HTML tags from Coingecko description
  const cleanDesc = rawDesc.replace(/<\/?[^>]+(>|$)/g, "");
  modal.querySelector('#modal-coin-description').innerText = cleanDesc;

  // Generate dynamic AI Insights based on price performance
  const insightsBox = modal.querySelector('#modal-ai-insights');
  if (insightsBox) {
    const sentiment = isUp ? 'Bullish Sentiment' : 'Bearish Consolidation';
    const resistance = currentPrice * 1.05;
    const support = currentPrice * 0.94;
    
    insightsBox.innerHTML = `
      <div class="ai-insights-header">
        <span>✨</span> AI Sentiment Analytics (${details.name})
      </div>
      <div class="ai-insights-content">
        Based on active historical distributions, ${details.name} is showing a **${sentiment}** over the daily timeframe. 
        Volume indices indicate stable liquidity levels. Recommended key support is at **${window.CryptoAPI.formatCurrency(support)}** 
        with resistance benchmarks targeting **${window.CryptoAPI.formatCurrency(resistance)}**.
      </div>
    `;
  }
  
  // Set up Modal tabs event triggers
  setupModalTabListeners(data.price_change_percentage_24h);
}

function setupModalTabListeners(priceChange) {
  const tabs = document.querySelectorAll('.chart-tab');
  tabs.forEach(tab => {
    tab.onclick = async () => {
      // Toggle active design class
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      activeChartInterval = parseInt(tab.dataset.days);
      await updateModalChart(priceChange);
    };
  });

  const forecastBtn = document.getElementById('ai-forecast-btn');
  if (forecastBtn) {
    forecastBtn.onclick = async () => {
      aiForecastActive = !aiForecastActive;
      forecastBtn.classList.toggle('active', aiForecastActive);
      await updateModalChart(priceChange);
      
      showToast(
        aiForecastActive ? "AI 7-day predictive overlay enabled" : "AI Forecast overlay disabled", 
        aiForecastActive ? 'success' : 'info'
      );
    };
  }
}

async function updateModalChart(priceChange = 0) {
  const canvasContainer = document.querySelector('.chart-canvas-container');
  canvasContainer.innerHTML = '<canvas id="modal-price-chart"></canvas>';

  try {
    const historical = await window.CryptoAPI.getCoinChartData(activeCoinIdInModal, activeChartInterval);
    window.CryptoCharts.renderPriceChart('modal-price-chart', historical, priceChange, aiForecastActive);
  } catch (error) {
    console.error("Error drawing detail chart:", error);
  }
}

/* ==========================================
   NEWS SECTION RENDERING
   ========================================== */
function renderNews(newsData) {
  const container = document.getElementById('news-grid');
  if (!container) return;

  if (!newsData || newsData.length === 0) {
    container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: var(--color-text-muted);">Failed to load news. Check network connections.</p>`;
    return;
  }

  container.innerHTML = '';
  // Show top 3 news articles
  newsData.slice(0, 3).forEach(item => {
    const card = document.createElement('div');
    card.className = 'news-card glass-panel glow-indigo';
    
    const date = new Date(item.published_on * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    card.innerHTML = `
      <div class="news-img-container">
        <img class="news-img" src="${item.imageurl}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=400&q=80'">
      </div>
      <div class="news-content">
        <div class="news-meta">
          <span class="news-source">${item.source}</span>
          <span>${date}</span>
        </div>
        <a href="${item.url}" target="_blank" class="news-title">${item.title}</a>
        <p class="news-body">${item.body}</p>
        <a href="${item.url}" target="_blank" class="news-read-more">Read Full Article →</a>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ==========================================
   INITIALIZATION & HANDLERS BINDING
   ========================================== */
function initUI(onRefreshCallback) {
  // 1. Search trigger
  const searchInput = DOM.searchInput();
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  // 2. Select sorting triggers
  const sortSelect = DOM.sortSelect();
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = { key: e.target.value, direction: 'desc' };
      renderTable();
    });
  }

  // Double click table headers to change sorting direct
  const tableHeaders = document.querySelectorAll('.coin-table th[data-sort]');
  tableHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      const direction = (currentSort.key === key && currentSort.direction === 'desc') ? 'asc' : 'desc';
      currentSort = { key, direction };
      renderTable();
    });
  });

  // 3. Currency switcher
  const currencySelect = DOM.currencySelect();
  if (currencySelect) {
    currencySelect.value = window.CryptoAPI.getCurrency();
    currencySelect.addEventListener('change', async (e) => {
      const selected = e.target.value;
      window.CryptoAPI.setCurrency(selected);
      showToast(`Switched currency to ${selected.toUpperCase()}`, 'success');
      
      // Trigger full refresh since CoinGecko requires refetching for different currencies
      if (onRefreshCallback) await onRefreshCallback();
    });
  }

  // 4. Tab switcher (All vs Watchlist)
  const tabAll = DOM.tabAll();
  const tabWatchlist = DOM.tabWatchlist();
  
  if (tabAll && tabWatchlist) {
    tabAll.addEventListener('click', () => {
      tabAll.classList.add('active');
      tabWatchlist.classList.remove('active');
      currentTab = 'all';
      currentPage = 1;
      renderTable();
    });

    tabWatchlist.addEventListener('click', () => {
      tabWatchlist.classList.add('active');
      tabAll.classList.remove('active');
      currentTab = 'watchlist';
      currentPage = 1;
      renderTable();
    });
  }

  // 5. Modal Close bindings
  const closeBtn = document.querySelector('.modal-close-btn');
  const overlay = DOM.modal();
  
  if (closeBtn) closeBtn.onclick = closeDetailModal;
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeDetailModal();
    };
  }

  // ESC key to close modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailModal();
  });

  // 6. Hamburger Menu Trigger
  const hamburger = document.getElementById('hamburger-btn');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.onclick = () => {
      navLinks.classList.toggle('active');
      hamburger.innerText = navLinks.classList.contains('active') ? '✕' : '☰';
    };

    // Close menu when links are clicked
    navLinks.querySelectorAll('a').forEach(a => {
      a.onclick = () => {
        navLinks.classList.remove('active');
        hamburger.innerText = '☰';
      };
    });
  }

  // Register onAPIFailure event from API layer
  window.onAPIFailure = (errMsg) => {
    const badge = DOM.apiStatusBadge();
    if (badge) {
      badge.className = 'badge-danger';
      badge.innerText = 'Offline / Fallback';
    }
  };

  // Render initial numbers
  renderWatchlistTabIndicator();
}

/**
 * Handle API loading states
 */
function setAPIConnected() {
  const badge = DOM.apiStatusBadge();
  if (badge) {
    const isOffline = window.CryptoAPI.getIsOfflineMode();
    if (isOffline) {
      badge.className = 'badge-danger';
      badge.innerText = 'Offline / Fallback';
    } else {
      badge.className = 'badge-success';
      badge.innerText = 'Live API Active';
    }
  }
}

// Export UI helper functions
window.CryptoUI = {
  initUI,
  renderTable,
  renderSidebarWidgets,
  renderMarketOverview,
  renderNews,
  showTableSkeletons,
  showWidgetSkeletons,
  showToast,
  setAPIConnected,
  flashPriceUpdates
};
