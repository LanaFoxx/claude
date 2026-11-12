// Sets up the "What's new in AI" feed data: the "AI Updates" category and, with "samples",
// placeholder posts so the homepage list has something to show until the news app posts real ones.
//   WP_URL=... STATE=playwright-state.json PREP=prep.json node news-seed.cjs [samples]
//
// How the news app posts an update (WordPress REST API, application password auth):
//   POST /wp-json/wp/v2/posts
//   { "title": "<headline>", "status": "publish", "categories": [<AI Updates id>], "featured_media": <vendor logo media id> }
// The homepage Loop Grid shows the newest posts in that category: the featured image is the vendor
// logo, the title is the headline. Upload each vendor logo to the Media Library once and reuse its id.
const { chromium } = require('playwright');
const fs = require('fs');

const SITE = process.env.WP_URL || 'https://staging154.dreamweb.digital';
const CATEGORY = { name: 'AI Updates', slug: 'ai-updates' };
// Placeholder headlines (no real news): [logo file, headline]. Oldest first, so the first row is newest.
const SAMPLES = [
  ['recco-news-logo-openai.webp', 'Sample headline: the latest release summarized in one line by the news engine.'],
  ['recco-news-logo-microsoft.webp', 'Sample headline: Copilot developments summarized for decision makers.'],
  ['recco-news-logo-servicenow.webp', 'Sample headline: what changed in the latest release and who should pay attention.'],
  ['recco-news-logo-salesforce.webp', 'Sample headline: the most relevant platform update for CRM and service teams.'],
  ['recco-news-logo-anthropic.webp', 'Sample headline: one sentence on what shipped and why it matters to enterprise buyers.'],
];

(async () => {
  const prep = JSON.parse(fs.readFileSync(process.env.PREP, 'utf8'));
  const b = await chromium.launch();
  const p = await (await b.newContext({ storageState: process.env.STATE })).newPage();
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const api = (route, opts = {}) => p.evaluate(async ([route, opts]) => {
    const nonce = await (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce')).text();
    const r = await fetch('/wp-json' + route, { method: opts.method || 'GET', headers: { 'X-WP-Nonce': nonce, 'Content-Type': 'application/json' }, body: opts.data ? JSON.stringify(opts.data) : undefined });
    return r.json();
  }, [route, opts]);

  let cat = (await api(`/wp/v2/categories?slug=${CATEGORY.slug}`))[0];
  if (!cat) cat = await api('/wp/v2/categories', { method: 'POST', data: CATEGORY });
  console.log('category', cat.id);

  if (process.argv.includes('samples')) {
    const existing = await api(`/wp/v2/posts?categories=${cat.id}&per_page=100&status=publish,draft&_fields=id`);
    if (existing.length) console.log('category already has', existing.length, 'posts; samples not added');
    else {
      const now = Date.now();
      for (const [i, [logo, title]] of SAMPLES.entries()) {
        const media = prep.media[logo];
        if (!media) throw new Error(`Missing media ${logo}`);
        const date = new Date(now - (SAMPLES.length - i) * 60000).toISOString().slice(0, 19);
        const post = await api('/wp/v2/posts', { method: 'POST', data: { title, status: 'publish', categories: [cat.id], featured_media: media.id, date } });
        console.log('sample post', post.id, logo);
      }
    }
  }
  prep.news = { categoryId: cat.id };
  fs.writeFileSync(process.env.PREP, JSON.stringify(prep, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
