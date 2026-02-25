# LaunchIntel v3 — Portable Skill Prompt

This document contains the complete, self-contained instructions and source code for the LaunchIntel skill, designed to be dropped into any AI agent or system with Node.js execution capabilities. It provides real-time tracking for rocket launches, space industry stocks, and the latest news.

---

## 1. Overview

LaunchIntel is a toolkit for space enthusiasts. It offers a suite of commands to retrieve timely information about space-related activities. The skill is designed to be robust, with API fallbacks and caching mechanisms.

**Core Features:**

- **🚀 Launch Tracker**: Monitors upcoming launches from key US spaceports.
- **📈 Space Stocks**: Tracks live prices for major space companies.
- **📰 Space News**: Aggregates the latest headlines from space news sources.
- **🚨 Smart Alerts**: Provides automated notifications for upcoming launches.
- **🎨 Canvas UI**: Generates a visual HTML countdown for the next launch.

## 2. Commands

The agent should expose the following commands to the user. Each command is executed by running a Node.js script.

| Command | Description | Execution | Arguments |
| :--- | :--- | :--- | :--- |
| `launch` | List upcoming rocket launches. | `node scripts/launch.js` | None |
| `recent` | Show launches from the past N days. | `node scripts/recent.js [days]` | `days` (integer, default: 30) |
| `spacestocks` | Fetch real-time stock prices. | `node scripts/spacestocks.js` | None |
| `spacenews` | Fetch the latest space news headlines. | `node scripts/spacenews.js` | None |
| `launch_canvas` | Generate a visual HTML countdown page. | `node scripts/canvas.js` | None |
| `alerts` | (For cron) Check and fire launch alerts. | `node scripts/alerts.js` | None |

## 3. File Structure & Source Code

To execute the skill, the following file structure and content must be created in the agent's workspace.

### `/config/config.json`

This file contains all externalized configuration for API endpoints, default settings, and file paths.

```json
{
  "apis": {
    "launch_library": {
      "base_url": "https://ll.thespacedevs.com/2.2.0/launch",
      "upcoming_path": "/upcoming/",
      "previous_path": "/previous/",
      "default_limit": 20,
      "mode": "list"
    },
    "spacex": {
      "base_url": "https://api.spacexdata.com/v5/launches",
      "upcoming_path": "/upcoming"
    },
    "spaceflight_news": {
      "base_url": "https://api.spaceflightnewsapi.net/v4/articles/",
      "default_limit": 5
    },
    "yahoo_finance": {
      "base_url": "https://query1.finance.yahoo.com/v8/finance/chart",
      "interval": "1d"
    }
  },
  "defaults": {
    "stock_symbols": ["RKLB", "SPCE", "BA", "LMT"],
    "recent_days": 30,
    "recent_limit": 10,
    "cache_ttl_ms": 3600000,
    "fetch_timeout_ms": 5000,
    "alert_cleanup_ttl_ms": 172800000
  },
  "spaceports": {
    "target_ids": [12, 27, 11, 21, 143],
    "target_keywords": [
      "canaveral",
      "kennedy",
      "vandenberg",
      "wallops",
      "boca chica",
      "starbase"
    ]
  },
  "alerts": {
    "windows": [
      { "name": "24h", "key": "sent24h", "min_hours": 23.5, "max_hours": 24.5, "emoji": "⏳", "label": "24 Hours to Launch" },
      { "name": "1h",  "key": "sent1h",  "min_hours": 0.9,  "max_hours": 1.1,  "emoji": "⚠️", "label": "1 Hour to Launch" },
      { "name": "10m", "key": "sent10m", "min_minutes": 5,   "max_minutes": 15,  "emoji": "🚨", "label": "10 Minutes to Launch" }
    ]
  },
  "paths": {
    "state_dir": "state",
    "assets_dir": "assets",
    "launches_cache": "state/launches.json",
    "alerts_state": "state/alerts.json",
    "canvas_output": "state/canvas.html",
    "canvas_template": "assets/template.html"
  }
}
```

