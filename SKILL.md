---
name: launchintel
description: "Space hobbyist toolkit: real-time launch tracker (NASA/TheSpaceDev FL/TX/CA), space stocks ticker, news/events/30-day recs, Telegram/cron alerts (24h/1h/10min). Triggers: Starship/SpaceX/launches/missions/space force."
---
# LaunchIntel Skill

Tracks space launches, stocks, news/alerts.

## Setup
- node required.
- ALERT_CHANNEL_ID optional (for automated alerts).
- STOCK_SYMBOLS: RKLB,SPCE,BA,LMT,NOC (configurable via env).

## Commands
- `/launch`: Upcoming launches (FL/TX/CA/SF).
- `/spacestocks`: Live prices & daily change.
- `/spacenews`: Latest news headlines.
- `/recent`: 30-day launch recs.
- `/launch_canvas`: Visual countdown for next launch.

## Cron
- 8AM: `node scripts/spacenews.js` (news digest).
- 10min: `node scripts/alerts.js` (launch alerts).

## Resources
- assets/launchintel-logo.jpg
- scripts/launch.js (LL2 / SpaceX v5 fallback).
- scripts/spacestocks.js (Yahoo / Web Search fallback).
- scripts/spacenews.js (SFN API / Web Search fallback).
- scripts/alerts.js (24h/1h/10min notifications).
- scripts/canvas.js (Generate countdown UI).
- state/ (cache & logs).
