// Deploys the RecordFLOW How-To Videos page + header/footer to the staging WordPress site
// through the Elementor editor (so Elementor validates the data and regenerates CSS).
// Usage: WP_URL=... STATE=path/to/playwright-state.json PREP=prep.json node deploy.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const E = require('./elements.cjs');

const SITE = process.env.WP_URL || 'https://staging192.dreamwebdigital.com';
const prep = JSON.parse(fs.readFileSync(process.env.PREP, 'utf8'));
const md = (f) => ({ id: prep.media[f].id, url: prep.media[f].source_url, alt: '', source: 'library' });
const m = {
  logoBlack: md('recordflow-logo-black.png'), logoWhite: md('recordflow-logo-white.png'),
  iconBlue: md('recordflow-icon-blue.png'), iconWhite: md('recordflow-icon-white.png'), dots: md('recordflow-dot-pattern.png'),
};
const PAGE_ID = prep.page.id;

async function findOrCreateTemplate(p, type, title) {
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=theme&elementor_library_type=${type}`, { waitUntil: 'domcontentloaded' });
  const existing = await p.evaluate(async (title) => {
    const r = await fetch('/wp-json/wp/v2/elementor_library?per_page=100&status=any&search=' + encodeURIComponent(title) + '&_fields=id,title', { headers: { 'X-WP-Nonce': wpApiSettings.nonce } });
    return (await r.json()).find((t) => t.title.rendered === title)?.id;
  }, title);
  if (existing) return existing;
  // Same URL Elementor's own "Add New" uses (Documents_Manager::get_create_new_post_url).
  // The form lives inside a <script type="text/template">, so read the nonce from the raw HTML.
  const nonce = (await p.content()).match(/action=elementor_new_post[^"']*_wpnonce=([0-9a-f]+)|name="action" value="elementor_new_post">\s*<input type="hidden" name="_wpnonce" value="([0-9a-f]+)"/).slice(1).find(Boolean);
  await p.goto(`${SITE}/wp-admin/edit.php?action=elementor_new_post&post_type=elementor_library&template_type=${type}&post_data%5Bpost_title%5D=${encodeURIComponent(title)}&_wpnonce=${nonce}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  if (!/action=elementor/.test(p.url())) throw new Error(`Could not create ${type} template: ${p.url()}`);
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
    const saved = doc.container.model.get('elements').toJSON();
    const count = (els) => els.reduce((n, e) => n + 1 + count(e.elements || []), 0);
    return count(saved);
  }, [elements, pageSettings]);
}

async function setConditions(p, postId, conditions) {
  // WordPress reports "unchanged" meta as a failed save, so skip when already applied.
  const wanted = conditions.map((c) => [c.type, c.name, c.sub_name, c.sub_id].filter(Boolean).join('/'));
  const current = await p.evaluate(async (id) => (await (await fetch(`/wp-json/wp/v2/elementor_library/${id}?context=edit&_fields=meta`, { headers: { 'X-WP-Nonce': elementorCommon.config.rest?.nonce || window.wpApiSettings?.nonce } })).json()).meta?._elementor_conditions || [], postId);
  if (JSON.stringify(current) === JSON.stringify(wanted)) return 'already set';
  return p.evaluate((conditions) => new Promise((resolve, reject) => {
    elementorCommon.ajax.addRequest('pro_theme_builder_save_conditions', {
      data: { conditions },
      success: () => resolve('ok'),
      error: (e) => reject(new Error(JSON.stringify(e))),
    }, true);
  }), conditions);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());

  const headerId = await findOrCreateTemplate(p, 'header', 'RecordFLOW Header');
  const footerId = await findOrCreateTemplate(p, 'footer', 'RecordFLOW Footer');
  console.log('templates', { headerId, footerId });

  const onlyThisPage = [{ type: 'include', name: 'singular', sub_name: 'page', sub_id: String(PAGE_ID) }];

  for (const [postId, label, els, conds, settings] of [
    [headerId, 'header', E.header(m, prep.menu.id), onlyThisPage, null],
    [footerId, 'footer', E.footer(m), onlyThisPage, null],
    [PAGE_ID, 'page', E.page(m), null, E.pageSettings],
  ]) {
    await openEditor(p, postId);
    const n = await replaceContent(p, els, settings);
    console.log(label, postId, 'elements saved:', n);
    if (conds) console.log(label, 'conditions:', await setConditions(p, postId, conds));
  }

  // Verify stored conditions.
  const meta = await p.evaluate(async (ids) => {
    const out = {};
    for (const id of ids) {
      const r = await fetch(`/wp-json/wp/v2/elementor_library/${id}?context=edit&_fields=meta`, { headers: { 'X-WP-Nonce': wpApiSettings.nonce } });
      out[id] = (await r.json()).meta?._elementor_conditions;
    }
    return out;
  }, [headerId, footerId]);
  console.log('stored conditions', JSON.stringify(meta));
  fs.writeFileSync(process.env.PREP.replace('prep.json', 'deployed.json'), JSON.stringify({ headerId, footerId, pageId: PAGE_ID }, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
