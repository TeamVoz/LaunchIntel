const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_FILE = path.join(__dirname, '../state/launches.json');
// APIs
const LL_API_URL = process.env.LL_API_URL || "https://ll.thespacedevs.com/2.2.0/launch/upcoming/";
const SPACEX_API_URL = "https://api.spacexdata.com/v5/launches/upcoming";

// Locations of interest (IDs for LL)
// 12=Cape Canaveral, 27=KSC, 11=Vandenberg, 21=Wallops, 143=Starbase/Boca Chica
const TARGET_IDS = [12, 27, 11, 21, 143]; 
const TARGET_KEYWORDS = ["canaveral", "kennedy", "vandenberg", "wallops", "boca chica", "starbase"];

function readCache() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const cache = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // Valid for 1 hour
      if (Date.now() - cache.timestamp < 3600000) {
        return cache.data;
      }
      return { data: cache.data, expired: true };
    } catch (e) { return null; }
  }
  return null;
}

function saveCache(data) {
  if (!fs.existsSync(path.dirname(STATE_FILE))) {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify({ timestamp: Date.now(), data }, null, 2));
}

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function getLaunchesFromWeb() {
  // Fallback: Use web_search via exec (since we are inside a node script, we can't call agent tools directly easily 
  // without a bridge, but we can simulate or print a message for the agent to do it. 
  // However, for a standalone skill, we might just return a "Data unavailable" message 
  // or try to parse a public page if possible.
  // Given the constraints, we will return a special flag or partial data from cache if available.
  console.error("⚠️ APIs failed. Returning cached data if available.");
  const cache = readCache();
  if (cache && cache.data) return cache.data;
  return [];
}

async function getLaunches() {
  // 1. Try Cache first
  const cache = readCache();
  if (cache && !cache.expired) return cache.data;

  let llData = [], sxData = [];
  let apiSuccess = false;

  // 2. Fetch from LL
  try {
    const res = await fetchWithTimeout(`${LL_API_URL}?limit=20&mode=list`);
    if (res.ok) {
      const data = await res.json();
      llData = data.results || [];
      apiSuccess = true;
    }
  } catch (e) {
    console.error("LL API Error:", e.message);
  }

  // 3. Fetch from SpaceX
  try {
    const res = await fetchWithTimeout(SPACEX_API_URL);
    if (res.ok) {
      sxData = await res.json();
      apiSuccess = true;
    }
  } catch (e) {
    console.error("SpaceX API Error:", e.message);
  }

  // 4. Fallback if both failed
  if (!apiSuccess) {
    console.error("⚠️ APIs failed. Returning cached data if available.");
    const cache = readCache();
    if (cache && cache.data) return cache.data;
    return [];
  }

  // 5. Merge and Filter
  // Normalize SpaceX data to match LL structure roughly
  const sxNormalized = sxData.map(l => ({
    name: l.name,
    net: l.date_utc,
    status: { name: "Confirmed" },
    pad: { 
      name: "SpaceX Pad", 
      location: { name: "SpaceX Facility", id: 0 } // Placeholder
    },
    image: l.links.patch.small
  }));
  
  // Combine, prioritizing LL for details if possible, but for simplicity just append unique ones based on name/date?
  // Actually, LL covers SpaceX well. Let's just use LL primarily and fallback to SX only if LL fails or is empty.
  let allLaunches = llData;
  if (llData.length === 0 && sxData.length > 0) {
     allLaunches = sxNormalized;
  }

  const relevant = allLaunches.filter(l => {
    // Filter logic
    if (!l.pad || !l.pad.location) return false;
    const locName = (l.pad.location.name || "").toLowerCase();
    const locId = l.pad.location.id;
    return TARGET_IDS.includes(locId) || TARGET_KEYWORDS.some(k => locName.includes(k));
  });

  const output = relevant.slice(0, 5).map(l => ({
    name: l.name,
    status: l.status ? l.status.name : "Unknown",
    net: l.net,
    pad: l.pad ? l.pad.name : "Unknown Pad",
    location: l.pad && l.pad.location ? l.pad.location.name : "Unknown Location",
    image: l.image || null
  }));

  saveCache(output);
  return output;
}

if (require.main === module) {
  getLaunches().then(launches => {
    if (launches.length === 0) {
      console.log("No upcoming launches found (or API error).");
    } else {
      console.log("🚀 **Upcoming Launches**\n");
      launches.forEach(l => {
        const date = new Date(l.net).toLocaleString();
        console.log(`**${l.name}**\n📅 ${date}\n📍 ${l.location}\nStatus: ${l.status}\n`);
      });
    }
  });
}

module.exports = { getLaunches };
