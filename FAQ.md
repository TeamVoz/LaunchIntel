# LaunchIntel FAQ

### Q: What is the difference between the "Modular Skill" and "Portable Prompt"?

**A:** They are two ways to use the same tool. The **Modular Skill** (using `skill.json`) is for AI agent platforms that can read and understand a structured project. It allows the agent to know everything about the skill—its commands, files, and configuration—before running it. The **Portable Prompt** (`launchintel_prompt.md`) is a single file containing all the code and instructions, which you can copy-paste into any AI chat that can execute code. It’s for quick, easy use without a complex setup.

### Q: Why are no launches appearing when I run the `/launch` command?

**A:** This can happen for a few reasons:
1.  **API Outage**: The primary (Launch Library 2) and secondary (SpaceX) APIs may be temporarily unavailable. The skill is designed to use a local cache (`state/launches.json`) to survive short outages, but if the cache is old and the APIs are down, no data will be available.
2.  **Filtering**: The skill is configured in `config/config.json` to only show launches from specific US spaceports. If there are no upcoming launches from those locations, the list will be empty.
3.  **Network Issues**: Ensure the machine running the agent has a stable internet connection.

### Q: How do I change the stock symbols tracked by `/spacestocks`?

**A:** You can change the stock symbols in two ways:
1.  **Environment Variable (Recommended)**: Set the `STOCK_SYMBOLS` environment variable to a comma-separated list of tickers. This method is flexible and doesn't require editing files. For example: `export STOCK_SYMBOLS="RKLB,SPCE,BA,LMT,NOC"`.
2.  **Configuration File**: Directly edit the `defaults.stock_symbols` array in the `config/config.json` file.

### Q: Automated alerts are not being sent. What should I check?

**A:** For alerts to function correctly, you must:
1.  **Set `ALERT_CHANNEL_ID`**: This environment variable must be set to the specific ID of the channel, user, or webhook where you want to receive messages.
2.  **Configure `ALERT_CLI`**: By default, the skill uses an `openclaw` command-line tool. If you use a different platform (like Slack or Discord), you may need to set the `ALERT_CLI` environment variable to the correct command (e.g., `slack`, `discord`).
3.  **Cron/Scheduler Setup**: Ensure your cron job is configured correctly and has the necessary permissions to execute the `node scripts/alerts.js` script.
4.  **Check Logs**: The script prints all alerts to the console (stdout) regardless of whether the CLI tool works. Check the output of your cron job to see if the alerts are being generated.

### Q: Can I add a new API as a data source?

**A:** Yes. The new modular structure makes this easier. You would need to:
1.  Add the new API's URL and details to `config/config.json`.
2.  Create a new function in `scripts/utils.js` or directly in the relevant script (e.g., `scripts/launch.js`) to fetch and normalize data from the new source.
3.  Integrate the new data into the existing fallback chain (e.g., try API 1, then API 2, then the new API 3, then cache).

### Q: What do the different log levels (`DEBUG`, `INFO`, `WARN`, `ERROR`) mean?

**A:** The logs provide insight into the skill's operations.
-   `INFO`: Default level. Shows high-level actions, like successfully fetching data or writing to cache.
-   `WARN`: Indicates a non-critical issue, such as one of the APIs failing while another succeeded.
-   `ERROR`: A critical failure, such as all APIs being down and no cache being available.
-   `DEBUG`: Highly verbose. Shows every step of the process, which is useful for development and troubleshooting.

Set the `LOG_LEVEL` environment variable to `DEBUG` to get the most detailed output.
