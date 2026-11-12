// Publishes the WD 2026 header/footer saved templates and the "New Design – Home" page through the
// Elementor editor (so Elementor validates the data and regenerates its CSS).
//   STATE=state.json MEDIA=media.json WD_FORM_EMAIL=... node deploy.cjs [header] [footer] [page]
// Creates only new, labelled items. Never touches existing posts, templates, menus or settings.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const B = require('./build.cjs');

const SITE = process.env.WP_URL || 'https://staging129.dreamweb.digital';
const MEDIA = JSON.parse(fs.readFileSync(process.env.MEDIA, 'utf8'));
const OUT = process.env.DEPLOYED || path.join(path.dirname(process.env.MEDIA), 'deployed.json');
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

const md = (f) => { const x = MEDIA[f]; if (!x) throw new Error(`missing media ${f}`); return { id: x.id, url: x.url, alt: x.alt }; };
const m = {
  logoColor: md('wd-2026-logo-color.png'), logoCompact: md('wd-2026-logo-compact.png'), logoReversed: md('wd-2026-logo-reversed.png'),
  signature: md('wd-2026-signature-ink.png'), atlanta: md('wd-2026-photo-atlanta.webp'),
  thumbAuto: md('wd-2026-thumb-auto.webp'), thumbTruck: md('wd-2026-thumb-truck.webp'), thumbPremises: md('wd-2026-thumb-premises.webp'),
  sara: md('wd-2026-headshot-sara.webp'), torrie: md('wd-2026-headshot-torrie.webp'), rebekah: md('wd-2026-headshot-rebekah.webp'),
  susan: md('wd-2026-headshot-susan.webp'), braxton: md('wd-2026-headshot-braxton.webp'),
  // Existing originals on staging (their alt text already matches SPEC.md)
  partners: { id: 1172, url: `${SITE}/wp-content/uploads/2026/11/Sara-Torrie-Partners.jpg` },
  angela: { id: 1173, url: `${SITE}/wp-content/uploads/2026/11/Angela.jpg` },
  arrowRight: md('wd-2026-icon-arrow-right.svg'), arrowLeft: md('wd-2026-icon-arrow-left.svg'), chevron: md('wd-2026-icon-chevron-down.svg'),
  phone: md('wd-2026-icon-phone.svg'), menu: md('wd-2026-icon-menu.svg'), globe: md('wd-2026-icon-globe.svg'),
  mail: md('wd-2026-icon-mail.svg'), pin: md('wd-2026-icon-map-pin.svg'), clock: md('wd-2026-icon-clock.svg'),
};
const css = (...files) => files.map((f) => fs.readFileSync(path.join(__dirname, 'css', f), 'utf8')).join('\n')
  .replace(/\{\{longhornGreen\}\}/g, md('wd-2026-longhorn-green-1600.png').url)
  .replace(/\{\{longhornIvory\}\}/g, md('wd-2026-longhorn-ivory-1600.png').url);

const args = process.argv.slice(2);
const want = (k) => args.length === 0 || args.includes(k);

async function findOrCreateTemplate(p, title) {
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=library`, { waitUntil: 'domcontentloaded' });
  const existing = await p.evaluate(async (title) => {
    const r = await fetch('/wp-json/wp/v2/elementor_library?per_page=100&status=any&context=edit&_fields=id,title', { headers: { 'X-WP-Nonce': wpApiSettings.nonce } });
    return (await r.json()).find((t) => t.title.raw === title)?.id;
  }, title);
  if (existing) return existing;
  const nonce = (await p.content()).match(/name="action" value="elementor_new_post">\s*<input type="hidden" name="_wpnonce" value="([0-9a-f]+)"/)[1];
  await p.goto(`${SITE}/wp-admin/edit.php?action=elementor_new_post&post_type=elementor_library&template_type=container&post_data%5Bpost_title%5D=${encodeURIComponent(title)}&_wpnonce=${nonce}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return Number(new URL(p.url()).searchParams.get('post'));
}

async function ensurePage(p) {
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  return p.evaluate(async () => {
    const h = { 'X-WP-Nonce': wpApiSettings.nonce, 'Content-Type': 'application/json' };
    const ex = await (await fetch('/wp-json/wp/v2/pages?slug=new-design&status=publish,draft,private,pending&_fields=id,link', { headers: h })).json();
    if (ex.length) return ex[0];
    const r = await fetch('/wp-json/wp/v2/pages', { method: 'POST', headers: h, body: JSON.stringify({ title: 'New Design – Home', slug: 'new-design', status: 'draft', template: 'elementor_canvas' }) });
    const j = await r.json();
    return { id: j.id, link: j.link };
  });
}

async function openEditor(p, postId) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${postId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(3000);
}

async function replaceContent(p, elements, settings) {
  return p.evaluate(async ([elements, settings]) => {
    const doc = elementor.documents.getCurrent();
    $e.run('document/elements/settings', { container: doc.container, settings, options: { external: true } });
    $e.run('document/elements/empty', { force: true });
    elements.forEach((model, at) => $e.run('document/elements/create', { container: doc.container, model, options: { at, edit: false } }));
    await $e.run('document/save/publish');
    const count = (els) => els.reduce((n, e) => n + 1 + count(e.elements || []), 0);
    return count(doc.container.model.get('elements').toJSON());
  }, [elements, settings]);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(180000); p.setDefaultNavigationTimeout(180000);
  p.on('dialog', (d) => d.accept());
  out.templates = out.templates || {};
  for (const [key, title, build, files] of [['header', 'WD 2026 – Header', B.header, ['base.css', 'header.css']], ['footer', 'WD 2026 – Footer', B.footer, ['base.css', 'footer.css']]]) {
    if (!out.templates[key]) out.templates[key] = await findOrCreateTemplate(p, title);
    if (!want(key)) continue;
    await openEditor(p, out.templates[key]);
    console.log(key, out.templates[key], 'elements:', await replaceContent(p, build(m), { custom_css: css(...files) }));
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  }
  if (want('page')) {
    if (!process.env.WD_FORM_EMAIL) throw new Error('WD_FORM_EMAIL is required for the page (form recipient)');
    const pg = await ensurePage(p);
    out.page = pg;
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
    await openEditor(p, pg.id);
    console.log('page', pg.id, 'elements:', await replaceContent(p, B.page(m, out.templates), { template: 'elementor_canvas', custom_css: css('base.css', 'page.css') }));
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  await ctx.storageState({ path: process.env.STATE });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
