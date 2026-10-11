// Preferred Parking: builds the "Pay a Mailed Violation" page and publishes the redesigned
// Pay Violations page with its "Pay Violation by Mail" button linked to it.
// Usage: STATE=playwright-state.json node deploy.cjs [mailed] [pay]   (no args = both)
const { chromium } = require('playwright');

const SITE = process.env.WP_URL || 'https://public.preferredparking.com';
const PAY_ID = 1631;
const BG = { url: `${SITE}/wp-content/uploads/2026/01/shutterstock_2665117395-scaled.jpg`, id: 1685, size: '', alt: '', source: 'library' };
const RED = 'globals/colors?id=c5486af';
const MAIL_BTN_ID = '12d6f1d';
const COMPANIES = ['Flash', 'ParkPliant - Pay My Parking Fee', 'Pave Mobility - Professional Parking Management'];

const id = () => Math.random().toString(16).slice(2, 9);
const px = (size) => ({ unit: 'px', size, sizes: [] });
const box = (t, r, b, l) => ({ unit: 'px', top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: false });
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });
const container = (settings, elements) => ({ id: id(), elType: 'container', isInner: false, settings, elements });
const text = (html, s = {}) => widget('text-editor', { editor: html, text_color: '#FFFFFF', ...s });

const mailedPage = (payUrl) => [container({
  content_width: 'full', flex_direction: 'column', flex_gap: { unit: 'px', size: 0, column: '0', row: '0' },
  min_height: { unit: 'vh', size: 90, sizes: [] },
  background_background: 'classic', background_image: BG, background_position: 'center center', background_size: 'cover',
  background_overlay_background: 'classic', background_overlay_color: '#000000', background_overlay_opacity: px(0.68),
  padding: box(24, 75, 120, 75), padding_tablet: box(24, 40, 100, 40), padding_mobile: box(20, 20, 70, 20),
}, [
  text(`<p><a href="${payUrl}" style="color:#FFFFFF">Pay Violations</a>&nbsp;&nbsp;/&nbsp;&nbsp;<span style="opacity:.8">Mailed Violation</span></p>`, {
    typography_typography: 'custom', typography_font_size: px(16), _margin: box(0, 0, 18, 0),
  }),
  text(`<p><span style="font-size:20px">&larr;</span>&nbsp;&nbsp;<a href="${payUrl}" style="color:#FFFFFF;text-decoration:underline">Back to Pay Violations</a></p>`, {
    typography_typography: 'custom', typography_font_size: px(16), _margin: box(0, 0, 40, 0),
  }),
  container({ content_width: 'full', flex_direction: 'column', flex_align_items: 'center', flex_gap: { unit: 'px', size: 20, column: '20', row: '20' }, padding: box(0, 0, 0, 0) }, [
    widget('heading', {
      title: 'Pay a Mailed Violation', header_size: 'h1', align: 'center',
      typography_typography: 'custom', typography_font_family: 'Bebas Neue', typography_font_weight: '500',
      typography_font_size: px(72), typography_font_size_tablet: px(60), typography_font_size_mobile: px(46),
      typography_line_height: { unit: 'em', size: 1.05, sizes: [] }, typography_text_transform: 'uppercase',
      __globals__: { title_color: RED }, _margin: box(0, 0, 10, 0),
    }),
    text('<p>Preferred Parking sends violations via mail through the following companies:</p>', {
      align: 'center', typography_typography: 'custom', typography_font_size: px(30), typography_font_size_tablet: px(24), typography_font_size_mobile: px(20),
      typography_line_height: { unit: 'em', size: 1.25, sizes: [] }, _element_width: 'initial', _element_custom_width: px(800), _element_custom_width_mobile: { unit: '%', size: 100, sizes: [] },
    }),
    ...COMPANIES.map((name, i) => widget('heading', {
      title: name, header_size: 'h2', align: 'center', title_color: '#FFFFFF',
      typography_typography: 'custom', typography_font_family: 'Roboto', typography_font_weight: '700',
      typography_font_size: px(i === 0 ? 50 : 44), typography_font_size_tablet: px(34), typography_font_size_mobile: px(26),
      typography_line_height: { unit: 'em', size: 1.2, sizes: [] },
    })),
    text('<p>Please read the directions on your violation letter or ticket to pay your violation.</p>', {
      align: 'center', typography_typography: 'custom', typography_font_size: px(30), typography_font_size_tablet: px(24), typography_font_size_mobile: px(20),
      typography_line_height: { unit: 'em', size: 1.25, sizes: [] }, _element_width: 'initial', _element_custom_width: px(820), _element_custom_width_mobile: { unit: '%', size: 100, sizes: [] },
      _margin: box(30, 0, 0, 0),
    }),
  ]),
])];

const nonce = () => window.wpApiSettings?.nonce || window.elementorCommon?.config?.rest?.nonce;

async function openEditor(p, postId) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${postId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(3000);
}

(async () => {
  const args = process.argv.slice(2);
  const want = (k) => !args.length || args.includes(k);
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' });

  // Find or create the child page /lookup-pay-violations/mailed-violation/.
  const page = await p.evaluate(async ([nonceFn, parent]) => {
    const h = { 'X-WP-Nonce': eval(`(${nonceFn})`)(), 'Content-Type': 'application/json' };
    const ex = await (await fetch('/wp-json/wp/v2/pages?slug=mailed-violation&status=publish,draft,private&_fields=id,link', { headers: h })).json();
    if (ex.length) return ex[0];
    const r = await fetch('/wp-json/wp/v2/pages', { method: 'POST', headers: h, body: JSON.stringify({ title: 'Mailed Violation', slug: 'mailed-violation', parent, status: 'publish' }) });
    const j = await r.json();
    return { id: j.id, link: j.link };
  }, [nonce.toString(), PAY_ID]);
  const payUrl = `${SITE}/lookup-pay-violations/`;
  console.log('mailed page', page);

  if (want('mailed')) {
    await openEditor(p, page.id);
    console.log('mailed saved:', await p.evaluate(async (els) => {
      const doc = elementor.documents.getCurrent();
      $e.run('document/elements/settings', { container: doc.container, settings: { hide_title: 'yes', template: 'default' }, options: { external: true } });
      $e.run('document/elements/empty', { force: true });
      els.forEach((model, at) => $e.run('document/elements/create', { container: doc.container, model, options: { at, edit: false } }));
      await $e.run('document/save/publish');
      return 'ok';
    }, mailedPage(payUrl)));
  }

  if (want('pay')) {
    // The editor loads the newest autosave (the redesigned two-column layout); point the
    // mail button at the new page and publish it.
    await openEditor(p, PAY_ID);
    console.log('pay saved:', await p.evaluate(async ([btnId, url]) => {
      const c = elementor.getContainer(btnId);
      if (!c) throw new Error('mail button not found');
      $e.run('document/elements/settings', { container: c, settings: { link: { url, is_external: '', nofollow: '', custom_attributes: '' } } });
      await $e.run('document/save/publish');
      return c.settings.get('link').url;
    }, [MAIL_BTN_ID, page.link]));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