### `/config/index.js`

This script loads the `config.json` and merges it with any environment variable overrides.

```javascript
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "config.json");
let _config = null;

function loadConfig() {
  if (_config) return _config;
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  const base = JSON.parse(raw);

  if (process.env.LL_API_URL) base.apis.launch_library.base_url = process.env.LL_API_URL.replace(/\/launch\/?(upcoming|previous)?\/?$/, "/launch");
  if (process.env.SPACEX_API_URL) base.apis.spacex.base_url = process.env.SPACEX_API_URL.replace(/\/upcoming\/?$/, "");
  if (process.env.NEWS_API_URL) base.apis.spaceflight_news.base_url = process.env.NEWS_API_URL;
  if (process.env.YAHOO_FINANCE_URL) base.apis.yahoo_finance.base_url = process.env.YAHOO_FINANCE_URL;
  if (process.env.STOCK_SYMBOLS) base.defaults.stock_symbols = process.env.STOCK_SYMBOLS.split(",").map(s => s.trim());
  if (process.env.ALERT_CHANNEL_ID) base.alerts.channel_id = process.env.ALERT_CHANNEL_ID;
  if (process.env.CACHE_TTL_MS) base.defaults.cache_ttl_ms = parseInt(process.env.CACHE_TTL_MS, 10);
  if (process.env.FETCH_TIMEOUT_MS) base.defaults.fetch_timeout_ms = parseInt(process.env.FETCH_TIMEOUT_MS, 10);

  const projectRoot = path.join(__dirname, "..");
  const resolvedPaths = {};
  for (const [key, val] of Object.entries(base.paths)) {
    resolvedPaths[key] = path.resolve(projectRoot, val);
  }
  base.paths = resolvedPaths;

  _config = base;
  return _config;
}

module.exports = { loadConfig };
```

### `/scripts/utils.js`

This file provides shared utility functions for logging, fetching data, and managing cache/state.

```javascript
const fs = require("fs");
const path = require("path");
const { loadConfig } = require("../config");

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

function log(level, context, message, data = null) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${context}]`;
  const line = data ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;
  if (level === "ERROR") console.error(line);
  else if (level === "WARN") console.warn(line);
  else console.log(line);
}

function createLogger(context) {
  return {
    debug: (msg, data) => log("DEBUG", context, msg, data),
    info: (msg, data) => log("INFO", context, msg, data),
    warn: (msg, data) => log("WARN", context, msg, data),
    error: (msg, data) => log("ERROR", context, msg, data),
  };
}

async function fetchWithTimeout(url, options = {}, timeout) {
  const config = loadConfig();
  const ms = timeout || config.defaults.fetch_timeout_ms;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function readCache(filePath, ttl) {
  const config = loadConfig();
  const cacheTtl = ttl || config.defaults.cache_ttl_ms;
  if (!fs.existsSync(filePath)) return null;
  try {
    const cache = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (Date.now() - cache.timestamp < cacheTtl) return cache.data;
    return { data: cache.data, expired: true };
  } catch { return null; }
}

function saveCache(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ timestamp: Date.now(), data }, null, 2));
}

function loadState(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return {}; }
}

function saveState(filePath, state) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

function formatDate(isoString) {
  try { return new Date(isoString).toLocaleString(); }
  catch { return isoString || "Unknown"; }
}

function formatShortDate(isoString) {
  try { return new Date(isoString).toLocaleDateString(); }
  catch { return isoString || "Unknown"; }
}

function safeGet(obj, dotPath, fallback = "Unknown") {
  return dotPath.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : fallback), obj);
}

module.exports = { createLogger, fetchWithTimeout, readCache, saveCache, loadState, saveState, formatDate, formatShortDate, safeGet };
```

### `/scripts/launch.js`

```javascript
const { loadConfig } = require("../config");
const { createLogger, fetchWithTimeout, readCache, saveCache, safeGet } = require("./utils");

const log = createLogger("launch");

