const STOCKS = (process.env.STOCK_SYMBOLS || "RKLB,SPCE,BA,LMT").split(',');

async function getStockPrices() {
  const results = [];
  let apiFailed = false;

  for (const symbol of STOCKS) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.trim()}?interval=1d`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      
      const data = await res.json();
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        results.push({ symbol: symbol.trim(), error: "No data" });
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
        currency: meta.currency
      });
    } catch (e) {
      console.error(`Error fetching ${symbol}: ${e.message}`);
      results.push({ symbol: symbol.trim(), error: "Data unavailable" });
      apiFailed = true; // flag if any fail
    }
  }

  // If ALL failed, return special object indicating web search fallback needed
  if (results.every(r => r.error)) {
    return [{ error: "ALL_FAILED", message: "Stock data unavailable via API. Try asking: 'Search stock price for RKLB'" }];
  }

  return results;
}

if (require.main === module) {
  getStockPrices().then(stocks => {
    console.log("📈 **Space Stocks**\n");
    stocks.forEach(s => {
      if (s.error) {
        console.log(`❌ ${s.symbol}: ${s.error}`);
      } else {
        const icon = s.percent.startsWith('+') ? '🟢' : '🔴';
        console.log(`${icon} **${s.symbol}**: ${s.price} ${s.currency} (${s.percent})`);
      }
    });
  });
}

module.exports = { getStockPrices };
