// Deploys the Snow Bentley Realty site to WordPress through the Elementor editor (Elementor
// validates the data and regenerates CSS). Usage:
//   WP_URL=https://staging195.dreamwebdigital.com STATE=state.json node deploy.cjs [prep] [chrome] [page-path ...]
//   no args = everything. "prep" = slug conflicts, old theme templates, site title/front page.
// Needs build/media.json from tools/media.cjs. Writes build/deployed.json (ids of everything created).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { collectMedia, NAMED } = require('./lib/media-list.cjs');
const chrome = require('./lib/chrome.cjs');
const { PAGES } = require('./pages/index.cjs');
const { C } = require('./lib/core.cjs');

const SITE = process.env.WP_URL || 'https://staging195.dreamwebdigital.com';
const BUILD = path.join(__dirname, 'build');
const media = JSON.parse(fs.readFileSync(path.join(BUILD, 'media.json'), 'utf8'));
const DEPLOYED = path.join(BUILD, 'deployed.json');
const deployed = fs.existsSync(DEPLOYED) ? JSON.parse(fs.readFileSync(DEPLOYED, 'utf8')) : { pages: {}, templates: {}, prep: {} };
const save = () => fs.writeFileSync(DEPLOYED, JSON.stringify(deployed, null, 1));

// Media lookup by LP id / URL or by our file name (sb-logo-white ...)
const byName = {};
collectMedia().forEach((x) => { byName[x.name] = x.key; });
const has = (k) => Boolean(media[k] || media[byName[k]]);
const m = (k) => {
  const x = media[k] || media[byName[k]];
  if (!x) throw new Error(`Missing media ${k}`);
  return { id: x.id, url: x.url, alt: '', source: 'library' };
};
const homeData = JSON.parse(fs.readFileSync(path.join(__dirname, 'source', 'home-data.json'), 'utf8'));

const args = process.argv.slice(2);
const want = (key) => args.length === 0 || args.includes(key);
const restNonce = () => window.wpApiSettings?.nonce || window.elementorCommon?.config?.rest?.nonce;

