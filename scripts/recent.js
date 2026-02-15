let apiUrl = process.env.LL_API_URL || "https://ll.thespacedevs.com/2.2.0/launch/previous/";
if (apiUrl.includes('upcoming')) {
  apiUrl = apiUrl.replace('upcoming', 'previous');
}
const LL_API_URL = apiUrl;

async function getRecentLaunches(days = 30) {
  try {
    const startDate = new Date(Date.now() - days * 86400000).toISOString();
    const url = `${LL_API_URL}?window_start=${startDate}&limit=10&mode=list`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    
    const data = await response.json();
    return (data.results || []).map(l => ({
      name: l.name,
      status: l.status ? l.status.name : "Unknown",
      net: l.net,
      location: l.pad && l.pad.location ? l.pad.location.name : "Unknown Location",
      mission: l.mission ? l.mission.description : "No mission description."
    }));
  } catch (error) {
    console.error("Error fetching recent launches:", error);
    // Fallback hint
    return [];
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const days = parseInt(args[0]) || 30;
  
  getRecentLaunches(days).then(launches => {
    if (launches.length === 0) {
      console.log(`No recent launches found (or API error). Try checking SpaceflightNow or SpaceDevs directly.`);
    } else {
      console.log(`🚀 **Launches (Last ${days} Days)**\n`);
      launches.forEach(l => {
        const date = new Date(l.net).toLocaleDateString();
        const icon = (l.status.toLowerCase().includes('success') || l.status.toLowerCase().includes('go')) ? '✅' : '❌';
        console.log(`${icon} **${l.name}**\n📅 ${date}\n📍 ${l.location}\nStatus: ${l.status}\n`);
      });
    }
  });
}

module.exports = { getRecentLaunches };
