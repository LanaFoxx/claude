// Builds nickponterealty.com pages in native Elementor (Theme Builder header/footer + pages).
// Usage: WPU=... WPP=... node elementor/deploy-el.cjs [menu] [chrome] [home] [--handover]
// Nothing changes on the live site until --handover adds a page to the "npc_elementor" option;
// until then the new header/footer apply only to pages already handed over.
const { chromium } = require('playwright');
const S = require('./site.cjs');
const forms = require('./forms-live.json');

const SITE = process.env.WP_URL || 'https://nickponterealty.com';
const args = process.argv.slice(2);
const steps = args.filter((a) => !a.startsWith('--'));
const want = (s) => steps.length === 0 || steps.includes(s);
const HOME = 2579;
const TOWN_PAGES = [4753, 4300, 4302, 4459, 4304, 4927, 4325, 4952, 4706, 4936, 432];
const MEDIA = ['npc-logo-navy', 'npc-hero', 'npc-nick-ponte', 'npc-press-seacoastonline', 'npc-press-bostoncom', 'npc-press-unionleader', 'npc-387-ocean', 'npc-estate-dusk'];
const MENU = [['Towns', S.U.rye], ['Featured sales', S.U.featured], ['Buyers', S.U.buyers], ['Sellers', S.U.sellers], ['Market news', S.U.blog], ['About', S.U.about], ['Contact', S.U.contact]];

