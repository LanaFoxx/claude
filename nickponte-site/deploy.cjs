// Deploys the Coastal Light PREVIEW to nickponterealty.com. It never edits existing pages, the
// front-page setting or the live header/footer. It only:
//   1. uploads/updates the "Nick Ponte Coastal Light (preview)" plugin and activates it
//   2. uploads the npc-* images to the Media Library (skips ones already there)
//   3. creates/updates the page /home-preview/ (template "Coastal Light – Home (preview)") and the
//      review hub /design-preview/ that links every preview for the client
//   4. creates/updates the 12 Town posts at /town-preview/<town>/
// Usage: WPU=... WPP=... node deploy.cjs [plugin] [media] [home] [review] [guides] [towns] [--reseed]
// No step args = all steps. Existing towns keep the owner's edits unless --reseed is passed.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE = process.env.WP_URL || 'https://nickponterealty.com';
const args = process.argv.slice(2);
const steps = args.filter((a) => !a.startsWith('--'));
const want = (s) => steps.length === 0 || steps.includes(s);
const RESEED = args.includes('--reseed');
const MEDIA = ['npc-rye-coast.jpg', 'npc-portsmouth.jpg', 'npc-hampton-beach.jpg', 'npc-nick-ponte.jpg', 'npc-387-ocean.jpg', 'npc-logo-black.png', 'npc-logo-white.png',
  // Photos Nick supplied in the Markup.io review (Nov 2026)
  'npc-hero-hampton.jpg', 'npc-contact-seawall.jpg', 'npc-quote-rye.jpg', 'npc-exeter-downtown.jpg', 'npc-estate-dusk.jpg',
  'npc-logo-navy.png', 'npc-logo-reversed.png', 'npc-buyer-hero.jpg', 'npc-seller-hero.jpg'];
const ALT = {
  'npc-rye-coast': 'The Rye, NH coastline from above', 'npc-portsmouth': 'Portsmouth, NH South End harbor at sunset',
  'npc-hampton-beach': 'Hampton Beach, NH from above', 'npc-nick-ponte': 'Nick Ponte, Managing Broker',
  'npc-387-ocean': 'Rendering of 387 Ocean, Hampton', 'npc-logo-black': 'Nick Ponte Realty', 'npc-logo-white': 'Nick Ponte Realty',
  'npc-hero-hampton': 'Hampton Beach, NH from above', 'npc-contact-seawall': 'Oceanfront homes along the seawall on the NH Seacoast',
  'npc-quote-rye': 'The Rye, NH coast from above', 'npc-exeter-downtown': 'Downtown Exeter, NH and the bandstand from above',
  'npc-estate-dusk': 'Oceanfront home on the Seacoast at dusk', 'npc-logo-navy': 'Nick Ponte Realty', 'npc-logo-reversed': 'Nick Ponte Realty',
  'npc-buyer-hero': 'Oceanfront homes along the NH Seacoast', 'npc-seller-hero': 'Oceanfront homes along the NH Seacoast',
};

async function login(p) {
  // The site sets a JavaScript gate cookie on the login page; let it load fully, and retry once or twice.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await p.goto(`${SITE}/wp-login.php`, { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(1500);
    await p.fill('#user_login', process.env.WPU);
    await p.fill('#user_pass', process.env.WPP);
    await Promise.all([p.waitForNavigation({ timeout: 60000 }).catch(() => {}), p.click('#wp-submit')]);
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    const nonce = await p.evaluate(() => window.wpApiSettings?.nonce);
    if (nonce) return nonce;
    console.log(`login attempt ${attempt} failed (${p.url()}), retrying`);
  }
  throw new Error('Login failed or the account cannot open wp-admin');
}

