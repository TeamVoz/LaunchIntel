# LaunchIntel FAQ

### Q: Why isn't the skill showing any launches?
**A:** This can happen if the API is down or rate-limited.
1. Check your internet connection.
2. Verify if `ll.thespacedevs.com` is reachable.
3. The skill includes a fallback to SpaceX API, so it should at least show upcoming Starlink missions. If both fail, check the logs in `/root/.openclaw/workspace/skills/launchintel/state/logs`.

### Q: Why are alerts not sending?
**A:** Make sure you have set the `ALERT_CHANNEL_ID` environment variable. The skill uses `openclaw message send` internally. If run via cron, ensure the user running the cron job has access to the `openclaw` command.

### Q: Can I change the stock symbols?
**A:** Yes! Edit `.env` or export the `STOCK_SYMBOLS` environment variable with a comma-separated list (e.g., `STOCK_SYMBOLS=TSLA,SPCE,BA`).

### Q: What time zone are launches displayed in?
**A:** All times are displayed in the local time zone of your agent/server. However, the `canvas` countdown is based on UTC and adjusts to your browser's local time automatically.

### Q: Does this work with other space APIs?
**A:** Currently, it supports Launch Library 2 (LL2) and SpaceX v5. Other APIs like RocketLaunch.Live or SpaceflightNow are considered for future updates.

### Q: Can I customize the canvas background?
**A:** Yes, replace the image URL in `assets/template.html` or modify `scripts/canvas.js` to accept a custom image URL.
