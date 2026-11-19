// Deploys the Junk Ninja site through the Elementor editor (Elementor validates the data and
// regenerates CSS). Usage:
//   WP_URL=... STATE=state.json PREP=prep.json node deploy.cjs [kit] [chrome] [home]
// kit = Site Settings (breakpoints, colors, fonts, global CSS); chrome = header + footer templates.
// No args = everything.
const { chromium } = require('playwright');
const fs = require('fs');
const L = require('./lib.cjs');

const SITE = process.env.WP_URL;
const prep = JSON.parse(fs.readFileSync(process.env.PREP, 'utf8'));
const md = (f) => {
  const x = prep.media[f];
  if (!x?.id) throw new Error(`Missing media ${f}`);
  return { id: x.id, url: x.source_url, alt: '', source: 'library' };
};
const wide = md('placeholder-wide.webp'), tall = md('placeholder-tall.webp');
const m = {
  logo: md('junk-ninja-logo.png'), logoWhite: md('junk-ninja-logo-white.png'), ninja: md('junk-ninja-mascot.png'),
  heroBg: md('job-trailer-load.webp'), aboutImg: md('job-trailer-branded.webp'),
  svcGarage: md('svc-garage.webp'), svcRental: md('svc-rental.webp'), svcFurniture: md('svc-furniture.webp'),
  // Not supplied as files yet: striped "Photo to come" placeholders, replace in Elementor.
  svcResidential: wide, svcAppliance: wide, svcEstate: wide, svcYard: wide, svcConstruction: wide,
  baGarage1Before: tall, baGarage1After: md('ba-garage-after.webp'), baGarage2Before: tall, baGarage2After: tall,
  baHottub1Before: tall, baHottub1After: tall, baHottub2Before: tall, baHottub2After: tall,
};
const PAGES = ['home'].map((s) => require(`./pages/${s}.cjs`));
const args = process.argv.slice(2);
const want = (k) => args.length === 0 || args.includes(k);

async function rest(p, method, url, data) {
  return p.evaluate(async ([method, url, data]) => {
    const n = await (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce')).text();
    const r = await fetch('/wp-json/' + url, { method, headers: { 'X-WP-Nonce': n, 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
    return r.json();
  }, [method, url, data]);
}

async function ensurePage(p, def) {
  const ex = await rest(p, 'GET', `wp/v2/pages?slug=${def.slug}&status=publish,draft,private&_fields=id,link`);
  if (ex.length) return ex[0];
  const j = await rest(p, 'POST', 'wp/v2/pages', { title: def.title, slug: def.slug, status: 'publish', template: 'elementor_header_footer' });
  return { id: j.id, link: j.link };
}

async function findOrCreateTemplate(p, type, title) {
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=theme&elementor_library_type=${type}`, { waitUntil: 'domcontentloaded' });
  const list = await rest(p, 'GET', `wp/v2/elementor_library?per_page=100&status=any&search=${encodeURIComponent(title)}&_fields=id,title`);
  const existing = Array.isArray(list) && list.find((t) => t.title.rendered === title)?.id;
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

async function saveKit(p, settings) {
  return p.evaluate(async (settings) => {
    await $e.run('panel/global/open');
    const kit = elementor.documents.get(elementor.config.kit_id);
    $e.run('document/elements/settings', { container: kit.container, settings, options: { external: true } });
    await $e.run('document/save/update', { document: kit, force: true });
    return elementor.config.kit_id;
  }, settings);
}

async function setConditions(p, postId, conditions) {
  // WordPress reports unchanged conditions as a failed save, so a repeat deploy lands here.
  return p.evaluate((conditions) => new Promise((resolve, reject) => {
    elementorCommon.ajax.addRequest('pro_theme_builder_save_conditions', { data: { conditions }, success: () => resolve('ok'), error: (e) => reject(new Error(JSON.stringify(e))) }, true);
  }), conditions).catch(() => 'already set');
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(180000); p.setDefaultNavigationTimeout(180000);
  p.on('dialog', (d) => d.accept());
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  const home = await ensurePage(p, PAGES[0]);

  if (want('kit')) {
    await rest(p, 'POST', 'wp/v2/settings', { title: 'Junk Ninja LLC', description: 'Clutter Removed, Serenity Restored', show_on_front: 'page', page_on_front: home.id, site_logo: prep.media['junk-ninja-logo.png'].id });
    await openEditor(p, home.id);
    console.log('kit', await saveKit(p, L.KIT));
  }
  if (want('chrome')) {
    const entireSite = [{ type: 'include', name: 'general', sub_name: '', sub_id: '' }];
    for (const [type, title, els] of [['header', 'Junk Ninja Header', L.header(m, prep.menu.id)], ['footer', 'Junk Ninja Footer', L.footer(m)]]) {
      const tid = await findOrCreateTemplate(p, type, title);
      await openEditor(p, tid);
      console.log(type, tid, 'elements:', await replaceContent(p, els), '| conditions:', await setConditions(p, tid, entireSite));
    }
  }
  for (const def of PAGES) {
    if (!want(def.slug)) continue;
    const pg = await ensurePage(p, def);
    await rest(p, 'POST', `wp/v2/pages/${pg.id}`, { template: 'elementor_header_footer' });
    await openEditor(p, pg.id);
    console.log(def.slug, pg.id, 'elements:', await replaceContent(p, def.build(m), { hide_title: 'yes' }));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
