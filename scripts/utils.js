/**
 * LaunchIntel Shared Utilities
 *
 * Common functions used across all scripts: logging, fetch with timeout,
 * cache management, date formatting, and error handling.
 */

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../config');

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

function log(level, context, message, data = null) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${context}]`;
  const line = data ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;

  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/**
 * Create a scoped logger for a specific module.
 * @param {string} context - Module name (e.g., "launch", "alerts").
 * @returns {object} Logger with debug, info, warn, error methods.
 */
function createLogger(context) {
  return {
    debug: (msg, data) => log('DEBUG', context, msg, data),
    info:  (msg, data) => log('INFO',  context, msg, data),
    warn:  (msg, data) => log('WARN',  context, msg, data),
    error: (msg, data) => log('ERROR', context, msg, data),
  };
}

// ---------------------------------------------------------------------------
// Fetch with Timeout
// ---------------------------------------------------------------------------

/**
 * Fetch a URL with an automatic abort timeout.
 * @param {string} url - URL to fetch.
 * @param {object} options - Standard fetch options.
 * @param {number} [timeout] - Timeout in ms (defaults to config value).
 * @returns {Promise<Response>}
 */
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

// ---------------------------------------------------------------------------
// Cache Helpers
// ---------------------------------------------------------------------------

/**
 * Read a JSON cache file. Returns the cached data if still valid,
 * or { data, expired: true } if stale, or null if missing/corrupt.
 * @param {string} filePath - Absolute path to the cache file.
 * @param {number} [ttl] - Time-to-live in ms (defaults to config value).
 */
function readCache(filePath, ttl) {
  const config = loadConfig();
  const cacheTtl = ttl || config.defaults.cache_ttl_ms;

  if (!fs.existsSync(filePath)) return null;

  try {
    const cache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Date.now() - cache.timestamp < cacheTtl) {
      return cache.data;
    }
    return { data: cache.data, expired: true };
  } catch {
    return null;
  }
}

/**
 * Write data to a JSON cache file with a timestamp.
 * @param {string} filePath - Absolute path to the cache file.
 * @param {*} data - Data to cache.
 */
function saveCache(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify({ timestamp: Date.now(), data }, null, 2));
}

// ---------------------------------------------------------------------------
// State File Helpers
// ---------------------------------------------------------------------------

/**
 * Load a JSON state file. Returns an empty object if missing or corrupt.
 * @param {string} filePath - Absolute path to the state file.
 * @returns {object}
 */
function loadState(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Save a JSON state file, creating parent directories as needed.
 * @param {string} filePath - Absolute path to the state file.
 * @param {object} state - State object to persist.
 */
function saveState(filePath, state) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Date / Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Format a date string to a human-readable locale string.
 * @param {string} isoString - ISO 8601 date string.
 * @returns {string}
 */
function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString || 'Unknown';
  }
}

/**
 * Format a date string to a short date (no time).
 * @param {string} isoString - ISO 8601 date string.
 * @returns {string}
 */
function formatShortDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString();
  } catch {
    return isoString || 'Unknown';
  }
}

/**
 * Safely extract a nested property with a fallback.
 * @param {object} obj - Source object.
 * @param {string} dotPath - Dot-separated path (e.g., "pad.location.name").
 * @param {*} fallback - Default value if path is missing.
 * @returns {*}
 */
function safeGet(obj, dotPath, fallback = 'Unknown') {
  return dotPath.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : fallback), obj);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  createLogger,
  fetchWithTimeout,
  readCache,
  saveCache,
  loadState,
  saveState,
  formatDate,
  formatShortDate,
  safeGet,
};
