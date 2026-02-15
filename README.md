# LaunchIntel 🚀

**The ultimate space hobbyist toolkit for OpenClaw agents.**

LaunchIntel provides real-time tracking for rocket launches, space industry stocks, and latest news, all from your agent's command line.

![LaunchIntel Banner](assets/launchintel-logo.jpg)

## Features

- **🚀 Launch Tracker**: Monitor upcoming launches from key spaceports (Kennedy Space Center, Cape Canaveral, Vandenberg, Wallops, Starbase).
- **📈 Space Stocks**: Live price tracking for major space companies (Rocket Lab, Virgin Galactic, Boeing, Lockheed Martin, etc.).
- **📰 Space News**: Daily digest of the latest headlines from Spaceflight Now and other sources.
- **🚨 Smart Alerts**: Automated notifications at 24h, 1h, and 10min before liftoff.
- **🎨 Canvas UI**: Visual countdown timer for the next big launch.

## Installation

1.  **Clone the skill:**
    ```bash
    cd /root/.openclaw/workspace/skills
    git clone https://github.com/yourusername/launchintel.git
    cd launchintel
    ```

2.  **Install Dependencies:**
    This skill requires Node.js (v18+ recommended). No external npm packages are required; it uses standard libraries and native `fetch`.

3.  **Configure Environment:**
    Create a `.env` file in the root of the skill (or set these in your agent's environment):

    ```ini
    # Optional: Custom Launch Library API URL (default provided)
    LL_API_URL=https://ll.thespacedevs.com/2.2.0/launch/upcoming/

    # Optional: Alert Channel ID (for Telegram/Discord notifications)
    ALERT_CHANNEL_ID=your_channel_id_here

    # Optional: Stock Symbols (comma-separated)
    STOCK_SYMBOLS=RKLB,SPCE,BA,LMT,NOC
    ```

## Usage

### Commands

- **/launch**: List upcoming launches.
- **/spacestocks**: Show current stock prices and daily change.
- **/spacenews**: Fetch latest space news headlines.
- **/launch_canvas**: Display a visual countdown for the next launch.

### Automated Alerts (Cron)

To enable automatic alerts, add the following to your agent's crontab or scheduler:

```cron
# Check for launch alerts every 10 minutes
*/10 * * * * node /path/to/skills/launchintel/scripts/alerts.js

# Fetch daily news at 8 AM
0 8 * * * node /path/to/skills/launchintel/scripts/spacenews.js
```

## APIs Used

- **The Space Devs (Launch Library 2)**: Primary source for global launch data.
- **SpaceX API v5**: Fallback and detailed SpaceX mission data.
- **Yahoo Finance**: Real-time stock quotes.
- **Spaceflight News API (SNAPI)**: News aggregation.

## Screenshots

| Launch List | Stock Ticker | Visual Canvas |
|-------------|--------------|---------------|
| ![Launch List](assets/screenshots/launch_list.png) | ![Stocks](assets/screenshots/stocks.png) | ![Canvas](assets/screenshots/canvas.png) |

## Contributing

Pull requests are welcome! Please ensure any new features include proper error handling and API fallbacks.

## License

MIT
