// One-time site prep for the Recco build. Usage:
//   WP_URL=... STATE=playwright-state.json OUT=prep.json UPLOADS=dir node prep.cjs [cleanup]
// - "cleanup": permanently deletes every existing page and image, trashes old Elementor templates
//   (not the Kit) and the sample "Hello world" post.
// - Uploads every file in UPLOADS (skips files already in the library by name).
// - Creates the "Recco Main Menu", sets site title/tagline and the site icon (favicon).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { ICON_FILES, ICON_ALT } = require('./platforms.cjs');

const SITE = process.env.WP_URL || 'https://staging154.dreamweb.digital';
// Contact is the outline button at the end of the header, so it is not a menu item.
const MENU = [['Home', '/'], ['Services', '/#services'], ['Enterprise Apps', '/enterprise-apps/'], ['AI Platforms', '/ai-platforms/'], ['SEED', '/seed/'], ['About Us', '/#about']];
const ALT = {
  'recco-consulting-logo.png': 'Recco Consulting', 'recco-hero-tower.jpg': 'Glass office tower', 'recco-dome.jpg': 'Glass and steel dome',
  'recco-team.jpg': 'Recco Consulting team', 'recco-city-data.jpg': 'City skyline with data overlay', 'recco-office-bokeh.jpg': 'Office',
  'recco-server-blur.jpg': 'Server room',
  'recco-erp-banner.png': 'Emissions Reduction Program 2026, Level 1 Action, validated by RyeStrategy: calculated previous year\'s Scope 1 and 2 emissions; formed an internal sustainability committee',
  'recco-logo-anthropic-official.png': 'Anthropic',
  'recco-logo-microsoft-official.png': 'Microsoft',
  'recco-erp-badge.png': 'Emissions Reduction Program, Level 1 Action, validated by RyeStrategy',
};
// Platform icons: new ones from platforms.cjs, plus the earlier files the V3 list reuses.
const ICON_KEYS = { ...ICON_FILES, icCopilot: 'recco-icon-copilot.png', icOpenai: 'recco-icon-openai.png', icCopilotStudio: 'recco-icon-copilot-studio.png',
  icLovable: 'recco-icon-lovable.png', icReplit: 'recco-icon-replit.png', icSalesforce: 'recco-icon-salesforce.png', icDynamics: 'recco-icon-dynamics-365.png',
  icServicenow: 'recco-icon-servicenow.png', icAws: 'recco-icon-aws.png' };
