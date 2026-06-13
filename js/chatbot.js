/**
 * CryptoLive Dashboard - AI Chatbot Module
 * Provides simulated NLP-based analysis, pulling live data from
 * active states for realistic responses.
 */

// Simple state tracking for chat
let chatbotInitialized = false;

// Pre-defined chatbot suggestion options
const suggestionPrompts = [
  "Explain Fear & Greed",
  "Is Ethereum bullish?",
  "Analyze top gainer",
  "Summarize market news"
];

// Analytical responses database with fallback defaults
const chatbotKnowledge = {
  welcome: "Hi there! I am your **AI Crypto Assistant**. I analyze live coin movements, market sentiment indicators, and news articles to assist you. Ask me about a coin (e.g., *'BTC analysis'* or *'solana price'*), or check current market conditions!",
  help: "I can help you analyze the market. Try asking:\n- *'Analyze BTC'* or *'Ethereum price'*\n- *'Show top gainers'*\n- *'What is the Fear and Greed index?'*\n- *'Explain market capital'*",
  fearGreed: (value, classification) => `The **Fear & Greed Index** is currently at **${value}/100**, classifying as **${classification}**. This indicator gauges market psychology. Historically, index numbers below 30 point to oversold conditions (buying opportunities), while levels above 70 indicate market froth and potential corrections.`,
  technicalAnalysis: (name, price, change) => {
    const isUp = change >= 0;
    const direction = isUp ? "upward breakout trend" : "consolidation pull-back";
    const sentiment = isUp ? "Bullish (Accumulation)" : "Neutral-Bearish (Distribution)";
    const support = price * 0.94;
    const resistance = price * 1.05;

    return `### **Technical Analysis: ${name} (${sentiment})**
* **Live Price:** ${window.CryptoAPI.formatCurrency(price)} (${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%)
* **Current Structure:** Displaying an active ${direction} in the 4-hour candle window.
* **Key Support Level:** ${window.CryptoAPI.formatCurrency(support)}
* **Key Resistance Target:** ${window.CryptoAPI.formatCurrency(resistance)}
* **RSI Indicator:** ${isUp ? '64 (Strong momentum)' : '42 (Ranging territory)'}

*AI Recommendation:* ${isUp ? 'Hold position; trailing stops recommended near support.' : 'Wait for volume confirmation at support levels before entry.'}`;
  },
  generalMarket: "Total crypto market capitalization is holding firm. Bitcoin dominance remains a strong anchor for altcoin distributions. The current volume suggests steady liquidity flow into top layer-1 networks.",
  aboutTech: "This dashboard is built as a pure single-page portfolio application using **semantic HTML5**, **glassmorphic vanilla CSS**, and **modular JavaScript**. It integrates with the CoinGecko REST API for prices, Alternative.me API for sentiment indexes, and CryptoCompare for real-time news headlines."
};

/**
 * Initialize chatbot element selectors and listeners
 */
function initChatbot() {
  if (chatbotInitialized) return;

  const widget = document.getElementById('chatbot-widget');
  const bubble = document.getElementById('chatbot-bubble');
  const closeBtn = document.getElementById('chatbot-close-btn');
  const sendBtn = document.getElementById('chatbot-send-btn');
  const input = document.getElementById('chatbot-input');
  const suggestionsContainer = document.getElementById('chat-suggestions');

  // Toggle open
  bubble.addEventListener('click', () => {
    widget.classList.toggle('active');
    // Clear notification badge
    const badge = bubble.querySelector('.chatbot-badge');
    if (badge) badge.style.display = 'none';
    
    // Scroll to bottom on open
    setTimeout(scrollToBottom, 150);
  });

  // Toggle close
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    widget.classList.remove('active');
  });

  // Send message events
  sendBtn.addEventListener('click', handleSendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
  });

  // Populate suggestion chips
  renderSuggestions();

  chatbotInitialized = true;
  console.log("Chatbot assistant initialized.");
}

/**
 * Renders interactive suggestion chips in the chatbot window
 */
function renderSuggestions() {
  const container = document.getElementById('chat-suggestions');
  container.innerHTML = '';
  
  suggestionPrompts.forEach(prompt => {
    const chip = document.createElement('div');
    chip.className = 'suggestion-chip';
    chip.innerText = prompt;
    chip.addEventListener('click', () => {
      // Send the prompt as if user typed it
      appendMessage(prompt, 'user');
      processBotResponse(prompt);
    });
    container.appendChild(chip);
  });
}

/**
 * Handle user click/enter to send message
 */
function handleSendMessage() {
  const input = document.getElementById('chatbot-input');
  const query = input.value.trim();
  if (!query) return;

  appendMessage(query, 'user');
  input.value = '';

  processBotResponse(query);
}

/**
 * Append message bubble to chat window
 */
function appendMessage(text, sender) {
  const messagesContainer = document.getElementById('chatbot-messages');
  
  const msgBubble = document.createElement('div');
  msgBubble.className = `chat-msg ${sender}`;
  
  // Parse markdown-like bold/list formatting for rendering
  msgBubble.innerHTML = parseSimpleMarkdown(text);
  
  messagesContainer.appendChild(msgBubble);
  scrollToBottom();
}

/**
 * Show animated typing loader forbot
 */
function showTypingIndicator() {
  const messagesContainer = document.getElementById('chatbot-messages');
  const loader = document.createElement('div');
  loader.className = 'chat-msg bot typing-indicator-msg';
  loader.id = 'chat-bot-typing';
  loader.innerHTML = `
    <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:#fff; margin:0 2px; animation: float 1s infinite;"></span>
    <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:#fff; margin:0 2px; animation: float 1s infinite 0.2s;"></span>
    <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:#fff; margin:0 2px; animation: float 1s infinite 0.4s;"></span>
  `;
  messagesContainer.appendChild(loader);
  scrollToBottom();
}

