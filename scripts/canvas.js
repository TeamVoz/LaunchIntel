const fs = require('fs');
const path = require('path');
const { getLaunches } = require('./launch');

const TEMPLATE_FILE = path.join(__dirname, '../assets/template.html');
const OUTPUT_FILE = path.join(__dirname, '../state/canvas.html');

async function generateCanvas() {
  const launches = await getLaunches();
  if (launches.length === 0) {
    console.log("No launches available for canvas.");
    return;
  }

  const nextLaunch = launches[0]; // Nearest launch
  
  let html = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  
  const launchData = {
    name: nextLaunch.name,
    mission: nextLaunch.mission || "Unknown Mission",
    net: nextLaunch.net,
    location: nextLaunch.location,
    status: nextLaunch.status,
    image: nextLaunch.image
  };

  const scriptInjection = `window.LAUNCH_DATA = ${JSON.stringify(launchData)};`;
  
  // Replace the placeholder or inject at the beginning of script
  html = html.replace('// Data injected here', scriptInjection);
  
  // Ensure output directory exists
  if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
      fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Canvas generated at: ${OUTPUT_FILE}`);
}

if (require.main === module) {
  generateCanvas();
}

module.exports = { generateCanvas };
