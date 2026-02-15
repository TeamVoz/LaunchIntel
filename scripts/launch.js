const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../state/launches.json');
const LL_API_URL = process.env.LL_API_URL || "https://ll.thespacedevs.com/2.2.0/launch/upcoming/";
// Locations: Cape Canaveral (12), KSC (27), Vandenberg (11), Wallops (21), Boca Chica (143)
const TARGET_LOCATIONS = [12, 27, 11, 21, 143]; 

async function getLaunches() {
  try {
    // Check cache first (TTL 1 hour)
    if (fs.existsSync(STATE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (Date.now() - cache.timestamp < 3600000) {
        return cache.data;
      }
    }

    const response = await fetch(`${LL_API_URL}?limit=10&mode=list`);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    
    const data = await response.json();
    const launches = data.results || [];

    // Filter for our target locations
    const relevantLaunches = launches.filter(l => {
      if (!l.pad || !l.pad.location) return false;
      // LL uses location IDs, but in list mode we might just get names.
      // Checking names for robustness.
      const locName = (l.pad.location.name || "").toLowerCase();
      const locId = l.pad.location.id;
      
      return TARGET_LOCATIONS.includes(locId) || 
             locName.includes("canaveral") || 
             locName.includes("kennedy") || 
             locName.includes("vandenberg") || 
             locName.includes("wallops") || 
             locName.includes("boca chica") ||
             locName.includes("starbase");
    });

    const output = relevantLaunches.slice(0, 5).map(l => ({
      name: l.name,
      status: l.status ? l.status.name : "Unknown",
      net: l.net,
      pad: l.pad ? l.pad.name : "Unknown Pad",
      location: l.pad && l.pad.location ? l.pad.location.name : "Unknown Location",
      mission: l.mission ? l.mission.description : "No mission description.",
      image: l.image || null
    }));

    // Update cache
    fs.writeFileSync(STATE_FILE, JSON.stringify({ timestamp: Date.now(), data: output }, null, 2));
    
    return output;
  } catch (error) {
    console.error("Error fetching launches:", error);
    return [];
  }
}

// Main execution block if run directly
if (require.main === module) {
  getLaunches().then(launches => {
    if (launches.length === 0) {
      console.log("No upcoming launches found for FL/TX/CA/VA.");
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
