const fs = require('fs');
const path = require('path');
const { getLaunches } = require('./launch');

const ALERT_STATE_FILE = path.join(__dirname, '../state/alerts.json');

function loadAlertState() {
  if (fs.existsSync(ALERT_STATE_FILE)) {
    return JSON.parse(fs.readFileSync(ALERT_STATE_FILE, 'utf8'));
  }
  return {};
}

function saveAlertState(state) {
  fs.writeFileSync(ALERT_STATE_FILE, JSON.stringify(state, null, 2));
}

async function checkAlerts() {
  const launches = await getLaunches();
  const state = loadAlertState();
  const now = Date.now();
  const alertsToSend = [];

  for (const launch of launches) {
    if (!launch.net) continue;
    
    const launchTime = new Date(launch.net).getTime();
    const timeDiff = launchTime - now;
    const diffHours = timeDiff / (1000 * 60 * 60);
    const diffMinutes = timeDiff / (1000 * 60);
    
    // Create a unique ID for the launch (using name + date as ID if real ID missing)
    const launchId = `${launch.name}-${launch.net}`;
    
    if (!state[launchId]) {
      state[launchId] = { sent24h: false, sent4h: false, sent10m: false };
    }
    
    // 24 Hour Alert (23h to 25h window)
    if (diffHours <= 25 && diffHours >= 23 && !state[launchId].sent24h) {
      alertsToSend.push(`⏳ **24 Hours to Launch:** ${launch.name}\n📍 ${launch.location}\n⏰ ${launch.net}`);
      state[launchId].sent24h = true;
    }
    
    // 4 Hour Alert (3.5h to 4.5h window)
    if (diffHours <= 4.5 && diffHours >= 3.5 && !state[launchId].sent4h) {
      alertsToSend.push(`⚠️ **4 Hours to Launch:** ${launch.name}\n📍 ${launch.location}`);
      state[launchId].sent4h = true;
    }
    
    // 10 Minute Alert (5m to 15m window)
    if (diffMinutes <= 15 && diffMinutes >= 5 && !state[launchId].sent10m) {
      alertsToSend.push(`🚨 **10 Minutes to Launch:** ${launch.name}\n📺 Watch live!`);
      state[launchId].sent10m = true;
    }
  }

  // Cleanup old launches from state
  for (const id in state) {
    // Basic cleanup: if ID not in current list (limit 5) and time passed...
    // Actually, safer to keep for a bit. Let's just save.
  }

  saveAlertState(state);

  if (alertsToSend.length > 0) {
    console.log(alertsToSend.join('\n\n'));
  }
}

if (require.main === module) {
  checkAlerts();
}

module.exports = { checkAlerts };
