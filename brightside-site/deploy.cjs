// Deploys the Brightside homepage to WordPress through the Elementor editor (Elementor validates the
// data and regenerates CSS). Usage:
//   WP_URL=... STATE=state.json PREP=prep.json node deploy.cjs [kit] [chrome] [home]   (no args = all)
// kit    = Site Settings: breakpoints 980/600, global colors + fonts, stage background
// chrome = "Brightside Header" / "Brightside Footer" Theme Builder templates (Entire Site)
// home   = the Home page (front page)
const { chromium } = require('playwright');
const fs = require('fs');
const L = require('./lib.cjs');

const SITE = process.env.WP_URL || 'https://staging161.dreamweb.digital';
const prep = JSON.parse(fs.readFileSync(process.env.PREP, 'utf8'));
const m = Object.fromEntries(Object.entries(prep.media).filter(([, v]) => v.id).map(([k, v]) => [k, { id: v.id, url: v.source_url }]));
const args = process.argv.slice(2);
const want = (k) => args.length === 0 || args.includes(k);
const nonce = () => window.wpApiSettings?.nonce || window.elementorCommon?.config?.rest?.nonce || elementor.config.rest?.nonce;

const KIT = {
  viewport_mobile: 600, viewport_tablet: 980,
  system_colors: [
    { _id: 'primary', title: 'Brightside Yellow', color: '#FFFA6E' },
    { _id: 'secondary', title: 'Solar Orange', color: '#FF7F43' },
    { _id: 'text', title: 'Off Grid Black', color: '#202020' },
    { _id: 'accent', title: 'Electric Purple', color: '#8782FF' },
  ],
  custom_colors: [{ _id: 'bswhite', title: 'White', color: '#FFFFFF' }],
  system_typography: [
    { _id: 'primary', title: 'Display (X-Condensed Bold)', typography_typography: 'custom', typography_font_family: 'Founders Grotesk X-Condensed', typography_font_weight: '700', typography_text_transform: 'uppercase' },
    { _id: 'secondary', title: 'Heading (X-Condensed Bold)', typography_typography: 'custom', typography_font_family: 'Founders Grotesk X-Condensed', typography_font_weight: '700', typography_text_transform: 'uppercase' },
    { _id: 'text', title: 'Body (Founders Grotesk)', typography_typography: 'custom', typography_font_family: 'Founders Grotesk', typography_font_weight: '400' },
    { _id: 'accent', title: 'Button (X-Condensed Bold)', typography_typography: 'custom', typography_font_family: 'Founders Grotesk X-Condensed', typography_font_weight: '700', typography_text_transform: 'uppercase' },
  ],
  body_typography_typography: 'custom', body_typography_font_family: 'Founders Grotesk', body_color: '#202020',
  body_background_background: 'classic', body_background_color: '#FFFA6E',
  space_between_widgets: { column: '0', row: '0', isLinked: true, unit: 'px', size: 0 },
  container_padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true },
  site_name: 'Brightside', site_description: 'The Movement for People Who Love Clean Energy',
};

const PAGES = [
  { key: 'about', slug: 'about', title: 'About', build: 'about' },
  { key: 'take-action', slug: 'take-action', title: 'Take Action', build: 'takeAction' },
  { key: 'petition', slug: 'petition-template', title: '[Petition title] – petition template', build: 'petition', parent: 'take-action' },
  { key: 'contact', slug: 'contact', title: 'Contact', build: 'contact' },
];

