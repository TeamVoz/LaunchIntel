---
name: launchintel
description: Space hobbyist toolkit: real-time launch tracker, space stocks, news, and alerts.
triggers:
  - starship
  - spacex
  - launches
  - missions
commands:
  /launch: node scripts/launch.js
  /spacestocks: node scripts/spacestocks.js
  /spacenews: node scripts/spacenews.js
  /recent: node scripts/recent.js
cron:
  "0 8 * * *": node scripts/spacenews.js
  "0 */4 * * *": node scripts/alerts.js
  "*/10 * * * *": node scripts/alerts.js
config:
  STOCK_SYMBOLS: "RKLB,SPCE,BA,LMT,ASTR"
  ALERT_CHANNEL_ID: ""
  LL_API_URL: "https://ll.thespacedevs.com/2.2.0/launch/upcoming/"
  NEWS_API_URL: "https://api.spaceflightnewsapi.net/v4/articles/"
---

# LaunchIntel Skill

Tracks space launches, stocks, and news for the space enthusiast.

## Setup
1.  Set `ALERT_CHANNEL_ID` in config if you want alerts pushed to a specific channel.
2.  (Optional) Add more stock symbols to `STOCK_SYMBOLS`.
3.  Ensure `node` is available in your PATH.

## Features
-   `/launch` - Shows upcoming launches (next 5). Filters for FL/TX/CA/VA.
-   `/spacestocks` - Shows space stock prices (Yahoo Finance scrape).
-   `/spacenews` - Shows latest spaceflight news.
-   `/recent [days]` - Shows recent launches (default 30 days).
-   **Alerts**: Notifies you of launches 24h, 4h, and 10min out (requires cron setup).
