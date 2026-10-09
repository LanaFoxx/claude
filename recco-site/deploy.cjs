// Deploys the Recco Consulting site through the Elementor editor (so Elementor validates the
// data and regenerates CSS). Usage:
//   WP_URL=... STATE=playwright-state.json PREP=prep.json node deploy.cjs [chrome] [home] [kit]
// "chrome" = header + footer templates, "kit" = global colors/fonts. No args = everything.
const { chromium } = require('playwright');
const fs = require('fs');
const L = require('./lib.cjs');
const home = require('./home.cjs');

const SITE = process.env.WP_URL || 'https://staging154.dreamweb.digital';
const prep = JSON.parse(fs.readFileSync(process.env.PREP, 'utf8'));
const md = (f) => {
  const x = prep.media[f];
  if (!x || !x.id) throw new Error(`Missing media ${f}`);
  return { id: x.id, url: x.source_url, alt: '', source: 'library' };
};
const m = {
  logo: md('recco-consulting-logo.png'), arch: md('recco-arch.png'),
  heroTower: md('recco-hero-tower.jpg'), dome: md('recco-dome.jpg'), cityData: md('recco-city-data.jpg'),
  team: md('recco-team.jpg'), officeBokeh: md('recco-office-bokeh.jpg'),
  icOpenai: md('recco-icon-openai.png'), icAnthropic: md('recco-icon-anthropic.png'), icAzure: md('recco-icon-azure.png'),
  icGoogle: md('recco-icon-google.png'), icSalesforce: md('recco-icon-salesforce.png'), icServicenow: md('recco-icon-servicenow.png'),
  icSnowflake: md('recco-icon-snowflake.png'), icAws: md('recco-icon-aws.png'), icWorkday: md('recco-icon-workday.png'),
  logoOpenai: md('recco-logo-openai.png'), logoAnthropic: md('recco-logo-anthropic.png'), logoSalesforce: md('recco-logo-salesforce.png'),
  logoServicenow: md('recco-logo-servicenow.png'), logoMicrosoft: md('recco-logo-microsoft.png'),
};

const args = process.argv.slice(2);
const want = (key) => args.length === 0 || args.includes(key);

// REST calls run inside the logged-in page (SiteGround challenges Playwright's own HTTP client).
const rest = (p, route, opts = {}) => p.evaluate(async ([route, opts]) => {
  const nonce = window.wpApiSettings?.nonce || window.elementorCommon?.config?.rest?.nonce || await (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce')).text();
  const r = await fetch('/wp-json' + route, { method: opts.method || 'GET', headers: { 'X-WP-Nonce': nonce, 'Content-Type': 'application/json' }, body: opts.data ? JSON.stringify(opts.data) : undefined });
  return r.json();
}, [route, opts]);

async function ensurePage(p, def) {
  const ex = await rest(p, `/wp/v2/pages?slug=${def.slug}&status=publish,draft,private&_fields=id,link`);
  if (ex.length) return ex[0];
  const j = await rest(p, '/wp/v2/pages', { method: 'POST', data: { title: def.title, slug: def.slug, status: 'publish', template: 'elementor_header_footer' } });
  return { id: j.id, link: j.link };
}

async function findOrCreateTemplate(p, type, title) {
  await p.goto(`${SITE}/wp-admin/edit.php?post_type=elementor_library&tabs_group=theme&elementor_library_type=${type}`, { waitUntil: 'domcontentloaded' });
  const list = await rest(p, `/wp/v2/elementor_library?per_page=100&status=publish,draft,private&search=${encodeURIComponent(title)}&_fields=id,title`);
  const existing = list.find((t) => t.title.rendered === title)?.id;
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
  const wanted = JSON.stringify(conditions.map((c) => [c.type, c.name, c.sub_name, c.sub_id].filter(Boolean).join('/')));
  const current = async () => JSON.stringify((await rest(p, `/wp/v2/elementor_library/${postId}?context=edit&_fields=meta`)).meta?._elementor_conditions || []);
  // The save can be dropped when it runs straight after a publish, so retry until the meta reads back.
  for (let i = 0; i < 4; i++) {
    if (await current() === wanted) return 'ok';
    await p.waitForTimeout(2000);
    await p.evaluate((conditions) => new Promise((resolve) => {
      elementorCommon.ajax.addRequest('pro_theme_builder_save_conditions', { data: { conditions }, success: resolve, error: resolve }, true);
    }), conditions);
  }
  return (await current()) === wanted ? 'ok' : 'FAILED';
}

// Global colors + fonts in Site Settings, so anything the client adds later starts on-brand.
async function updateKit(p) {
  return p.evaluate(async () => {
    const kitId = elementor.config.kit_id;
    await $e.run('panel/global/open');
    await new Promise((r) => setTimeout(r, 2500));
    const kit = elementor.documents.get(kitId);
    const color = (_id, title, c) => ({ _id, title, color: c });
    const font = (_id, title, family, weight) => ({ _id, title, typography_typography: 'custom', typography_font_family: family, typography_font_weight: weight });
    $e.run('document/elements/settings', { container: kit.container, options: { external: true }, settings: {
      system_colors: [color('primary', 'Primary (navy)', '#1E495E'), color('secondary', 'Secondary (green)', '#95AB3B'), color('text', 'Text', '#4A5F6B'), color('accent', 'Accent', '#95AB3B')],
      custom_colors: [color('recco_gray', 'Gray', '#808285'), color('recco_line', 'Lines', '#DFE6EA'), color('recco_tint', 'Tint', '#F4F7F8')],
      system_typography: [font('primary', 'Headings', 'Source Serif 4', '300'), font('secondary', 'Subheadings', 'Manrope', '600'), font('text', 'Body', 'Manrope', '400'), font('accent', 'Buttons', 'Manrope', '600')],
      body_color: '#4A5F6B', body_typography_typography: 'custom', body_typography_font_family: 'Manrope',
      link_normal_color: '#1E495E', link_hover_color: '#95AB3B',
      site_name: 'Recco Consulting', site_description: 'Independent technology advisory',
    } });
    await $e.run('document/save/update', { document: kit, force: true });
    await $e.run('panel/global/close').catch?.(() => {});
    return kitId;
  });
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
  const out = {};

  if (want('chrome')) {
    const entireSite = [{ type: 'include', name: 'general', sub_name: '', sub_id: '' }];
    for (const [type, title, els] of [['header', 'Recco Header', L.header(m, prep.menu.id)], ['footer', 'Recco Footer', L.footer(m)]]) {
      const tid = await findOrCreateTemplate(p, type, title);
      await openEditor(p, tid);
      console.log(type, tid, 'elements saved:', await replaceContent(p, els), '| conditions:', await setConditions(p, tid, entireSite));
      out[type] = tid;
    }
  }

  if (want('home')) {
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });
    const pg = await ensurePage(p, home);
    await openEditor(p, pg.id);
    console.log('home', pg.id, 'elements saved:', await replaceContent(p, home.build(m), L.pageSettings));
    const s = await rest(p, '/wp/v2/settings', { method: 'POST', data: { show_on_front: 'page', page_on_front: pg.id } });
    console.log('front page:', s.page_on_front);
    out.home = pg;
  }

  if (want('kit')) {
    if (!out.home) { const pg = await ensurePage(p, home); await openEditor(p, pg.id); }
    console.log('kit updated:', await updateKit(p));
  }

  fs.writeFileSync(process.env.PREP.replace('prep.json', 'deployed.json'), JSON.stringify(out, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