async function api(p, nonce, method, route, body) {
  const r = await p.request.fetch(`${SITE}/wp-json${route}`, {
    method, headers: { 'X-WP-Nonce': nonce, ...(body ? { 'Content-Type': 'application/json' } : {}) }, data: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok()) throw new Error(`${method} ${route} -> ${r.status()} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

async function deployPlugin(p) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'npc-'));
  const zip = path.join(tmp, 'nickponte-coastal.zip');
  execSync(`cd plugin && zip -qr ${zip} nickponte-coastal`, { cwd: __dirname });
  await p.goto(`${SITE}/wp-admin/plugin-install.php?tab=upload`, { waitUntil: 'domcontentloaded' });
  await p.setInputFiles('#pluginzip', zip);
  await Promise.all([p.waitForNavigation({ timeout: 120000 }), p.click('#install-plugin-submit')]);
  const replace = await p.$('a.update-from-upload-overwrite');
  if (replace) await Promise.all([p.waitForNavigation({ timeout: 120000 }), replace.click()]);
  const body = await p.innerText('#wpbody-content');
  if (!/Plugin (installed|updated) successfully/i.test(body)) throw new Error('Plugin upload failed:\n' + body.slice(0, 800));
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  const nonce = await p.evaluate(() => wpApiSettings.nonce);
  const st = await api(p, nonce, 'POST', '/wp/v2/plugins/nickponte-coastal/nickponte-coastal', { status: 'active' });
  console.log('plugin: ' + (replace ? 'updated' : 'installed') + ', ' + st.status);
}

async function deployMedia(p, nonce) {
  const ids = {};
  for (const f of MEDIA) {
    const slug = f.replace(/\.\w+$/, '');
    const found = await api(p, nonce, 'GET', `/wp/v2/media?slug=${slug}&_fields=id,source_url`);
    if (found.length) { ids[slug] = found[0].id; console.log(`media: ${slug} exists (${found[0].id})`); continue; }
    const r = await p.request.post(`${SITE}/wp-json/wp/v2/media`, {
      headers: { 'X-WP-Nonce': nonce, 'Content-Disposition': `attachment; filename="${f}"`, 'Content-Type': f.endsWith('.png') ? 'image/png' : 'image/jpeg' },
      data: fs.readFileSync(path.join(__dirname, 'media', f)),
    });
    const j = await r.json();
    if (!r.ok()) throw new Error('upload ' + f + ': ' + JSON.stringify(j).slice(0, 300));
    await api(p, nonce, 'POST', `/wp/v2/media/${j.id}`, { alt_text: ALT[slug] || '', title: ALT[slug] || slug });
    ids[slug] = j.id; console.log(`media: ${slug} uploaded (${j.id})`);
  }
  return ids;
}

async function deployReview(p, nonce) {
  const ex = await api(p, nonce, 'GET', '/wp/v2/pages?slug=design-preview&status=publish,draft,private&_fields=id,link');
  const j = ex.length ? await api(p, nonce, 'POST', `/wp/v2/pages/${ex[0].id}`, { template: 'npc-review', status: 'publish' })
    : await api(p, nonce, 'POST', '/wp/v2/pages', { title: 'Website redesign preview', slug: 'design-preview', status: 'publish', template: 'npc-review', content: '' });
  console.log('review: ' + j.link);
}

async function deployGuides(p, nonce) {
  for (const [slug, title] of [['buyers-guide-preview', 'Buyer Guide (Coastal Light preview)'], ['sellers-guide-preview', 'Seller Guide (Coastal Light preview)']]) {
    const ex = await api(p, nonce, 'GET', `/wp/v2/pages?slug=${slug}&status=publish,draft,private&_fields=id,link`);
    const j = ex.length ? await api(p, nonce, 'POST', `/wp/v2/pages/${ex[0].id}`, { template: 'npc-guide', status: 'publish' })
      : await api(p, nonce, 'POST', '/wp/v2/pages', { title, slug, status: 'publish', template: 'npc-guide', content: '' });
    console.log('guide: ' + j.link);
  }
}

async function deployHome(p, nonce) {
  const ex = await api(p, nonce, 'GET', '/wp/v2/pages?slug=home-preview&status=publish,draft,private&_fields=id,link,template');
  const body = { title: 'Home (Coastal Light preview)', slug: 'home-preview', status: 'publish', template: 'npc-home', content: '' };
  const j = ex.length ? await api(p, nonce, 'POST', `/wp/v2/pages/${ex[0].id}`, { template: 'npc-home', status: 'publish' })
    : await api(p, nonce, 'POST', '/wp/v2/pages', body);
  console.log('home: ' + j.link);
}

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
function seed(t, i) {
  const trend = Array.from({ length: 12 }, (_, k) => Math.round(t.median * (0.9 + 0.1 * k / 11 + 0.025 * Math.sin(k * 1.9)) / 1000) * 1000);
  const read = `${t.name} closed ${t.sold} homes in the last 90 days at a median of ${money(t.median)}. ` +
    (t.extra || `Well-priced listings are going under agreement in about ${t.dom} days, and a ${t.ratio.toFixed(1)}% sale-to-list ratio says buyers are still paying close to ask.`) +
    ' Days on market crept up from the spring, which is normal for the fall.';
  const factors = [1.9, 0.78, 1.05], beds = [4, 3, 4], baths = [4, 2, 3];
  const sales = [];
  if (t.real) sales.push([t.real.street, t.real.meta, t.real.price, 'Sold · Featured sale', 'Carey & Giampa Realtors']);
  t.streets.forEach((s) => { const k = sales.length; sales.push([s, `${t.name}, NH · ${beds[k]} bd · ${baths[k]} ba`, money(Math.round(t.median * factors[k] / 5000) * 5000), 'Sample row: replace with a real sale', '']); });
  const homeTags = { Rye: 'Oceanfront estates, Wallis Sands and Jenness beaches', Portsmouth: "Historic downtown, waterfront condos, the Seacoast's restaurant scene", Hampton: 'Hampton Beach and the year-round neighborhoods behind it' };
  return {
    _npc_tag: homeTags[t.name] || t.tag, _npc_intro: t.intro, _npc_updated: 'November 2026',
    _npc_median: t.median, _npc_dom: t.dom, _npc_active: t.active, _npc_ratio: t.ratio, _npc_sold: t.sold,
    _npc_trend: trend.join(', '), _npc_read: read,
    _npc_neighborhoods: t.areas.map((a) => a.join(' | ')).join('\n'),
    _npc_sales: sales.map((r) => r.join(' | ')).join('\n'),
    _npc_sample: true, _npc_zillow: true,
  };
}

// Town photos supplied by Nick that replace the Rye fallback.
const PHOTO = { Exeter: 'npc-exeter-downtown' };

async function deployTowns(p, nonce, ids) {
  const towns = require('./content/towns-source.cjs');
  const imgFor = { 'assets/rye-coast.jpg': 'npc-rye-coast', 'assets/portsmouth.jpg': 'npc-portsmouth', 'assets/hampton-beach.jpg': 'npc-hampton-beach' };
  for (const [i, t] of towns.entries()) {
    const slug = t.name.toLowerCase().replace(/\s+/g, '-');
    const media = ids[PHOTO[t.name] || imgFor[t.img] || 'npc-rye-coast'] || 0;
    const ex = await api(p, nonce, 'GET', `/wp/v2/np-towns?slug=${slug}&status=publish,draft&_fields=id,link`);
    let j;
    if (ex.length && !RESEED) {
      j = await api(p, nonce, 'POST', `/wp/v2/np-towns/${ex[0].id}`, { menu_order: i, ...(PHOTO[t.name] && ids[PHOTO[t.name]] ? { featured_media: ids[PHOTO[t.name]] } : {}) });
      console.log(`town: ${t.name} kept (owner edits preserved) ${j.link}`);
      continue;
    }
    const body = { title: t.name, slug, status: 'publish', menu_order: i, featured_media: media, meta: seed(t, i) };
    j = ex.length ? await api(p, nonce, 'POST', `/wp/v2/np-towns/${ex[0].id}`, body) : await api(p, nonce, 'POST', '/wp/v2/np-towns', body);
    console.log(`town: ${t.name} ${ex.length ? 'reseeded' : 'created'} ${j.link}`);
  }
}

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext();
  const p = await c.newPage();
  let nonce = await login(p);
  if (want('plugin')) { await deployPlugin(p); await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' }); nonce = await p.evaluate(() => wpApiSettings.nonce); }
  const ids = (want('media') || want('towns')) ? await deployMedia(p, nonce) : {};
  if (want('home')) await deployHome(p, nonce);
  if (want('review')) await deployReview(p, nonce);
  if (want('guides')) await deployGuides(p, nonce);
  if (want('towns')) await deployTowns(p, nonce, ids);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
