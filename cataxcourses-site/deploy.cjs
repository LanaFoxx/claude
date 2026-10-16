// Deploys the cataxcourses.com redesign through the Elementor editor (so Elementor validates the
// data and regenerates CSS).
//   STATE=playwright-state.json PREP=prep.json MEDIA_DIR=dir node deploy.cjs <step...>
// Steps: media | chrome | snippet | preview | live-home
//   media      upload images/video (idempotent, by file name), write PREP
//   chrome     build the header + footer library templates
//   snippet    install/update the preview snippet (header/footer IDs + LIVE pages from PREP)
//   preview    build the private preview page /new-home/
//   live-home  put the design on the real homepage (page 65) and add it to the live list
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const chrome = require('./chrome.cjs');
const home = require('./pages/home.cjs');

const SITE = 'https://cataxcourses.com';
const PREP = process.env.PREP;
const prep = fs.existsSync(PREP) ? JSON.parse(fs.readFileSync(PREP, 'utf8')) : { media: {}, live: [] };
const save = () => fs.writeFileSync(PREP, JSON.stringify(prep, null, 1));
const nonce = () => window.wpApiSettings?.nonce || window.elementorCommon?.config?.rest?.nonce || window.elementor?.config?.rest?.nonce;

const FILES = ['ctc-seal-mark.png', 'ctc-badge-ctec-approved-provider.png', 'ctc-badge-irs-approved-ce.png', 'ctc-badge-trustpilot.png',
  'ctc-badge-business-consumer-alliance.png', 'ctc-student-mug-1.jpg', 'ctc-student-mug-2.jpg', 'ctc-student-mug-3.jpg', 'ctc-student-mug-4.jpg',
  'ctc-laptop-animation.mp4', 'ctc-laptop-animation-poster.jpg'];
const ALT = {
  'ctc-badge-ctec-approved-provider.png': 'CTEC Approved Education Provider', 'ctc-badge-irs-approved-ce.png': 'Approved IRS Continuing Education Provider',
  'ctc-badge-trustpilot.png': 'Trustpilot', 'ctc-badge-business-consumer-alliance.png': 'Proud Member Business Consumer Alliance',
  'ctc-student-mug-1.jpg': 'Student with California Tax Courses mug', 'ctc-student-mug-2.jpg': 'Student with California Tax Courses mug',
  'ctc-student-mug-3.jpg': 'Student with California Tax Courses mug', 'ctc-student-mug-4.jpg': 'Student with California Tax Courses mug',
};

function mediaMap() {
  const md = (f) => { const x = prep.media[f]; if (!x) throw new Error(`Missing media ${f}`); return { id: x.id, url: x.url, alt: ALT[f] || '', source: 'library' }; };
  return {
    logo: { id: 5615, url: `${SITE}/wp-content/uploads/2020/09/California-Tax-Courses-Logo-Gold-500px.png`, alt: 'California Tax Courses', source: 'library' },
    seal: md('ctc-seal-mark.png'), ctec: md('ctc-badge-ctec-approved-provider.png'), irs: md('ctc-badge-irs-approved-ce.png'),
    trustpilot: md('ctc-badge-trustpilot.png'), bca: md('ctc-badge-business-consumer-alliance.png'),
    mugs: [1, 2, 3, 4].map((i) => md(`ctc-student-mug-${i}.jpg`)),
    laptopVideo: md('ctc-laptop-animation.mp4'), laptopPoster: md('ctc-laptop-animation-poster.jpg'),
  };
}

async function admin(p) {
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  if (p.url().includes('wp-login')) throw new Error('Not logged in (refresh STATE)');
}

