/**
 * LaunchIntel Configuration Loader
 *
 * Loads settings from config/config.json and merges with environment
 * variable overrides. Environment variables always take precedence.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

let _config = null;

function loadConfig() {
  if (_config) return _config;

  // Load base config
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const base = JSON.parse(raw);

  // Apply environment variable overrides
  if (process.env.LL_API_URL) {
    base.apis.launch_library.base_url = process.env.LL_API_URL.replace(/\/launch\/?(upcoming|previous)?\/?$/, '/launch');
  }

  if (process.env.SPACEX_API_URL) {
    base.apis.spacex.base_url = process.env.SPACEX_API_URL.replace(/\/upcoming\/?$/, '');
  }

  if (process.env.NEWS_API_URL) {
    base.apis.spaceflight_news.base_url = process.env.NEWS_API_URL;
  }

  if (process.env.YAHOO_FINANCE_URL) {
    base.apis.yahoo_finance.base_url = process.env.YAHOO_FINANCE_URL;
  }

  if (process.env.STOCK_SYMBOLS) {
    base.defaults.stock_symbols = process.env.STOCK_SYMBOLS.split(',').map(s => s.trim());
  }

  if (process.env.ALERT_CHANNEL_ID) {
    base.alerts.channel_id = process.env.ALERT_CHANNEL_ID;
  }

  if (process.env.CACHE_TTL_MS) {
    base.defaults.cache_ttl_ms = parseInt(process.env.CACHE_TTL_MS, 10);
  }

  if (process.env.FETCH_TIMEOUT_MS) {
    base.defaults.fetch_timeout_ms = parseInt(process.env.FETCH_TIMEOUT_MS, 10);
  }

  // Resolve all relative paths to absolute paths from project root
  const projectRoot = path.join(__dirname, '..');
  const resolvedPaths = {};
  for (const [key, val] of Object.entries(base.paths)) {
    resolvedPaths[key] = path.resolve(projectRoot, val);
  }
  base.paths = resolvedPaths;

  _config = base;
  return _config;
}

/**
 * Reset cached config (useful for testing).
 */
function resetConfig() {
  _config = null;
}

module.exports = { loadConfig, resetConfig };
