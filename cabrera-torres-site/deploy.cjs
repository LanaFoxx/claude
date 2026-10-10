// Deploys the Cabrera Torres Law site to WordPress through the Elementor editor (so Elementor validates
// the data and regenerates CSS). Usage:
//   WP_URL=... STATE=playwright-state.json PREP=prep.json node deploy.cjs [chrome] [home] [seo] [unassign:<id>,<id>]
// "chrome" = header + footer templates, "seo" = Yoast title/description/keyphrase. No args = chrome + pages + seo.
const { chromium } = require('playwright');
const fs = require('fs');
const L = require('./lib.cjs');

const SITE = process.env.WP_URL;
if (!SITE) throw new Error('Set WP_URL');
const prep = JSON.parse(fs.readFileSync(process.env.PREP, 'utf8'));
const md = (f) => {
  const x = prep.media[f];
  if (!x || !x.id) throw new Error(`Missing media ${f}`);
  return { id: x.id, url: x.source_url, alt: '', source: 'library' };
};
const m = {
  logo: md('cabrera-torres-law-logo.webp'), emblem: md('cabrera-torres-law-emblem.webp'), pattern: md('cabrera-torres-law-art-deco-pattern.png'),
  jennifer: md('jennifer-cabrera-torres-personal-injury-attorney-norcross-ga.webp'),
  area_mva: md('car-accident-lawyer-norcross-ga.webp'), area_dog: md('dog-bite-lawyer-georgia.webp'), area_fall: md('slip-and-fall-lawyer-georgia.webp'),
  post_car: md('what-to-do-after-a-car-crash-georgia.webp'), post_dog: md('georgia-dog-bite-law-explained.webp'), post_fall: md('store-slip-and-fall-premises-liability.webp'),
};

const PAGES = ['home'].map((s) => require(`./pages/${s}.cjs`));

const args = process.argv.slice(2);
const want = (key) => args.length === 0 || args.includes(key);
const restNonce = () => window.wpApiSettings?.nonce || window.elementorCommon?.config?.rest?.nonce;

async function ensurePage(p, def) {
  return p.evaluate(async ([def, nonceFn]) => {
    const h = { 'X-WP-Nonce': eval(`(${nonceFn})`)(), 'Content-Type': 'application/json' };
    const ex = await (await fetch(`/wp-json/wp/v2/pages?slug=${def.slug}&status=publish,draft,private&_fields=id,link`, { headers: h })).json();
    if (ex.length) return ex[0];
    const r = await fetch('/wp-json/wp/v2/pages', { method: 'POST', headers: h, body: JSON.stringify({ title: def.title, slug: def.slug, status: 'publish', template: 'elementor_header_footer' }) });
    const j = await r.json();
    return { id: j.id, link: j.link };
  }, [{ slug: def.slug, title: def.title }, restNonce.toString()]);
}

async function findOrCreateTemplate(p, type, title) {
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=theme&elementor_library_type=${type}`, { waitUntil: 'domcontentloaded' });
  const existing = await p.evaluate(async (title) => {
    const r = await fetch('/wp-json/wp/v2/elementor_library?per_page=100&status=any&search=' + encodeURIComponent(title) + '&_fields=id,title', { headers: { 'X-WP-Nonce': wpApiSettings.nonce } });
    return (await r.json()).find((t) => t.title.rendered === title)?.id;
  }, title);
  if (existing) return existing;
  // Same URL Elementor's own "Add New" uses. The form lives in a <script type="text/template">.
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
  // WordPress reports "unchanged" meta as a failed save, so skip when already applied.
  const wanted = conditions.map((c) => [c.type, c.name, c.sub_name, c.sub_id].filter(Boolean).join('/'));
  const current = () => p.evaluate(async (id) => (await (await fetch(`/wp-json/wp/v2/elementor_library/${id}?context=edit&_fields=meta`, { headers: { 'X-WP-Nonce': elementorCommon.config.rest?.nonce || window.wpApiSettings?.nonce } })).json()).meta?._elementor_conditions || [], postId);
  if (JSON.stringify(await current()) === JSON.stringify(wanted)) return 'already set';
  // The save can lose a race with the document publish that just ran, so verify and retry.
  for (let attempt = 1; attempt <= 4; attempt++) {
    await p.waitForTimeout(2500);
    await p.evaluate((conditions) => new Promise((resolve, reject) => {
      elementorCommon.ajax.addRequest('pro_theme_builder_save_conditions', {
        data: { conditions }, success: resolve, error: (e) => reject(new Error(JSON.stringify(e))),
      }, true);
    }), conditions);
    await p.waitForTimeout(1500);
    if (JSON.stringify(await current()) === JSON.stringify(wanted)) return `ok (attempt ${attempt})`;
  }
  throw new Error(`Conditions for ${postId} did not save`);
}

// Yoast's Elementor integration keeps its fields in a hidden #yoast-form and saves them with the document.
async function setYoast(p, seo) {
  return p.evaluate(async (seo) => {
    const form = document.getElementById('yoast-form');
    if (!form) throw new Error('Yoast form not found in the Elementor editor');
    const set = (name, v) => { const el = form.querySelector(`[name="${name}"]`); if (!el) throw new Error(`Missing Yoast field ${name}`); el.value = v; };
    set('yoast_wpseo_title', seo.title);
    set('yoast_wpseo_metadesc', seo.description);
    set('yoast_wpseo_focuskw', seo.focus);
    const body = new FormData(form);
    body.set('action', 'wpseo_elementor_save');
    const r = await fetch(window.ajaxurl || '/wp-admin/admin-ajax.php', { method: 'POST', body, credentials: 'same-origin' });
    return `${r.status} ${(await r.text()).slice(0, 120)}`;
  }, seo);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  const out = {};

  // Take older theme-builder headers/footers off the site (kept as templates, just unassigned).
  const unassign = args.find((a) => a.startsWith('unassign:'));
  if (unassign) {
    for (const tid of unassign.slice(9).split(',').map(Number)) {
      await openEditor(p, tid);
      console.log('unassigned template', tid, await setConditions(p, tid, []));
    }
  }

  if (want('chrome')) {
    const entireSite = [{ type: 'include', name: 'general', sub_name: '', sub_id: '' }];
    for (const [type, title, els] of [['header', 'Cabrera Torres Header', L.header(m, prep.menu.id)], ['footer', 'Cabrera Torres Footer', L.footer(m)]]) {
      const tid = await findOrCreateTemplate(p, type, title);
      await openEditor(p, tid);
      console.log(type, tid, 'elements saved:', await replaceContent(p, els), '| conditions:', await setConditions(p, tid, entireSite));
      out[type] = tid;
    }
  }

  for (const def of PAGES) {
    if (!want(def.slug) && !want('seo')) continue;
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    const pg = await ensurePage(p, def);
    await openEditor(p, pg.id);
    if (want(def.slug)) console.log(def.slug, pg.id, 'elements saved:', await replaceContent(p, def.build(m), L.pageSettings));
    if (want('seo') && def.seo) console.log(def.slug, 'yoast:', await setYoast(p, def.seo));
    out[def.slug] = pg;
  }
  fs.writeFileSync(process.env.PREP.replace('prep.json', 'deployed.json'), JSON.stringify(out, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