async function uploadMedia(p) {
  await admin(p);
  for (const f of FILES) {
    if (prep.media[f]) continue;
    const b64 = fs.readFileSync(path.join(process.env.MEDIA_DIR, f)).toString('base64');
    const r = await p.evaluate(async ([f, b64, alt, nonceFn]) => {
      const h = { 'X-WP-Nonce': eval(`(${nonceFn})`)() };
      const slug = f.replace(/\.[a-z0-9]+$/, '');
      const ex = await (await fetch(`/wp-json/wp/v2/media?search=${slug}&per_page=20&_fields=id,source_url,slug`, { headers: h })).json();
      const hit = ex.find((x) => x.source_url.split('/').pop() === f);
      if (hit) return { id: hit.id, url: hit.source_url, existed: true };
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const type = f.endsWith('.mp4') ? 'video/mp4' : f.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
      const res = await fetch('/wp-json/wp/v2/media', { method: 'POST', headers: { ...h, 'Content-Type': type, 'Content-Disposition': `attachment; filename="${f}"` }, body: bin });
      const j = await res.json();
      if (!j.id) return { error: JSON.stringify(j).slice(0, 300) };
      if (alt) await fetch(`/wp-json/wp/v2/media/${j.id}`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ alt_text: alt }) });
      return { id: j.id, url: j.source_url };
    }, [f, b64, ALT[f] || '', nonce.toString()]);
    if (r.error) throw new Error(`${f}: ${r.error}`);
    prep.media[f] = { id: r.id, url: r.url };
    save();
    console.log('media', f, r.id, r.existed ? '(existed)' : '');
  }
}

async function openEditor(p, postId) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${postId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.loaded && elementor.documents?.getCurrent?.()?.container?.model?.get?.('elements') && elementor.$previewContents?.find('.elementor-edit-area').length, null, { timeout: 240000 });
  await p.waitForTimeout(3000);
}

