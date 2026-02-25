/**
 * LaunchIntel — Canvas UI Generator
 *
 * Generates an HTML visual countdown page for the next upcoming launch
 * by injecting live data into the HTML template.
 */

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../config');
const { getLaunches } = require('./launch');
const { createLogger } = require('./utils');

const log = createLogger('canvas');

/**
 * Generate the visual countdown HTML file.
 */
async function generateCanvas() {
  const config = loadConfig();
  const templateFile = config.paths.canvas_template;
  const outputFile = config.paths.canvas_output;

  const launches = await getLaunches();
  if (launches.length === 0) {
    log.warn('No launches available for canvas generation');
    console.log('No launches available for canvas.');
    return;
  }

  const nextLaunch = launches[0];

  let html = fs.readFileSync(templateFile, 'utf8');

  const launchData = {
    name: nextLaunch.name,
    mission: nextLaunch.mission || 'Unknown Mission',
    net: nextLaunch.net,
    location: nextLaunch.location,
    status: nextLaunch.status,
    image: nextLaunch.image,
  };

  const scriptInjection = `window.LAUNCH_DATA = ${JSON.stringify(launchData)};`;
  html = html.replace('// Data injected here', scriptInjection);

  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, html);
  log.info(`Canvas generated at: ${outputFile}`);
  console.log(`Canvas generated at: ${outputFile}`);
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

if (require.main === module) {
  generateCanvas();
}

module.exports = { generateCanvas };