async function getLaunches() {
  const config = loadConfig();
  const cacheFile = config.paths.launches_cache;
  const cached = readCache(cacheFile);
  if (cached && !cached.expired) {
    log.debug("Returning cached launch data");
    return cached;
  }

  let llData = [], sxData = [], apiSuccess = false;
  const llUrl = `${config.apis.launch_library.base_url}${config.apis.launch_library.upcoming_path}?limit=${config.apis.launch_library.default_limit}&mode=${config.apis.launch_library.mode}`;
  try {
    const res = await fetchWithTimeout(llUrl);
    if (res.ok) {
      const data = await res.json();
      llData = data.results || [];
      apiSuccess = true;
      log.info(`Fetched ${llData.length} launches from Launch Library 2`);
    }
  } catch (e) { log.warn("Launch Library 2 API error", { error: e.message }); }

  const sxUrl = `${config.apis.spacex.base_url}${config.apis.spacex.upcoming_path}`;
  try {
    const res = await fetchWithTimeout(sxUrl);
    if (res.ok) {
      sxData = await res.json();
      apiSuccess = true;
      log.info(`Fetched ${sxData.length} launches from SpaceX API`);
    }
  } catch (e) { log.warn("SpaceX API error", { error: e.message }); }

  if (!apiSuccess) {
    log.error("All APIs failed — returning stale cache if available");
    const stale = readCache(cacheFile, Infinity);
    if (stale) return Array.isArray(stale) ? stale : (stale.data || []);
    return [];
  }

  const sxNormalized = sxData.map(l => ({ name: l.name, net: l.date_utc, status: { name: "Confirmed" }, pad: { name: "SpaceX Pad", location: { name: "SpaceX Facility", id: 0 } }, image: safeGet(l, "links.patch.small", null) }));
  let allLaunches = llData.length > 0 ? llData : sxNormalized;
  const { target_ids, target_keywords } = config.spaceports;
  const relevant = allLaunches.filter(l => {
    if (!l.pad || !l.pad.location) return false;
    const locName = (safeGet(l, "pad.location.name", "")).toLowerCase();
    const locId = safeGet(l, "pad.location.id", -1);
    return target_ids.includes(locId) || target_keywords.some(k => locName.includes(k));
  });

  const output = relevant.slice(0, 5).map(l => ({ name: l.name, status: safeGet(l, "status.name", "Unknown"), net: l.net, pad: safeGet(l, "pad.name", "Unknown Pad"), location: safeGet(l, "pad.location.name", "Unknown Location"), image: l.image || null }));
  saveCache(cacheFile, output);
  log.info(`Cached ${output.length} filtered launches`);
  return output;
}

if (require.main === module) {
  getLaunches().then(launches => {
    if (launches.length === 0) {
      console.log("No upcoming launches found (or API error). Try checking SpaceflightNow or SpaceDevs directly.");
    } else {
      console.log("🚀 **Upcoming Launches**\n");
      const { formatDate } = require("./utils");
      launches.forEach(l => {
        console.log(`**${l.name}**\n📅 ${formatDate(l.net)}\n📍 ${l.location}\nStatus: ${l.status}\n`);
      });
    }
  });
}

module.exports = { getLaunches };
```

### `/scripts/recent.js`

```javascript
const { loadConfig } = require("../config");
const { createLogger, fetchWithTimeout, formatShortDate, safeGet } = require("./utils");

const log = createLogger("recent");

