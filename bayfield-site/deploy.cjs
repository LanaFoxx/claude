// Deploys the Bayfield Inn homepage to WordPress through the Elementor editor (so Elementor
// validates the data and regenerates CSS). Usage:
//   WP_URL=https://... STATE=playwright-state.json MEDIA=dir-with-images node deploy.cjs [prep] [chrome] [home]
// prep   = upload images, nav menu, Google Fonts snippet, site title + favicon
// chrome = header + footer Theme Builder templates (Entire Site)
// home   = homepage, set as the static front page
// No args = everything. State (IDs) is kept in $STATE_DIR/bayfield-prep.json.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const B = require('./build.cjs');

const SITE = process.env.WP_URL;
const MEDIA = process.env.MEDIA;
const PREP = path.join(path.dirname(process.env.STATE), 'bayfield-prep.json');
const args = process.argv.slice(2);
const want = (k) => args.length === 0 || args.includes(k);
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet">';
const MENU = [['Rooms', '/#rooms'], ['Dining', '/#dining'], ['Events', '/#events'], ['Gallery', 'https://bayfieldinn.com/relax/lobby-gallery/'], ['Contact', '/#contact']];

const api = (p, method, url, body) => p.evaluate(async ([method, url, body]) => {
  const r = await fetch(url, { method, headers: { 'X-WP-Nonce': wpApiSettings.nonce, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}, [method, url, body]);

async function upload(p, file) {
  const f = path.basename(file);
  const type = f.endsWith('.png') ? 'image/png' : 'image/jpeg';
  // Upload from inside the logged-in page: SiteGround's bot check blocks non-browser requests.
  return p.evaluate(async ([f, type, b64]) => {
    const ex = await (await fetch(`/wp-json/wp/v2/media?search=${encodeURIComponent(f.replace(/\.\w+$/, ''))}&_fields=id,source_url,slug`, { headers: { 'X-WP-Nonce': wpApiSettings.nonce } })).json();
    const hit = ex.find((x) => x.slug === f.replace(/\.\w+$/, ''));
    if (hit) return hit;
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const r = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { 'X-WP-Nonce': wpApiSettings.nonce, 'Content-Disposition': `attachment; filename="${f}"`, 'Content-Type': type }, body: bin });
    return r.json();
  }, [f, type, fs.readFileSync(file).toString('base64')]);
}

async function fontSnippet(p) {
  // Elementor Pro "Custom Code" snippet in <head>, Entire Site. Its meta is exposed over REST.
  const ex = await api(p, 'GET', '/wp-json/wp/v2/elementor_snippet?status=any&search=Bayfield%20fonts&_fields=id');
  const body = { title: 'Bayfield fonts (Geist + Newsreader)', status: 'publish', meta: { _elementor_location: 'elementor_head', _elementor_priority: 1, _elementor_code: FONTS } };
  const r = await api(p, 'POST', ex.length ? `/wp-json/wp/v2/elementor_snippet/${ex[0].id}` : '/wp-json/wp/v2/elementor_snippet', body);
  if (!r.id) throw new Error('snippet: ' + JSON.stringify(r));
  // No display conditions = Entire Site for Custom Code.
  return r.id;
}

async function findOrCreateTemplate(p, type, title) {
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=theme&elementor_library_type=${type}`, { waitUntil: 'domcontentloaded' });
  const existing = (await api(p, 'GET', `/wp-json/wp/v2/elementor_library?per_page=100&status=any&search=${encodeURIComponent(title)}&_fields=id,title`)).find((t) => t.title.rendered === title)?.id;
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

async function setConditions(p, postId, conditions) {
  // editor_post_id is required, otherwise the request "succeeds" without saving anything.
  return p.evaluate(([conditions, id]) => new Promise((resolve, reject) => {
    elementorCommon.ajax.addRequest('pro_theme_builder_save_conditions', {
      data: { conditions, editor_post_id: id }, success: () => resolve('ok'), error: (e) => reject(new Error(JSON.stringify(e))),
    }, true);
  }), [conditions, postId]);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  const prep = fs.existsSync(PREP) ? JSON.parse(fs.readFileSync(PREP, 'utf8')) : { media: {} };

  if (want('prep')) {
    for (const f of fs.readdirSync(MEDIA).filter((f) => /\.(png|jpe?g)$/.test(f))) {
      const j = await upload(p, path.join(MEDIA, f));
      if (!j.id) throw new Error(`${f}: ${JSON.stringify(j)}`);
      prep.media[f] = { id: j.id, url: j.source_url };
    }
    const menus = await api(p, 'GET', '/wp-json/wp/v2/menus?_fields=id,name');
    let menu = menus.find((x) => x.name === 'Bayfield Main Menu');
    if (!menu) {
      menu = await api(p, 'POST', '/wp-json/wp/v2/menus', { name: 'Bayfield Main Menu' });
      let order = 1;
      for (const [title, url] of MENU) await api(p, 'POST', '/wp-json/wp/v2/menu-items', { title, url: /^https?:/.test(url) ? url : SITE + url, menus: menu.id, status: 'publish', menu_order: order++ });
    }
    prep.menu = menu.id;
    prep.fonts = await fontSnippet(p);
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    const s = await api(p, 'POST', '/wp-json/wp/v2/settings', {
      title: 'Bayfield Inn', description: 'The best darn view on Lake Superior', site_icon: prep.media['bayfield-inn-favicon.png'].id,
    });
    console.log('prep: media', Object.keys(prep.media).length, '| menu', prep.menu, '| fonts snippet', prep.fonts, '| title', s.title, '| icon', s.site_icon);
    fs.writeFileSync(PREP, JSON.stringify(prep, null, 1));
  }

  const md = (f) => ({ id: prep.media[f].id, url: prep.media[f].url, alt: '', source: 'library' });
  const m = {
    logo: md('bayfield-inn-logo.png'), logoWhite: md('bayfield-inn-logo-white.png'),
    heroDeck: md('bayfield-hero-the-deck.jpg'), heroDining: md('bayfield-hero-lakeside-dining.jpg'),
    lakeview: md('bayfield-lakeview-room.jpg'), sunset: md('bayfield-harbor-sunset.jpg'), suite: md('bayfield-suite.jpg'),
    deckDining: md('bayfield-deck-dining.jpg'), deckBadge: md('bayfield-the-deck-badge.png'), eventsLawn: md('bayfield-events-lawn.jpg'),
    // The design has an empty "Drop a Standard Room photo" slot: Elementor's placeholder until a photo is chosen.
    placeholder: { id: '', url: `${SITE}/wp-content/plugins/elementor/assets/images/placeholder.png`, alt: '', source: 'library' },
  };

  if (want('chrome')) {
    // Publish both templates first, then set their conditions: publishing one template in the
    // editor was found to reset the other's display conditions.
    const entireSite = [{ type: 'include', name: 'general', sub_name: '', sub_id: '' }];
    for (const [type, title, els] of [['header', 'Bayfield Inn Header', B.header(m, prep.menu)], ['footer', 'Bayfield Inn Footer', B.footer(m)]]) {
      const tid = await findOrCreateTemplate(p, type, title);
      await openEditor(p, tid);
      console.log(type, tid, 'elements saved:', await replaceContent(p, els));
      prep[type] = tid;
    }
    for (const type of ['header', 'footer']) {
      await openEditor(p, prep[type]);
      console.log(type, 'conditions:', await setConditions(p, prep[type], entireSite));
    }
  }

  if (want('home')) {
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    let pg = (await api(p, 'GET', '/wp-json/wp/v2/pages?slug=home&status=publish,draft,private&_fields=id,link'))[0];
    if (!pg) pg = await api(p, 'POST', '/wp-json/wp/v2/pages', { title: 'Home', slug: 'home', status: 'publish', template: 'elementor_header_footer' });
    await openEditor(p, pg.id);
    console.log('home', pg.id, 'elements saved:', await replaceContent(p, B.home(m), B.pageSettings));
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    const s = await api(p, 'POST', '/wp-json/wp/v2/settings', { show_on_front: 'page', page_on_front: pg.id });
    console.log('front page:', s.show_on_front, s.page_on_front);
    prep.home = pg.id;
  }
  fs.writeFileSync(PREP, JSON.stringify(prep, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