async function api(p, method, route, body) {
  return p.evaluate(async ([method, route, body, nonceFn]) => {
    const r = await fetch(`/wp-json/${route}`, { method, headers: { 'X-WP-Nonce': eval(`(${nonceFn})`)(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const t = await r.text();
    try { return JSON.parse(t); } catch (e) { return { error: t.slice(0, 300), status: r.status }; }
  }, [method, route, body, restNonce.toString()]);
}

async function findOrCreateTemplate(p, type, title) {
  if (deployed.templates[title]) return deployed.templates[title];
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=${type === 'popup' ? 'popup' : 'theme'}&elementor_library_type=${type}`, { waitUntil: 'domcontentloaded' });
  const list = await api(p, 'GET', `wp/v2/elementor_library?per_page=100&status=publish,draft&search=${encodeURIComponent(title)}&_fields=id,title`);
  const existing = Array.isArray(list) && list.find((t) => t.title.rendered === title)?.id;
  if (existing) { deployed.templates[title] = existing; save(); return existing; }
  const nonce = (await p.content()).match(/name="action" value="elementor_new_post">\s*<input type="hidden" name="_wpnonce" value="([0-9a-f]+)"/)[1];
  await p.goto(`${SITE}/wp-admin/edit.php?action=elementor_new_post&post_type=elementor_library&template_type=${type}&post_data%5Bpost_title%5D=${encodeURIComponent(title)}&_wpnonce=${nonce}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const id = Number(new URL(p.url()).searchParams.get('post'));
  deployed.templates[title] = id; save();
  return id;
}

async function openEditor(p, postId) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${postId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(2500);
}

async function replaceContent(p, elements, docSettings) {
  return p.evaluate(async ([elements, docSettings]) => {
    const doc = elementor.documents.getCurrent();
    if (docSettings) $e.run('document/elements/settings', { container: doc.container, settings: docSettings, options: { external: true } });
    $e.run('document/elements/empty', { force: true });
    elements.forEach((model, at) => $e.run('document/elements/create', { container: doc.container, model, options: { at, edit: false } }));
    await $e.run('document/save/publish');
    const count = (els) => els.reduce((n, e) => n + 1 + count(e.elements || []), 0);
    return count(doc.container.model.get('elements').toJSON());
  }, [elements, docSettings]);
}

async function setConditions(p, conditions) {
  return p.evaluate((conditions) => new Promise((resolve, reject) => {
    elementorCommon.ajax.addRequest('pro_theme_builder_save_conditions', {
      data: { conditions }, success: () => resolve('ok'), error: (e) => reject(new Error(JSON.stringify(e))),
    }, true);
  }), conditions);
}

async function ensurePage(p, def, parentId) {
  const known = deployed.pages[def.path];
  if (known) {
    const cur = await api(p, 'GET', `wp/v2/pages/${known.id}?context=edit&_fields=id,link,status`);
    if (cur.id) return { id: cur.id, link: cur.link };
  }
  const ex = await api(p, 'GET', `wp/v2/pages?slug=${def.slug}&parent=${parentId || 0}&status=publish,draft,private&_fields=id,link`);
  let page;
  if (Array.isArray(ex) && ex.length) page = ex[0];
  else {
    // Elementor 4.3 can't save a brand-new empty page created over REST ("reading 'toJSON'"), so new pages
    // start as a copy of an existing Elementor page (Duplicate Page plugin) and get their content replaced.
    const seed = deployed.pages['']?.id;
    if (!seed) throw new Error('Deploy the home page first (it seeds new pages)');
    await p.goto(`${SITE}/wp-admin/edit.php?post_type=page&s=${encodeURIComponent('Home')}`, { waitUntil: 'domcontentloaded' });
    const href = await p.evaluate((seed) => document.querySelector(`#post-${seed} a[href*="dt_duplicate_post_as_draft"]`)?.href, seed);
    if (!href) throw new Error('Duplicate link not found');
    const before = await api(p, 'GET', 'wp/v2/pages?status=draft&per_page=1&orderby=id&order=desc&_fields=id');
    await p.goto(href, { waitUntil: 'domcontentloaded' });
    const after = await api(p, 'GET', 'wp/v2/pages?status=draft&per_page=1&orderby=id&order=desc&_fields=id');
    if (!after[0] || (before[0] && after[0].id === before[0].id)) throw new Error('Duplicate failed');
    page = await api(p, 'POST', `wp/v2/pages/${after[0].id}`, { title: def.title, slug: def.slug, status: 'publish', parent: parentId || 0, template: 'elementor_header_footer' });
  }
  if (!page.id) throw new Error(`Could not create page ${def.path}: ${JSON.stringify(page).slice(0, 300)}`);
  await api(p, 'POST', `wp/v2/pages/${page.id}`, { title: def.title, template: 'elementor_header_footer', status: 'publish' });
  deployed.pages[def.path] = { id: page.id, link: page.link }; save();
  return page;
}

const pageSettings = { hide_title: 'yes', background_background: 'classic', background_color: C.cream };

(async () => {
  const b = await chromium.launch();
  const bctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await bctx.newPage();
  p.setDefaultTimeout(180000); p.setDefaultNavigationTimeout(180000);
  p.on('dialog', (d) => d.accept());
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });

  if (want('prep')) {
    // 1) Free up the live site's URLs (/about, /contact, /blog) held by the old Dream Web Digital pages.
    for (const slug of ['about', 'contact', 'blog', 'home-search', 'properties', 'neighborhoods', 'testimonials', 'buyers', 'sellers', 'guides', 'residential', 'commercial']) {
      const ex = await api(p, 'GET', `wp/v2/pages?slug=${slug}&parent=0&status=publish,draft,private&_fields=id,slug,title`);
      for (const pg of (Array.isArray(ex) ? ex : [])) {
        if (Object.values(deployed.pages).some((d) => d.id === pg.id)) continue;
        const r = await api(p, 'POST', `wp/v2/pages/${pg.id}`, { slug: `dwd-${slug}` });
        deployed.prep[`renamed-${pg.id}`] = { from: slug, to: r.slug }; save();
        console.log('renamed old page', pg.id, slug, '->', r.slug);
      }
    }
    // 2) Unpublish the old site-wide header/footer templates so the Snow Bentley ones apply (reversible: set back to publish).
    for (const id of [3294, 3162]) {
      const r = await api(p, 'POST', `wp/v2/elementor_library/${id}`, { status: 'draft' });
      deployed.prep[`drafted-template-${id}`] = r.status; save();
      console.log('old theme template', id, '->', r.status);
    }
    // 3) Site identity
    const before = await api(p, 'GET', 'wp/v2/settings');
    if (!deployed.prep.settingsBefore) { deployed.prep.settingsBefore = { title: before.title, description: before.description, page_on_front: before.page_on_front, show_on_front: before.show_on_front }; save(); }
    await api(p, 'POST', 'wp/v2/settings', { title: 'Snow Bentley Realty', description: 'Bay Area Commercial & Luxury Real Estate' });
  }

  const ctx = {
    m, has, popups: {}, testimonials: homeData.testimonials, neighborhoods: homeData.neighborhoods,
  };

  // Popups first: the header/footer and pages link to them.
  for (const [key, title, build, settings] of [['menu', 'Snow Bentley Menu', chrome.menuPopup, chrome.menuPopupSettings], ['connect', "Snow Bentley Let's Connect", chrome.connectPopup, chrome.connectPopupSettings]]) {
    const pid = await findOrCreateTemplate(p, 'popup', title);
    ctx.popups[key] = pid;
    if (want('chrome')) {
      await openEditor(p, pid);
      console.log('popup', key, pid, 'elements saved:', await replaceContent(p, build(ctx), settings));
      // Conditions only persist when saved from a freshly loaded editor (not right after publish).
      await openEditor(p, pid);
      console.log('  conditions:', await setConditions(p, [{ type: 'include', name: 'general', sub_name: '', sub_id: '' }]).catch((e) => 'unchanged/' + e.message.slice(0, 60)));
    }
  }
  ctx.connect = chrome.popupUrl(ctx.popups.connect);

  if (want('chrome')) {
    const entireSite = [{ type: 'include', name: 'general', sub_name: '', sub_id: '' }];
    for (const [type, title, els] of [['header', 'Snow Bentley Header', chrome.header(ctx)], ['footer', 'Snow Bentley Footer', chrome.footer(ctx)]]) {
      const tid = await findOrCreateTemplate(p, type, title);
      await openEditor(p, tid);
      console.log(type, tid, 'elements saved:', await replaceContent(p, els));
      await openEditor(p, tid);
      console.log('  conditions:', await setConditions(p, entireSite).catch((e) => 'unchanged/' + e.message.slice(0, 60)));
    }
  }

  const pageWanted = (def) => args.length === 0 || args.includes(def.path) || args.includes(def.path || 'home') || (def.front && args.includes('home')) || args.includes('pages') || (args.includes('hoods') && def.parent === 'neighborhoods');
  for (const def of PAGES) {
    if (!pageWanted(def)) continue;
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    const parentId = def.parent ? deployed.pages[def.parent]?.id : 0;
    if (def.parent && !parentId) throw new Error(`Deploy parent ${def.parent} before ${def.path}`);
    const pg = await ensurePage(p, { ...def, slug: def.front ? 'home-snow-bentley' : def.slug }, parentId);
    await openEditor(p, pg.id);
    let els = def.build(ctx);
    if (process.env.ONLY) els = process.env.ONLY.split(',').map(Number).map((i) => els[i]);
    console.log(def.path || 'home', pg.id, 'elements saved:', await replaceContent(p, els, pageSettings));
    if (def.front) {
      await api(p, 'POST', 'wp/v2/settings', { show_on_front: 'page', page_on_front: pg.id });
      console.log('front page ->', pg.id);
    }
  }

  // Elementor CSS + host caches: run tools/purge.cjs after deploying.
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