/**
 * Remove animated typing loader
 */
function removeTypingIndicator() {
  const loader = document.getElementById('chat-bot-typing');
  if (loader) loader.remove();
}

/**
 * Auto-scroll to bottom of chat
 */
function scrollToBottom() {
  const messagesContainer = document.getElementById('chatbot-messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Simple parser to render markdown text in B.Tech chatbot
 */
function parseSimpleMarkdown(text) {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/### (.*?)(<br>|$)/g, '<h5>$1</h5>');
}

/**
 * Processes user query and outputs smart context response
 */
function processBotResponse(query) {
  showTypingIndicator();
  
  // Simulate latency
  setTimeout(() => {
    removeTypingIndicator();
    
    const responseText = matchResponse(query.toLowerCase());
    appendMessage(responseText, 'bot');
  }, 1000 + Math.random() * 800);
}

/**
 * Core keyword matching algorithm connecting to live data states
 */
function matchResponse(query) {
  // 1. Help keyword
  if (query.includes('help') || query.includes('what can you do')) {
    return chatbotKnowledge.help;
  }

  // 2. Technical analysis of specific coins (Check active cache)
  let matchingCoin = null;
  
  // Pull top coins list from window namespace if available
  const activeCoins = window.currentCoinsList || [];
  
  if (activeCoins.length > 0) {
    for (const coin of activeCoins) {
      if (query.includes(coin.id.toLowerCase()) || 
          query.includes(coin.symbol.toLowerCase()) || 
          query.includes(coin.name.toLowerCase())) {
        matchingCoin = coin;
        break;
      }
    }
  }

  if (matchingCoin) {
    return chatbotKnowledge.technicalAnalysis(
      matchingCoin.name,
      matchingCoin.current_price,
      matchingCoin.price_change_percentage_24h
    );
  }

  // Common symbol catches if coins list is not loaded yet
  if (query.includes('btc') || query.includes('bitcoin')) {
    return chatbotKnowledge.technicalAnalysis('Bitcoin', 68520, 2.45);
  }
  if (query.includes('eth') || query.includes('ethereum')) {
    return chatbotKnowledge.technicalAnalysis('Ethereum', 3845, -1.2);
  }
  if (query.includes('sol') || query.includes('solana')) {
    return chatbotKnowledge.technicalAnalysis('Solana', 154.25, 8.94);
  }

  // 3. Fear and Greed index keyword
  if (query.includes('fear') || query.includes('greed') || query.includes('sentiment') || query.includes('fng')) {
    const fngData = window.currentFearAndGreedData || { value: "65", classification: "Greed" };
    return chatbotKnowledge.fearGreed(fngData.value, fngData.classification);
  }

  // 4. News keyword
  if (query.includes('news') || query.includes('headline') || query.includes('summarize')) {
    const activeNews = window.currentNewsData || [];
    if (activeNews.length > 0) {
      let text = "Here are the top news headlines I summarized:\n\n";
      activeNews.slice(0, 3).forEach((item, index) => {
        text += `${index + 1}. **${item.title}** (Source: *${item.source}*)\n`;
      });
      return text;
    }
    return "The current market reports show positive institutional inflows into spot exchange-traded funds. Scalability upgrades on L2 protocols are also boosting decentralized transaction metrics.";
  }

  // 5. Gainers keyword
  if (query.includes('gainer') || query.includes('top coin') || query.includes('best coin')) {
    const activeCoins = window.currentCoinsList || [];
    if (activeCoins.length > 0) {
      // Sort in-memory to find highest change
      const sorted = [...activeCoins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
      const top = sorted[0];
      return `Today's top performing asset is **${top.name} (${top.symbol.toUpperCase()})**, which gained **${top.price_change_percentage_24h.toFixed(2)}%** over the last 24 hours. It is currently trading at **${window.CryptoAPI.formatCurrency(top.current_price)}**.`;
    }
    return "Solana (SOL) is showing a strong breakout, gaining over 8.9% today due to transaction volumes.";
  }

  // 6. Losers keyword
  if (query.includes('loser') || query.includes('worst coin') || query.includes('dropping')) {
    const activeCoins = window.currentCoinsList || [];
    if (activeCoins.length > 0) {
      const sorted = [...activeCoins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
      const worst = sorted[0];
      return `Today's largest market contraction belongs to **${worst.name} (${worst.symbol.toUpperCase()})**, dropping **${worst.price_change_percentage_24h.toFixed(2)}%** in 24 hours. It is currently trading at **${window.CryptoAPI.formatCurrency(worst.current_price)}**.`;
    }
    return "Avalanche (AVAX) experienced a correction, dropping 3.4% today due to general market profit taking.";
  }

  // 7. Watchlist keyword
  if (query.includes('watchlist') || query.includes('favorite') || query.includes('starred')) {
    const watchlist = JSON.parse(localStorage.getItem('cryptoWatchlist') || '[]');
    if (watchlist.length > 0) {
      return `You currently have **${watchlist.length} coin(s)** in your favorites list: *${watchlist.join(', ').toUpperCase()}*. Keep tracking them in your main Watchlist tab!`;
    }
    return "You don't have any coins in your Watchlist right now. Click the star icon next to any coin in the market table to bookmark it!";
  }

  // 8. Framework details / About B.Tech project
  if (query.includes('build') || query.includes('project') || query.includes('tech stack') || query.includes('how was this made') || query.includes('portfolio')) {
    return chatbotKnowledge.aboutTech;
  }

  // Default Fallback
  return `I processed your request, but couldn't find a direct analysis match. ${chatbotKnowledge.help}`;
}

// Export initialization function
window.CryptoChatbot = {
  initChatbot,
  appendMessage
};