for (const [k, f] of Object.entries(ICON_KEYS)) if (ICON_ALT[k]) ALT[f] = ICON_ALT[k];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE });
  const p = await ctx.newPage();
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const nonce = await p.evaluate(async () => (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce')).text());
  // Requests run inside the logged-in page: SiteGround's bot check challenges Playwright's own HTTP client.
  const call = (route, opts = {}) => p.evaluate(async ([route, opts, nonce]) => {
    const headers = { 'X-WP-Nonce': nonce, ...(opts.headers || {}) };
    let body = opts.data;
    if (opts.b64) body = Uint8Array.from(atob(opts.b64), (c) => c.charCodeAt(0));
    else if (body && typeof body === 'object') { body = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
    const r = await fetch('/wp-json' + route, { method: opts.method || 'GET', headers, body });
    return { ok: r.ok, status: r.status, pages: Number(r.headers.get('x-wp-totalpages') || 1), json: await r.json().catch(() => ({})) };
  }, [route, opts, nonce]);
  const api = async (route, opts = {}) => {
    const r = await call(route, opts);
    if (!r.ok) throw new Error(`${opts.method || 'GET'} ${route} -> ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
    return r.json;
  };
  const all = async (route) => {
    let out = [], page = 1;
    for (;;) {
      const r = await call(`${route}${route.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!r.ok) break;
      out = out.concat(r.json);
      if (page >= r.pages) break; page++;
    }
    return out;
  };

  if (process.argv.includes('cleanup')) {
    const pages = await all('/wp/v2/pages?status=publish,draft,private,pending,future,trash&_fields=id,slug');
    for (const pg of pages) { await api(`/wp/v2/pages/${pg.id}?force=true`, { method: 'DELETE' }); console.log('deleted page', pg.id, pg.slug); }
    const media = await all('/wp/v2/media?media_type=image&_fields=id,source_url');
    for (const x of media) { await api(`/wp/v2/media/${x.id}?force=true`, { method: 'DELETE' }); }
    console.log('deleted images:', media.length);
    const tpls = await all('/wp/v2/elementor_library?status=publish,draft,private&context=edit&_fields=id,title,meta');
    for (const t of tpls) {
      if (t.meta?._elementor_template_type === 'kit' || /^Recco /.test(t.title.raw)) continue;
      await api(`/wp/v2/elementor_library/${t.id}`, { method: 'DELETE' }); console.log('trashed template', t.id, t.title.raw);
    }
    const posts = await all('/wp/v2/posts?slug=hello-world&_fields=id');
    for (const x of posts) { await api(`/wp/v2/posts/${x.id}`, { method: 'DELETE' }); console.log('trashed post', x.id); }
  }

  // Media
  const existing = await all('/wp/v2/media?_fields=id,source_url,alt_text');
  const byName = Object.fromEntries(existing.map((x) => [path.basename(x.source_url).replace(/-scaled(?=\.)/, ''), x]));
  const media = {};
  for (const f of fs.readdirSync(process.env.UPLOADS).sort()) {
    if (byName[f]) {
      const x = byName[f];
      if (ALT[f] && x.alt_text !== ALT[f]) { await api(`/wp/v2/media/${x.id}`, { method: 'POST', data: { alt_text: ALT[f] } }); console.log('alt updated', f); }
      media[f] = { id: x.id, source_url: x.source_url }; continue;
    }
    const b64 = fs.readFileSync(path.join(process.env.UPLOADS, f)).toString('base64');
    const type = f.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const j = await api('/wp/v2/media', { method: 'POST', headers: { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${f}"` }, b64 });
    if (ALT[f]) await api(`/wp/v2/media/${j.id}`, { method: 'POST', data: { alt_text: ALT[f] } });
    media[f] = { id: j.id, source_url: j.source_url };
    console.log('uploaded', f, j.id);
  }

  // Menu
  let menu = (await api('/wp/v2/menus?_fields=id,name')).find((x) => x.name === 'Recco Main Menu');
  if (!menu) menu = await api('/wp/v2/menus', { method: 'POST', data: { name: 'Recco Main Menu' } });
  // Sync the items to MENU (titles, links and order) when they differ.
  const items = (await all(`/wp/v2/menu-items?menus=${menu.id}&_fields=id,title,url,menu_order`)).sort((a, b) => a.menu_order - b.menu_order);
  const same = items.length === MENU.length && items.every((it, i) => it.title.rendered === MENU[i][0] && new URL(it.url, 'https://x').pathname + new URL(it.url, 'https://x').hash === MENU[i][1]);
  if (!same) {
    for (const it of items) await api(`/wp/v2/menu-items/${it.id}?force=true`, { method: 'DELETE' });
    for (const [i, [title, url]] of MENU.entries()) {
      await api('/wp/v2/menu-items', { method: 'POST', data: { title, url, menus: menu.id, menu_order: i + 1, status: 'publish', type: 'custom' } });
    }
    console.log('menu synced', menu.id, MENU.map((x) => x[0]).join(' | '));
  }

  // Site identity
  await api('/wp/v2/settings', { method: 'POST', data: {
    title: 'Recco Consulting', description: 'Independent technology advisory', site_icon: media['recco-site-icon.png'].id,
  } });

  fs.writeFileSync(process.env.OUT, JSON.stringify({ media, menu: { id: menu.id } }, null, 1));
  console.log('prep written');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