async function getRecentLaunches(days) {
  const config = loadConfig();
  const lookback = days || config.defaults.recent_days;
  const startDate = new Date(Date.now() - lookback * 86400000).toISOString();
  const apiBase = `${config.apis.launch_library.base_url}${config.apis.launch_library.previous_path}`;
  const url = `${apiBase}?window_start=${startDate}&limit=${config.defaults.recent_limit}&mode=${config.apis.launch_library.mode}`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    const data = await response.json();
    return (data.results || []).map(l => ({ name: l.name, status: safeGet(l, "status.name", "Unknown"), net: l.net, location: safeGet(l, "pad.location.name", "Unknown Location"), mission: safeGet(l, "mission.description", "No mission description.") }));
  } catch (error) {
    log.error("Error fetching recent launches", { error: error.message });
    return [];
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const days = parseInt(args[0]) || undefined;
  getRecentLaunches(days).then(launches => {
    const config = loadConfig();
    const lookback = days || config.defaults.recent_days;
    if (launches.length === 0) {
      console.log(`No recent launches found (or API error). Try checking SpaceflightNow or SpaceDevs directly.`);
    } else {
      console.log(`🚀 **Launches (Last ${lookback} Days)**\n`);
      launches.forEach(l => {
        const date = formatShortDate(l.net);
        const icon = (l.status.toLowerCase().includes("success") || l.status.toLowerCase().includes("go")) ? "✅" : "❌";
        console.log(`${icon} **${l.name}**\n📅 ${date}\n📍 ${l.location}\nStatus: ${l.status}\n`);
      });
    }
  });
}

module.exports = { getRecentLaunches };
```

### `/scripts/spacenews.js`

```javascript
const { loadConfig } = require("../config");
const { createLogger, fetchWithTimeout, formatShortDate } = require("./utils");

const log = createLogger("spacenews");

async function getNews() {
  const config = loadConfig();
  const url = `${config.apis.spaceflight_news.base_url}?limit=${config.apis.spaceflight_news.default_limit}`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    log.info(`Fetched ${data.results.length} news articles`);
    return data.results.map(article => ({ title: article.title, url: article.url, site: article.news_site, summary: article.summary, published: formatShortDate(article.published_at) }));
  } catch (e) {
    log.error("Error fetching news", { error: e.message });
    return [{ title: "Latest Space News (API Unavailable)", url: "https://spacenews.com/", site: "SpaceNews", summary: "Unable to fetch live news. Click to read directly.", published: formatShortDate(new Date().toISOString()) }];
  }
}

if (require.main === module) {
  getNews().then(articles => {
    console.log("📰 **Space News**\n");
    articles.forEach(a => {
      console.log(`**${a.title}** (${a.site})\n${a.summary}\n[Read more](${a.url})\n`);
    });
  });
}

module.exports = { getNews };
```

### `/scripts/spacestocks.js`

```javascript
const { loadConfig } = require("../config");
const { createLogger, fetchWithTimeout } = require("./utils");

const log = createLogger("spacestocks");

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
        results.push({ symbol: ticker, error: "No data" });
        continue;
      }
      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice, prevClose = meta.previousClose, change = price - prevClose, percent = ((change / prevClose) * 100).toFixed(2);
      results.push({ symbol: meta.symbol, price: price.toFixed(2), change: change.toFixed(2), percent: percent > 0 ? `+${percent}%` : `${percent}%`, currency: meta.currency });
    } catch (e) {
      log.warn(`Error fetching ${ticker}`, { error: e.message });
      results.push({ symbol: ticker, error: "Data unavailable" });
    }
  }

  if (results.every(r => r.error)) {
    log.error("All stock fetches failed");
    return [{ error: "ALL_FAILED", message: "Stock data unavailable via API. Try searching manually for current prices." }];
  }
  log.info(`Fetched prices for ${results.filter(r => !r.error).length}/${symbols.length} symbols`);
  return results;
}

if (require.main === module) {
  getStockPrices().then(stocks => {
    console.log("📈 **Space Stocks**\n");
    stocks.forEach(s => {
      if (s.error === "ALL_FAILED") console.log(`❌ ${s.message}`);
      else if (s.error) console.log(`❌ ${s.symbol}: ${s.error}`);
      else {
        const icon = s.percent.startsWith("+") ? "🟢" : "🔴";
        console.log(`${icon} **${s.symbol}**: ${s.price} ${s.currency} (${s.percent})`);
      }
    });
  });
}

