/**
 * LaunchIntel — Launch Tracker
 *
 * Fetches upcoming launch data from Launch Library 2 (primary) and
 * SpaceX API v5 (fallback). Filters by configured spaceports and
 * caches results to survive API outages.
 */

const { loadConfig } = require('../config');
const {
  createLogger,
  fetchWithTimeout,
  readCache,
  saveCache,
  safeGet,
} = require('./utils');

const log = createLogger('launch');

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Fetch upcoming launches, merging data from LL2 and SpaceX APIs.
 * Returns up to 5 launches filtered by configured spaceports.
 * @returns {Promise<Array>} Normalized launch objects.
 */
async function getLaunches() {
  const config = loadConfig();
  const cacheFile = config.paths.launches_cache;

  // 1. Try valid cache first
  const cached = readCache(cacheFile);
  if (cached && !cached.expired) {
    log.debug('Returning cached launch data');
    return cached;
  }

  let llData = [];
  let sxData = [];
  let apiSuccess = false;

  // 2. Fetch from Launch Library 2
  const llUrl = `${config.apis.launch_library.base_url}${config.apis.launch_library.upcoming_path}?limit=${config.apis.launch_library.default_limit}&mode=${config.apis.launch_library.mode}`;
  try {
    const res = await fetchWithTimeout(llUrl);
    if (res.ok) {
      const data = await res.json();
      llData = data.results || [];
      apiSuccess = true;
      log.info(`Fetched ${llData.length} launches from Launch Library 2`);
    }
  } catch (e) {
    log.warn('Launch Library 2 API error', { error: e.message });
  }

  // 3. Fetch from SpaceX API
  const sxUrl = `${config.apis.spacex.base_url}${config.apis.spacex.upcoming_path}`;
  try {
    const res = await fetchWithTimeout(sxUrl);
    if (res.ok) {
      sxData = await res.json();
      apiSuccess = true;
      log.info(`Fetched ${sxData.length} launches from SpaceX API`);
    }
  } catch (e) {
    log.warn('SpaceX API error', { error: e.message });
  }

  // 4. Fallback to stale cache if both APIs failed
  if (!apiSuccess) {
    log.error('All APIs failed — returning stale cache if available');
    const stale = readCache(cacheFile, Infinity);
    if (stale) return Array.isArray(stale) ? stale : (stale.data || []);
    return [];
  }

  // 5. Normalize SpaceX data to match LL structure
  const sxNormalized = sxData.map(l => ({
    name: l.name,
    net: l.date_utc,
    status: { name: 'Confirmed' },
    pad: {
      name: 'SpaceX Pad',
      location: { name: 'SpaceX Facility', id: 0 },
    },
    image: safeGet(l, 'links.patch.small', null),
  }));

  // 6. Merge — prefer LL data; use SpaceX only if LL is empty
  let allLaunches = llData.length > 0 ? llData : sxNormalized;

  // 7. Filter by configured spaceports
  const { target_ids, target_keywords } = config.spaceports;
  const relevant = allLaunches.filter(l => {
    if (!l.pad || !l.pad.location) return false;
    const locName = (safeGet(l, 'pad.location.name', '')).toLowerCase();
    const locId = safeGet(l, 'pad.location.id', -1);
    return target_ids.includes(locId) || target_keywords.some(k => locName.includes(k));
  });

  // 8. Normalize output
  const output = relevant.slice(0, 5).map(l => ({
    name: l.name,
    status: safeGet(l, 'status.name', 'Unknown'),
    net: l.net,
    pad: safeGet(l, 'pad.name', 'Unknown Pad'),
    location: safeGet(l, 'pad.location.name', 'Unknown Location'),
    image: l.image || null,
  }));

  saveCache(cacheFile, output);
  log.info(`Cached ${output.length} filtered launches`);
  return output;
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

if (require.main === module) {
  getLaunches().then(launches => {
    if (launches.length === 0) {
      console.log('No upcoming launches found (or API error). Try checking SpaceflightNow or SpaceDevs directly.');
    } else {
      console.log('🚀 **Upcoming Launches**\n');
      const { formatDate } = require('./utils');
      launches.forEach(l => {
        console.log(`**${l.name}**`);
        console.log(`📅 ${formatDate(l.net)}`);
        console.log(`📍 ${l.location}`);
        console.log(`Status: ${l.status}\n`);
      });
    }
  });
}

module.exports = { getLaunches };