async function login(p) {
  for (let i = 1; i <= 3; i++) {
    await p.goto(`${SITE}/wp-login.php`, { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(1500);
    try {
      await p.fill('#user_login', process.env.WPU, { timeout: 60000 });
      await p.fill('#user_pass', process.env.WPP);
      await Promise.all([p.waitForNavigation({ timeout: 60000 }).catch(() => {}), p.click('#wp-submit')]);
      await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    } catch (e) { console.log('login retry', i); continue; }
    const nonce = await p.evaluate(() => window.wpApiSettings?.nonce);
    if (nonce) return nonce;
  }
  throw new Error('login failed');
}
const api = async (p, nonce, method, route, body) => {
  const r = await p.request.fetch(`${SITE}/wp-json${route}`, { method, headers: { 'X-WP-Nonce': nonce, ...(body ? { 'Content-Type': 'application/json' } : {}) }, data: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok()) throw new Error(`${method} ${route} -> ${r.status()} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
};

async function media(p, nonce) {
  const m = {};
  for (const slug of MEDIA) {
    const f = await api(p, nonce, 'GET', `/wp/v2/media?slug=${slug}&_fields=id,source_url`);
    if (!f.length) throw new Error('missing media ' + slug);
    m[slug] = { id: f[0].id, url: f[0].source_url };
  }
  return m;
}

async function menu(p, nonce) {
  const name = 'Main Menu';
  const all = await api(p, nonce, 'GET', '/wp/v2/menus?per_page=100');
  let mn = all.find((x) => x.name === name);
  if (!mn) mn = await api(p, nonce, 'POST', '/wp/v2/menus', { name });
  const items = await api(p, nonce, 'GET', `/wp/v2/menu-items?menus=${mn.id}&per_page=100`);
  for (const it of items) await api(p, nonce, 'DELETE', `/wp/v2/menu-items/${it.id}?force=true`);
  let order = 1;
  for (const [title, url] of MENU) await api(p, nonce, 'POST', '/wp/v2/menu-items', { title, url: SITE + url, menus: mn.id, status: 'publish', menu_order: order++, type: 'custom' });
  console.log('menu', mn.id, MENU.length, 'items');
  return mn.slug || 'main-menu';
}

async function findOrCreateTemplate(p, type, title, wpNonce) {
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=theme&elementor_library_type=${type}`, { waitUntil: 'domcontentloaded' });
  const existing = (await api(p, wpNonce, 'GET', '/wp/v2/elementor_library?per_page=100&status=publish,draft,private&search=' + encodeURIComponent(title) + '&_fields=id,title')).find((t) => t.title.rendered === title)?.id;
  if (existing) return existing;
  const nonce = (await p.content()).match(/name="action" value="elementor_new_post">\s*<input type="hidden" name="_wpnonce" value="([0-9a-f]+)"/)[1];
  await p.goto(`${SITE}/wp-admin/edit.php?action=elementor_new_post&post_type=elementor_library&template_type=${type}&post_data%5Bpost_title%5D=${encodeURIComponent(title)}&_wpnonce=${nonce}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return Number(new URL(p.url()).searchParams.get('post'));
}
async function openEditor(p, postId) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${postId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(3000);
}
async function replaceContent(p, elements, pageSettings) {
  return p.evaluate(async ([elements, pageSettings]) => {
    const doc = elementor.documents.getCurrent();
    if (pageSettings) $e.run('document/elements/settings', { container: doc.container, settings: pageSettings, options: { external: true } });
    $e.run('document/elements/empty', { force: true });
    elements.forEach((model, at) => $e.run('document/elements/create', { container: doc.container, model, options: { at, edit: false } }));
    await $e.run('document/save/publish');
    const count = (els) => els.reduce((n, e) => n + 1 + count(e.elements || []), 0);
    return count(doc.container.model.get('elements').toJSON());
  }, [elements, pageSettings]);
}
async function setConditions(p, conditions) {
  // WordPress reports an unchanged meta value as a failed save, so a repeat run lands here.
  return setConditionsRaw(p, conditions).catch((e) => 'unchanged (' + e.message.slice(0, 60) + ')');
}
async function setConditionsRaw(p, conditions) {
  return p.evaluate((conditions) => new Promise((resolve, reject) => {
    elementorCommon.ajax.addRequest('pro_theme_builder_save_conditions', { data: { conditions }, success: () => resolve('ok'), error: (e) => reject(new Error(JSON.stringify(e))) }, true);
  }), conditions);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(180000);
  p.on('dialog', (d) => d.accept());
  let nonce = await login(p);
  const m = await media(p, nonce);
  const handed = (await api(p, nonce, 'GET', '/wp/v2/settings')).npc_elementor || [];
  const entireSite = [{ type: 'include', name: 'general', sub_name: '', sub_id: '' }];
  const townConds = [{ type: 'include', name: 'singular', sub_name: 'np_town', sub_id: '' },
    ...TOWN_PAGES.map((id) => ({ type: 'include', name: 'singular', sub_name: 'page', sub_id: String(id) }))];

  let menuId;
  if (want('menu') || want('chrome')) menuId = await menu(p, nonce);
  if (want('chrome')) {
    for (const [type, title, els] of [['header', 'Nick Ponte Header', S.header(m, menuId)], ['footer', 'Nick Ponte Footer', S.footer(m)]]) {
      const tid = await findOrCreateTemplate(p, type, title, nonce);
      console.log(type, 'template', tid, p.url());
      await openEditor(p, tid);
      console.log(type, tid, 'elements:', await replaceContent(p, els), '| conditions:', await setConditions(p, entireSite));
    }
  }
  if (want('chrome')) {
    // The old site's header/footer stop applying (they were "entire site" too).
    for (const old of [23, 295]) { await openEditor(p, old); console.log('old template', old, 'conditions cleared:', await setConditions(p, [])); }
  }
  if (want('town') && !args.includes('--handover-only')) {
    const tid = await findOrCreateTemplate(p, 'single-page', 'Nick Ponte Town', nonce);
    await openEditor(p, tid);
    console.log('town template', tid, 'elements:', await replaceContent(p, S.town(m)), '| conditions:', await setConditions(p, townConds));
  }
  if (want('home') && !args.includes('--handover-only')) {
    await openEditor(p, HOME);
    console.log('home', HOME, 'elements:', await replaceContent(p, S.home(m, { valuation: forms.valuation[0], offmarket: forms.offmarket[0] }), S.pageSettings));
  }
  if (args.includes('--handover')) {
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    nonce = await p.evaluate(() => wpApiSettings.nonce);
    const keys = steps.map((s) => ({ home: String(HOME), town: 'towns' })[s]).filter(Boolean);
    const next = [...new Set([...handed, ...keys])];
    const r = await api(p, nonce, 'POST', '/wp/v2/settings', { npc_elementor: next });
    console.log('npc_elementor =', JSON.stringify(r.npc_elementor));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