module.exports = { getStockPrices };
```

### `/scripts/alerts.js`

```javascript
const { execSync } = require("child_process");
const { loadConfig } = require("../config");
const { getLaunches } = require("./launch");
const { createLogger, loadState, saveState } = require("./utils");

const log = createLogger("alerts");

function sendAlert(msg, channelId) {
  console.log(msg);
  if (channelId) {
    try {
      const escapedMsg = msg.replace(/"/g, "\\\"");
      const cli = process.env.ALERT_CLI || "openclaw";
      execSync(`${cli} message send --channel ${channelId} --message "${escapedMsg}"`, { stdio: "ignore" });
      log.info("Alert delivered via CLI", { channel: channelId });
    } catch (e) { log.warn("Failed to send alert via CLI", { error: e.message }); }
  }
}

async function checkAlerts() {
  const config = loadConfig();
  const stateFile = config.paths.alerts_state;
  const channelId = config.alerts.channel_id;
  const launches = await getLaunches();
  const state = loadState(stateFile);
  const now = Date.now();
  let updates = false;

  for (const launch of launches) {
    if (!launch.net) continue;
    const launchTime = new Date(launch.net).getTime(), diffMs = launchTime - now, diffHours = diffMs / 3600000, diffMinutes = diffMs / 60000;
    const launchId = `${launch.name}-${launch.net}`;
    if (!state[launchId]) { state[launchId] = {}; updates = true; }

    for (const window of config.alerts.windows) {
      if (state[launchId][window.key]) continue;
      let inWindow = false;
      if (window.min_hours != null && window.max_hours != null) inWindow = diffHours >= window.min_hours && diffHours <= window.max_hours;
      else if (window.min_minutes != null && window.max_minutes != null) inWindow = diffMinutes >= window.min_minutes && diffMinutes <= window.max_minutes;

      if (inWindow) {
        const detail = window.name === "10m" ? "📺 Watch live!" : `📍 ${launch.location}\n⏰ ${launch.net}`;
        sendAlert(`${window.emoji} **${window.label}:** ${launch.name}\n${detail}`, channelId);
        state[launchId][window.key] = true;
        updates = true;
      }
    }
  }

  const cleanupTtl = config.defaults.alert_cleanup_ttl_ms;
  for (const id in state) {
    const parts = id.split("-"), dateStr = parts[parts.length - 1], launchDate = new Date(dateStr).getTime();
    if (!isNaN(launchDate) && now - launchDate > cleanupTtl) { delete state[id]; updates = true; }
  }

  if (updates) { saveState(stateFile, state); log.info("Alert state updated"); }
}

if (require.main === module) {
  checkAlerts();
}

module.exports = { checkAlerts };
```

### `/scripts/canvas.js`

```javascript
const fs = require("fs");
const path = require("path");
const { loadConfig } = require("../config");
const { getLaunches } = require("./launch");
const { createLogger } = require("./utils");

const log = createLogger("canvas");

async function generateCanvas() {
  const config = loadConfig();
  const templateFile = config.paths.canvas_template;
  const outputFile = config.paths.canvas_output;
  const launches = await getLaunches();

  if (launches.length === 0) {
    log.warn("No launches available for canvas generation");
    console.log("No launches available for canvas.");
    return;
  }

  const nextLaunch = launches[0];
  let html = fs.readFileSync(templateFile, "utf8");
  const launchData = { name: nextLaunch.name, mission: nextLaunch.mission || "Unknown Mission", net: nextLaunch.net, location: nextLaunch.location, status: nextLaunch.status, image: nextLaunch.image };
  const scriptInjection = `window.LAUNCH_DATA = ${JSON.stringify(launchData)};`;
  html = html.replace("// Data injected here", scriptInjection);

  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, html);
  log.info(`Canvas generated at: ${outputFile}`);
  console.log(`Canvas generated at: ${outputFile}`);
}

if (require.main === module) {
  generateCanvas();
}

