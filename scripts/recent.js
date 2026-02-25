/**
 * LaunchIntel — Recent Launches
 *
 * Fetches recent (past) launch data from Launch Library 2 and
 * formats it for display.
 */

const { loadConfig } = require('../config');
const {
  createLogger,
  fetchWithTimeout,
  formatShortDate,
  safeGet,
} = require('./utils');

const log = createLogger('recent');

/**
 * Fetch recent launches within the specified number of days.
 * @param {number} [days] - Look-back window in days (defaults to config value).
 * @returns {Promise<Array>} Normalized recent launch objects.
 */
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
    return (data.results || []).map(l => ({
      name: l.name,
      status: safeGet(l, 'status.name', 'Unknown'),
      net: l.net,
      location: safeGet(l, 'pad.location.name', 'Unknown Location'),
      mission: safeGet(l, 'mission.description', 'No mission description.'),
    }));
  } catch (error) {
    log.error('Error fetching recent launches', { error: error.message });
    return [];
  }
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

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
        const icon = (l.status.toLowerCase().includes('success') || l.status.toLowerCase().includes('go')) ? '✅' : '❌';
        console.log(`${icon} **${l.name}**`);
        console.log(`📅 ${date}`);
        console.log(`📍 ${l.location}`);
        console.log(`Status: ${l.status}\n`);
      });
    }
  });
}

module.exports = { getRecentLaunches };
