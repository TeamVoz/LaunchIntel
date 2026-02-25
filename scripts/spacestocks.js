/**
 * LaunchIntel — Space Stocks
 *
 * Fetches real-time stock prices for space industry companies via
 * Yahoo Finance. Symbols are configurable through config or the
 * STOCK_SYMBOLS environment variable.
 */

const { loadConfig } = require('../config');
const {
  createLogger,
  fetchWithTimeout,
} = require('./utils');

const log = createLogger('spacestocks');

/**
 * Fetch current stock prices for all configured symbols.
 * @returns {Promise<Array>} Array of stock result objects.
 */
async function getStockPrices() {
  const config = loadConfig();
  const symbols = config.defaults.stock_symbols;
  const results = [];

  for (const symbol of symbols) {
    const ticker = symbol.trim();
    const url = `${config.apis.yahoo_finance.base_url}/${ticker}?interval=${config.apis.yahoo_finance.interval}`;

    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);

      const data = await res.json();
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        results.push({ symbol: ticker, error: 'No data' });
        continue;
      }

      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const prevClose = meta.previousClose;
      const change = price - prevClose;
      const percent = ((change / prevClose) * 100).toFixed(2);

      results.push({
        symbol: meta.symbol,
        price: price.toFixed(2),
        change: change.toFixed(2),
        percent: percent > 0 ? `+${percent}%` : `${percent}%`,
        currency: meta.currency,
      });
    } catch (e) {
      log.warn(`Error fetching ${ticker}`, { error: e.message });
      results.push({ symbol: ticker, error: 'Data unavailable' });
    }
  }

  // If ALL symbols failed, return a special fallback indicator
  if (results.every(r => r.error)) {
    log.error('All stock fetches failed');
    return [{
      error: 'ALL_FAILED',
      message: "Stock data unavailable via API. Try searching manually for current prices.",
    }];
  }

  log.info(`Fetched prices for ${results.filter(r => !r.error).length}/${symbols.length} symbols`);
  return results;
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

if (require.main === module) {
  getStockPrices().then(stocks => {
    console.log('📈 **Space Stocks**\n');
    stocks.forEach(s => {
      if (s.error === 'ALL_FAILED') {
        console.log(`❌ ${s.message}`);
      } else if (s.error) {
        console.log(`❌ ${s.symbol}: ${s.error}`);
      } else {
        const icon = s.percent.startsWith('+') ? '🟢' : '🔴';
        console.log(`${icon} **${s.symbol}**: ${s.price} ${s.currency} (${s.percent})`);
      }
    });
  });
}

module.exports = { getStockPrices };