module.exports = { generateCanvas };
```

### `/assets/template.html`

This HTML file is the template for the visual countdown canvas.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LaunchIntel Countdown</title>
    <style>
        body { margin: 0; padding: 0; background: #0b0d17; color: #fff; font-family: 'Arial', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
        .container { text-align: center; z-index: 2; }
        h1 { font-size: 3rem; margin-bottom: 0.5rem; text-shadow: 0 0 10px rgba(0,255,255,0.5); }
        .mission { font-size: 1.5rem; color: #a0a0a0; margin-bottom: 2rem; }
        .countdown { font-size: 5rem; font-weight: bold; font-variant-numeric: tabular-nums; letter-spacing: 2px; }
        .details { margin-top: 2rem; display: flex; gap: 2rem; justify-content: center; font-size: 1.2rem; }
        .detail-item span { display: block; font-size: 0.9rem; color: #888; }
        .bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.3; z-index: 1; }
        .patch { width: 150px; height: 150px; margin-bottom: 1rem; filter: drop-shadow(0 0 10px rgba(255,255,255,0.3)); }
    </style>
</head>
<body>
    <img id="bg-image" class="bg" src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop" alt="Space Background">
    <div class="container">
        <img id="patch" class="patch" src="" alt="Mission Patch" style="display:none;">
        <h1 id="rocket-name">Loading...</h1>
        <div class="mission" id="mission-name">Fetching data...</div>
        <div class="countdown" id="timer">00:00:00:00</div>
        <div class="details">
            <div class="detail-item"><span id="location-label">Location</span><div id="location">Unknown</div></div>
            <div class="detail-item"><span id="status-label">Status</span><div id="status">Pending</div></div>
        </div>
    </div>

    <script>
        // Data injected here
        const launchData = window.LAUNCH_DATA || { net: Date.now() + 86400000, name: "Test Launch", mission: "Demo Mission", location: "Cape Canaveral", status: "Go" };
        
        if (launchData.image) {
            document.getElementById('patch').src = launchData.image;
            document.getElementById('patch').style.display = 'block';
        }
        document.getElementById('rocket-name').innerText = launchData.name;
        document.getElementById('mission-name').innerText = launchData.mission || "";
        document.getElementById('location').innerText = launchData.location;
        document.getElementById('status').innerText = launchData.status;

        function updateTimer() {
            const now = new Date().getTime();
            const launchTime = new Date(launchData.net).getTime();
            const distance = launchTime - now;

            if (distance < 0) {
                document.getElementById('timer').innerText = "T+ " + formatTime(Math.abs(distance));
                document.getElementById('timer').style.color = "#4caf50";
            } else {
                document.getElementById('timer').innerText = "T- " + formatTime(distance);
            }
        }

        function formatTime(ms) {
            const days = Math.floor(ms / (1000 * 60 * 60 * 24));
            const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((ms % (1000 * 60)) / 1000);
            return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        }

        setInterval(updateTimer, 1000);
        updateTimer();
    </script>
</body>
</html>
```

## 4. State Management

The skill uses a `state/` directory to persist data across executions.

- `state/launches.json`: Caches the results of the `launch` command to reduce API calls and provide data during API outages.
- `state/alerts.json`: Stores which alerts have already been sent for each launch to prevent duplicate notifications.

The agent must ensure this directory is writable.

## 5. Configuration

Configuration is handled by `config/config.json` and can be overridden by environment variables. This allows for flexible deployment.

**Key Environment Variables:**

- `STOCK_SYMBOLS`: Comma-separated list of stock tickers (e.g., `RKLB,SPCE,BA`).
- `ALERT_CHANNEL_ID`: The specific channel/user ID for sending alerts.
- `ALERT_CLI`: The command-line tool to use for sending messages (e.g., `openclaw`, `slack`, `discord`). Defaults to `openclaw`.
- `LOG_LEVEL`: Set to `DEBUG` for verbose logging.

---

This concludes the portable prompt for the LaunchIntel skill. With the files and instructions above, any capable AI agent can replicate and operate this skill.
