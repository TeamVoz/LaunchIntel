const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getLaunches } = require('./launch');

const ALERT_STATE_FILE = path.join(__dirname, '../state/alerts.json');
const CHANNEL_ID = process.env.ALERT_CHANNEL_ID;

function loadAlertState() {
  if (fs.existsSync(ALERT_STATE_FILE)) {
    return JSON.parse(fs.readFileSync(ALERT_STATE_FILE, 'utf8'));
  }
  return {};
}

function saveAlertState(state) {
  if (!fs.existsSync(path.dirname(ALERT_STATE_FILE))) {
      fs.mkdirSync(path.dirname(ALERT_STATE_FILE), { recursive: true });
  }
  fs.writeFileSync(ALERT_STATE_FILE, JSON.stringify(state, null, 2));
}

function sendAlert(msg) {
  console.log(msg); // Always log to stdout
  if (CHANNEL_ID) {
    try {
      // Escape the message for shell command
      const escapedMsg = msg.replace(/"/g, '\\"');
      execSync(`openclaw message send --channel ${CHANNEL_ID} --message "${escapedMsg}"`, { stdio: 'ignore' });
    } catch (e) {
      console.error("Failed to send alert via openclaw CLI:", e.message);
    }
  }
}

async function checkAlerts() {
  const launches = await getLaunches();
  const state = loadAlertState();
  const now = Date.now();
  
  let updates = false;

  for (const launch of launches) {
    if (!launch.net) continue;
    
    const launchTime = new Date(launch.net).getTime();
    const timeDiff = launchTime - now;
    const diffHours = timeDiff / (1000 * 60 * 60);
    const diffMinutes = timeDiff / (1000 * 60);
    
    const launchId = `${launch.name}-${launch.net}`; // Simple ID
    
    if (!state[launchId]) {
      state[launchId] = { sent24h: false, sent4h: false, sent10m: false };
      updates = true;
    }
    
    // 24 Hour Alert (23.5h - 24.5h window)
    if (diffHours <= 24.5 && diffHours >= 23.5 && !state[launchId].sent24h) {
      sendAlert(`⏳ **24 Hours to Launch:** ${launch.name}\n📍 ${launch.location}\n⏰ ${launch.net}`);
      state[launchId].sent24h = true;
      updates = true;
    }
    
    // 1 Hour Alert (instead of 4h, closer to launch)
    if (diffHours <= 1.1 && diffHours >= 0.9 && !state[launchId].sent1h) {
      sendAlert(`⚠️ **1 Hour to Launch:** ${launch.name}\n📍 ${launch.location}`);
      state[launchId].sent1h = true; // Use flexible key
      updates = true;
    }
    
    // 10 Minute Alert (5m - 15m window)
    if (diffMinutes <= 15 && diffMinutes >= 5 && !state[launchId].sent10m) {
      sendAlert(`🚨 **10 Minutes to Launch:** ${launch.name}\n📺 Watch live!`);
      state[launchId].sent10m = true;
      updates = true;
    }
  }

  // Cleanup old launches (> 2 days old)
  for (const id in state) {
    const launchDate = new Date(id.split('-').pop()).getTime();
    if (now - launchDate > 172800000) { // 48h
       delete state[id];
       updates = true;
    }
  }

  if (updates) saveAlertState(state);
}

if (require.main === module) {
  checkAlerts();
}

module.exports = { checkAlerts };
