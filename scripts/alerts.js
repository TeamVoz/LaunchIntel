/**
 * LaunchIntel — Smart Alerts
 *
 * Checks upcoming launches and sends timed notifications at configured
 * intervals before liftoff. Alert state is persisted to prevent
 * duplicate notifications across runs.
 *
 * Notification delivery is platform-agnostic: alerts are always printed
 * to stdout. If ALERT_CHANNEL_ID is set, the script also attempts to
 * deliver via the platform CLI (e.g., openclaw, slack, discord).
 */

const { execSync } = require('child_process');
const { loadConfig } = require('../config');
const { getLaunches } = require('./launch');
const {
  createLogger,
  loadState,
  saveState,
} = require('./utils');

const log = createLogger('alerts');

/**
 * Send an alert message. Always logs to stdout; optionally delivers
 * via a platform CLI when ALERT_CHANNEL_ID is configured.
 * @param {string} msg - Alert message text.
 * @param {string|undefined} channelId - Optional channel ID for delivery.
 */
function sendAlert(msg, channelId) {
  console.log(msg);

  if (channelId) {
    try {
      const escapedMsg = msg.replace(/"/g, '\\"');
      // Platform-agnostic: replace 'openclaw' with your agent's CLI
      const cli = process.env.ALERT_CLI || 'openclaw';
      execSync(`${cli} message send --channel ${channelId} --message "${escapedMsg}"`, { stdio: 'ignore' });
      log.info('Alert delivered via CLI', { channel: channelId });
    } catch (e) {
      log.warn('Failed to send alert via CLI — message was still printed to stdout', { error: e.message });
    }
  }
}

/**
 * Check all upcoming launches against configured alert windows and
 * fire notifications as needed.
 */
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

    const launchTime = new Date(launch.net).getTime();
    const diffMs = launchTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinutes = diffMs / (1000 * 60);

    const launchId = `${launch.name}-${launch.net}`;

    if (!state[launchId]) {
      state[launchId] = {};
      updates = true;
    }

    // Evaluate each configured alert window
    for (const window of config.alerts.windows) {
      if (state[launchId][window.key]) continue; // Already sent

      let inWindow = false;
      if (window.min_hours != null && window.max_hours != null) {
        inWindow = diffHours >= window.min_hours && diffHours <= window.max_hours;
      } else if (window.min_minutes != null && window.max_minutes != null) {
        inWindow = diffMinutes >= window.min_minutes && diffMinutes <= window.max_minutes;
      }

      if (inWindow) {
        const detail = window.name === '10m'
          ? '📺 Watch live!'
          : `📍 ${launch.location}\n⏰ ${launch.net}`;
        sendAlert(`${window.emoji} **${window.label}:** ${launch.name}\n${detail}`, channelId);
        state[launchId][window.key] = true;
        updates = true;
      }
    }
  }

  // Cleanup old launches (> configured TTL, default 48 h)
  const cleanupTtl = config.defaults.alert_cleanup_ttl_ms;
  for (const id in state) {
    const parts = id.split('-');
    const dateStr = parts[parts.length - 1];
    const launchDate = new Date(dateStr).getTime();
    if (!isNaN(launchDate) && now - launchDate > cleanupTtl) {
      delete state[id];
      updates = true;
    }
  }

  if (updates) {
    saveState(stateFile, state);
    log.info('Alert state updated');
  }
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

if (require.main === module) {
  checkAlerts();
}

module.exports = { checkAlerts };