async function openEditor(p, postId) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${postId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(2500);
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

async function findOrCreateTemplate(p, type, title) {
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=theme&elementor_library_type=${type}`, { waitUntil: 'domcontentloaded' });
  const existing = await p.evaluate(async (title) => {
    const r = await fetch('/wp-json/wp/v2/elementor_library?per_page=100&status=any&search=' + encodeURIComponent(title) + '&_fields=id,title', { headers: { 'X-WP-Nonce': wpApiSettings.nonce } });
    return (await r.json()).find((t) => t.title.rendered === title)?.id;
  }, title);
  if (existing) return existing;
  const tok = (await p.content()).match(/name="action" value="elementor_new_post">\s*<input type="hidden" name="_wpnonce" value="([0-9a-f]+)"/)[1];
  await p.goto(`${SITE}/wp-admin/edit.php?action=elementor_new_post&post_type=elementor_library&template_type=${type}&post_data%5Bpost_title%5D=${encodeURIComponent(title)}&_wpnonce=${tok}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return Number(new URL(p.url()).searchParams.get('post'));
}

async function setConditions(p, postId, conditions) {
  // WordPress reports unchanged meta as a failed save, so skip when already applied.
  const wanted = conditions.map((c) => [c.type, c.name, c.sub_name, c.sub_id].filter(Boolean).join('/'));
  const current = await p.evaluate(async (id) => (await (await fetch(`/wp-json/wp/v2/elementor_library/${id}?context=edit&_fields=meta`, { headers: { 'X-WP-Nonce': elementorCommon.config.rest?.nonce || window.wpApiSettings?.nonce || elementor.config.rest?.nonce } })).json()).meta?._elementor_conditions || [], postId);
  if (JSON.stringify(current) === JSON.stringify(wanted)) return 'already set';
  return p.evaluate((conditions) => new Promise((resolve) => {
    elementorCommon.ajax.addRequest('pro_theme_builder_save_conditions', {
      data: { conditions }, success: () => resolve('ok'), error: (e) => resolve('error ' + JSON.stringify(e).slice(0, 300)),
    }, true);
  }), conditions);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(180000); p.setDefaultNavigationTimeout(180000);
  p.on('dialog', (d) => d.accept());
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });

  // Home page (create if missing) + front page + site title.
  const homeId = await p.evaluate(async ([nonceFn, icon]) => {
    const h = { 'X-WP-Nonce': eval(`(${nonceFn})`)(), 'Content-Type': 'application/json' };
    const ex = await (await fetch('/wp-json/wp/v2/pages?slug=home&status=publish,draft,private&_fields=id', { headers: h })).json();
    const id = ex.length ? ex[0].id : (await (await fetch('/wp-json/wp/v2/pages', { method: 'POST', headers: h, body: JSON.stringify({ title: 'Home', slug: 'home', status: 'draft' }) })).json()).id;
    await fetch(`/wp-json/wp/v2/pages/${id}`, { method: 'POST', headers: h, body: JSON.stringify({ template: 'elementor_header_footer', status: 'publish', title: 'Home' }) });
    await fetch('/wp-json/wp/v2/settings', { method: 'POST', headers: h, body: JSON.stringify({ show_on_front: 'page', page_on_front: id, title: 'Brightside', description: 'The Movement for People Who Love Clean Energy', ...(icon ? { site_icon: icon } : {}) }) });
    return id;
  }, [nonce.toString(), m['brightside-favicon.png']?.id || 0]);
  console.log('home page', homeId);

  if (want('kit')) {
    await openEditor(p, homeId);
    console.log('kit', await p.evaluate(async (KIT) => {
      const kitId = elementor.config.kit_id;
      await $e.run('panel/global/open');
      await new Promise((r) => setTimeout(r, 3000));
      const kit = elementor.documents.get(kitId);
      $e.run('document/elements/settings', { container: kit.container, settings: KIT, options: { external: true } });
      await $e.run('document/save/update', { document: kit, force: true });
      return kitId;
    }, KIT));
  }

  if (want('chrome')) {
    const entireSite = [{ type: 'include', name: 'general', sub_name: '', sub_id: '' }];
    for (const [type, title, els] of [['header', 'Brightside Header', L.header(m)], ['footer', 'Brightside Footer', L.footer(m)]]) {
      const tid = await findOrCreateTemplate(p, type, title);
      await openEditor(p, tid);
      console.log(type, tid, 'elements:', await replaceContent(p, els), '| conditions:', await setConditions(p, tid, entireSite));
    }
  }

  if (want('home')) {
    await openEditor(p, homeId);
    console.log('home', homeId, 'elements:', await replaceContent(p, L.home(m), { hide_title: 'yes', template: 'elementor_header_footer' }));
  }

  // Inner pages. parent = slug of the parent page (petition pages live under /take-action/).
  const ids = {};
  for (const def of PAGES) {
    if (!want(def.key)) continue;
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    const pid = await p.evaluate(async ([def, parentId, nonceFn]) => {
      const h = { 'X-WP-Nonce': eval(`(${nonceFn})`)(), 'Content-Type': 'application/json' };
      const ex = (await (await fetch(`/wp-json/wp/v2/pages?slug=${def.slug}&status=publish,draft,private&_fields=id,parent`, { headers: h })).json())
        .find((x) => x.parent === (parentId || 0));
      const body = { title: def.title, slug: def.slug, status: 'publish', template: 'elementor_header_footer', parent: parentId || 0 };
      const r = await (await fetch(`/wp-json/wp/v2/pages${ex ? `/${ex.id}` : ''}`, { method: 'POST', headers: h, body: JSON.stringify(body) })).json();
      return r.id;
    }, [def, def.parent ? ids[def.parent] || (await p.evaluate(async ([slug, nonceFn]) => (await (await fetch(`/wp-json/wp/v2/pages?slug=${slug}&_fields=id`, { headers: { 'X-WP-Nonce': eval(`(${nonceFn})`)() } })).json())[0]?.id, [def.parent, nonce.toString()])) : 0, nonce.toString()]);
    ids[def.key] = pid;
    await openEditor(p, pid);
    console.log(def.key, pid, 'elements:', await replaceContent(p, L[def.build](m), { hide_title: 'yes', template: 'elementor_header_footer' }));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