async function replaceContent(p, elements, status, pageSettings) {
  const r = await p.evaluate(async ([elements, status, pageSettings]) => {
    const doc = elementor.documents.getCurrent();
    const missing = [...new Set(JSON.stringify(elements).match(/"widgetType":"[^"]+"/g).map((s) => s.slice(14, -1)))].filter((w) => !elementor.widgetsCache[w]);
    if (missing.length) return { error: 'missing widgets: ' + missing.join(',') };
    if (pageSettings) $e.run('document/elements/settings', { container: doc.container, settings: pageSettings, options: { external: true } });
    $e.run('document/elements/empty', { force: true });
    elements.forEach((model, at) => $e.run('document/elements/create', { container: doc.container, model, options: { at, edit: false } }));
    const count = (els) => els.reduce((n, e) => n + 1 + count(e.elements || []), 0);
    const n = count(doc.container.model.get('elements').toJSON());
    await $e.run('document/save/default', { status, force: true });
    return { n };
  }, [elements, status, pageSettings]);
  if (r.error || !r.n) throw new Error(r.error || 'no elements created');
  return r.n;
}

async function findOrCreateTemplate(p, title) {
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=library`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const existing = await p.evaluate(async ([title, nonceFn]) => {
    const r = await fetch('/wp-json/wp/v2/elementor_library?per_page=100&status=any&search=' + encodeURIComponent(title) + '&_fields=id,title', { headers: { 'X-WP-Nonce': eval(`(${nonceFn})`)() } });
    return (await r.json()).find((t) => t.title.rendered === title)?.id;
  }, [title, nonce.toString()]);
  if (existing) return existing;
  const n = (await p.content()).match(/name="action" value="elementor_new_post">\s*<input type="hidden" name="_wpnonce" value="([0-9a-f]+)"/)[1];
  await p.goto(`${SITE}/wp-admin/edit.php?action=elementor_new_post&post_type=elementor_library&template_type=section&post_data%5Bpost_title%5D=${encodeURIComponent(title)}&_wpnonce=${n}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  return Number(new URL(p.url()).searchParams.get('post'));
}

async function buildChrome(p) {
  const m = mediaMap();
  for (const [key, title, els] of [['header', 'CTC Header (new design)', chrome.header(m)], ['footer', 'CTC Footer (new design)', chrome.footer(m)]]) {
    const tid = await findOrCreateTemplate(p, title);
    prep[key] = tid; save();
    await openEditor(p, tid);
    console.log(key, tid, 'elements', await replaceContent(p, els, 'publish'));
  }
}

async function installSnippet(p) {
  const code = fs.readFileSync(path.join(__dirname, 'wp/preview-snippet.php'), 'utf8')
    .replace('__CTC_HEADER_ID__', String(prep.header || 0)).replace('__CTC_FOOTER_ID__', String(prep.footer || 0))
    .replace('__CTC_LIVE_PAGES__', (prep.live || []).join(', '));
  await admin(p);
  const r = await p.evaluate(async ([code, nonceFn]) => {
    const h = { 'X-WP-Nonce': eval(`(${nonceFn})`)(), 'Content-Type': 'application/json' };
    const list = await (await fetch('/wp-json/code-snippets/v1/snippets', { headers: h })).json();
    const ex = list.find((s) => s.name === 'CTC Elementor preview (temporary)');
    const res = await fetch('/wp-json/code-snippets/v1/snippets' + (ex ? '/' + ex.id : ''), { method: ex ? 'PUT' : 'POST', headers: h,
      body: JSON.stringify({ name: 'CTC Elementor preview (temporary)', code, scope: 'front-end', active: true, desc: 'Renders Elementor pages (private previews + pages switched live one by one) while Oxygen is active. Remove a page ID from ctc_live_pages() to roll it back.' }) });
    const j = await res.json();
    return { status: res.status, active: j.active, id: j.id, err: j.code_error || j.message };
  }, [code, nonce.toString()]);
  console.log('snippet', r);
  if (r.status !== 200 && r.status !== 201) throw new Error('snippet failed');
}

async function ensurePage(p, slug, title, status) {
  await admin(p);
  return p.evaluate(async ([slug, title, status, nonceFn]) => {
    const h = { 'X-WP-Nonce': eval(`(${nonceFn})`)(), 'Content-Type': 'application/json' };
    const ex = await (await fetch(`/wp-json/wp/v2/pages?slug=${slug}&status=publish,draft,private&_fields=id`, { headers: h })).json();
    if (ex.length) return ex[0].id;
    const j = await (await fetch('/wp-json/wp/v2/pages', { method: 'POST', headers: h, body: JSON.stringify({ title, slug, status, template: 'elementor_header_footer' }) })).json();
    return j.id;
  }, [slug, title, status, nonce.toString()]);
}

const PAGE_SETTINGS = { template: 'elementor_header_footer', hide_title: 'yes', background_background: 'classic', background_color: '#FFFFFF' };

async function buildPreview(p) {
  const pid = await ensurePage(p, home.slug, home.title, 'private');
  prep.preview = pid; save();
  await openEditor(p, pid);
  console.log('preview page', pid, 'elements', await replaceContent(p, home.build(mediaMap()), 'private', PAGE_SETTINGS));
}

async function liveHome(p) {
  const pid = home.liveId;
  await admin(p);
  // Let the editor preview of page 65 render with Elementor (public view unaffected until it is in the live list).
  const r = await p.evaluate(async ([pid, nonceFn]) => {
    const h = { 'X-WP-Nonce': eval(`(${nonceFn})`)(), 'Content-Type': 'application/json' };
    const before = await (await fetch(`/wp-json/wp/v2/pages/${pid}?context=edit&_fields=slug,status,link,template,yoast_head_json`, { headers: h })).json();
    const res = await fetch(`/wp-json/wp/v2/pages/${pid}`, { method: 'POST', headers: h, body: JSON.stringify({ template: 'elementor_header_footer', meta: { _elementor_edit_mode: 'builder' } }) });
    return { before: { slug: before.slug, status: before.status, link: before.link, template: before.template, title: before.yoast_head_json?.title, desc: before.yoast_head_json?.description }, status: res.status };
  }, [pid, nonce.toString()]);
  console.log('page 65 before', r);
  fs.writeFileSync(PREP.replace(/\.json$/, '-home-before.json'), JSON.stringify(r.before, null, 1));
  await openEditor(p, pid);
  console.log('homepage elements', await replaceContent(p, home.build(mediaMap()), 'publish', PAGE_SETTINGS));
  prep.live = [...new Set([...(prep.live || []), pid])]; save();
  await installSnippet(p);
}

(async () => {
  const steps = process.argv.slice(2);
  const b = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { if (!/Failed to fetch/.test(e.message)) console.log('PAGEERR', e.message.slice(0, 200)); });
  for (const s of steps) {
    if (s === 'media') await uploadMedia(p);
    else if (s === 'chrome') await buildChrome(p);
    else if (s === 'snippet') await installSnippet(p);
    else if (s === 'preview') await buildPreview(p);
    else if (s === 'live-home') await liveHome(p);
    else throw new Error('unknown step ' + s);
  }
  await ctx.storageState({ path: process.env.STATE });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
