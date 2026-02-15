const NEWS_URL = "https://api.spaceflightnewsapi.net/v4/articles/?limit=5";

async function getNews() {
  try {
    const res = await fetch(NEWS_URL);
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    
    const data = await res.json();
    return data.results.map(article => ({
      title: article.title,
      url: article.url,
      site: article.news_site,
      summary: article.summary,
      published: new Date(article.published_at).toLocaleDateString()
    }));
  } catch (e) {
    console.error("Error fetching news:", e);
    return [];
  }
}

if (require.main === module) {
  getNews().then(articles => {
    console.log("📰 **Space News**\n");
    articles.forEach(a => {
      console.log(`**${a.title}** (${a.site})`);
      console.log(`${a.summary}\n[Read more](${a.url})\n`);
    });
  });
}

module.exports = { getNews };
