# LaunchIntel v3 🚀

**An advanced, agent-optimized toolkit for real-time space intelligence.**

LaunchIntel provides a suite of commands for monitoring rocket launches, tracking space industry stocks, aggregating news, and receiving automated alerts. Version 3 has been completely re-architected for robustness, portability, and ease of integration with any modern AI agent platform.

![LaunchIntel Banner](assets/launchintel-logo.jpg)

---

## Core Features

- **🚀 Launch Tracker**: Monitor upcoming and recent launches from key global spaceports, with data sourced from Launch Library 2 and the SpaceX API.
- **📈 Space Stocks**: Live price tracking for a configurable portfolio of space industry companies via Yahoo Finance.
- **📰 Space News**: A real-time digest of the latest headlines from the Spaceflight News API.
- **🚨 Smart Alerts**: A cron-ready script that provides automated, timed notifications for upcoming launches (24h, 1h, 10m before liftoff).
- **🎨 Canvas UI**: Generate a stunning, self-contained HTML visual countdown page for the next major launch.

## Architecture: Dual-Approach for Maximum Flexibility

LaunchIntel v3 is designed with two primary use cases in mind, offering a unique dual architecture that separates the skill's definition from its implementation.

| Approach | File | Description |
| :--- | :--- | :--- |
| **Modular Skill** | `skill.json` | The primary, agent-agnostic manifest. It defines the skill's commands, schemas, configuration, and file structure. This is the recommended approach for deep integration with sophisticated agent platforms that can parse and execute structured manifests. |
| **Portable Prompt** | `launchintel_prompt.md` | A single, self-contained Markdown file that includes all instructions, commands, and full source code. This allows for maximum portability and can be dropped into any AI system that can read a prompt and execute code, without needing to parse a complex file structure. |

This dual approach ensures that LaunchIntel can be used by both advanced agent ecosystems and simpler LLM environments with minimal setup.

## Quick Start: Portable Prompt Method

For the fastest deployment, you can provide the contents of `launchintel_prompt.md` directly to your AI agent.

1.  **Provide the Prompt**: Copy the full content of `launchintel_prompt.md` into your agent's context or prompt window.
2.  **Execute**: The agent will have all the necessary information, including file contents and commands, to execute the skill's functions as if the files were on its local system.

## Detailed Setup: Modular Skill Method

For a more permanent and structured installation, clone the repository and use the `skill.json` manifest.

### 1. Installation

```bash
# Clone the repository into your agent's skill directory
cd /path/to/your/agent/skills
git clone https://github.com/TeamVoz/LaunchIntel.git
cd LaunchIntel
```

This skill requires **Node.js (v18+ recommended)**. It uses only native Node libraries and has no external `npm` dependencies, simplifying installation.

### 2. Configuration

Configuration is managed through `config/config.json` and can be dynamically overridden with environment variables for flexibility.

**Primary Environment Variables:**

-   `STOCK_SYMBOLS`: A comma-separated list of stock tickers to monitor (e.g., `RKLB,SPCE,BA`).
-   `ALERT_CHANNEL_ID`: The specific channel, user, or webhook ID for delivering automated alerts.
-   `ALERT_CLI`: The command-line tool to use for sending messages (e.g., `openclaw`, `slack`, `discord`). Defaults to `openclaw`.
-   `LOG_LEVEL`: Set logging verbosity. Options: `DEBUG`, `INFO`, `WARN`, `ERROR` (default is `INFO`).

### 3. Command Usage

Once installed, the agent can execute the skill's functions using the commands defined in `skill.json`.

| Command | Description |
| :--- | :--- |
| `/launch` | List upcoming rocket launches. |
| `/recent [days]` | Show launches from the past N days (default: 30). |
| `/spacestocks` | Fetch real-time stock prices. |
| `/spacenews` | Fetch the latest space news headlines. |
| `/launch_canvas` | Generate a visual HTML countdown page. |

### 4. Automated Alerts (Cron)

To enable automated alerts, add the `alerts` command to your system's scheduler (like `cron`).

```cron
# Check for launch alerts every 10 minutes
*/10 * * * * /usr/bin/node /path/to/LaunchIntel/scripts/alerts.js

# Fetch a daily news digest at 8 AM
0 8 * * * /usr/bin/node /path/to/LaunchIntel/scripts/spacenews.js
```

## Contributing

Pull requests are welcome. Please adhere to the existing coding style, which emphasizes clarity, modularity, and robust error handling. Ensure any new features are reflected in both the `skill.json` manifest and the `launchintel_prompt.md` portable prompt.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
