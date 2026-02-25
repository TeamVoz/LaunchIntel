/**
 * LaunchIntel — Space News
 *
 * Fetches the latest space news articles from the Spaceflight News API
 * and formats them for display. Includes a graceful fallback when the
 * API is unavailable.
 */

const { loadConfig } = require('../config');
const {
  createLogger,
  fetchWithTimeout,
  formatShortDate,
} = require('./utils');

const log = createLogger('spacenews');

/**
 * Fetch the latest space news articles.
 * @returns {Promise<Array>} Array of article objects.
 */
async function getNews() {
  const config = loadConfig();
  const url = `${config.apis.spaceflight_news.base_url}?limit=${config.apis.spaceflight_news.default_limit}`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);

    const data = await res.json();
    log.info(`Fetched ${data.results.length} news articles`);

    return data.results.map(article => ({
      title: article.title,
      url: article.url,
      site: article.news_site,
      summary: article.summary,
      published: formatShortDate(article.published_at),
    }));
  } catch (e) {
    log.error('Error fetching news', { error: e.message });

    // Graceful fallback — return a helpful placeholder
    return [{
      title: 'Latest Space News (API Unavailable)',
      url: 'https://spacenews.com/',
      site: 'SpaceNews',
      summary: 'Unable to fetch live news. Click to read directly.',
      published: formatShortDate(new Date().toISOString()),
    }];
  }
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

if (require.main === module) {
  getNews().then(articles => {
    console.log('📰 **Space News**\n');
    articles.forEach(a => {
      console.log(`**${a.title}** (${a.site})`);
      console.log(`${a.summary}`);
      console.log(`[Read more](${a.url})\n`);
    });
  });
}

module.exports = { getNews };
