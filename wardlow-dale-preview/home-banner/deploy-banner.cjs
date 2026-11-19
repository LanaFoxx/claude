// Replaces ONLY the hero section (Elementor id 32e60168) of the existing staging Home page (457)
// with the client's banner, rebuilt as live text. Everything else on the page is left as is.
//   STATE=state.json MEDIA=banner-media.json node deploy-banner.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const L = require('../lib.cjs');
const { C, W, px, box, cbox, gap } = L;
const SITE = 'https://staging129.dreamweb.digital';
const OLD_HERO = '32e60168';
const M = JSON.parse(fs.readFileSync(process.env.MEDIA, 'utf8'));
const md = (f) => ({ id: M[f].id, url: M[f].url, alt: M[f].alt });
const IVORY = '#F5EFE2', GOLD = '#C9A961', GREEN = '#05291F';
const font = (prefix, family, size, weight, o = {}) => ({
  [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: family, [`${prefix}_font_weight`]: String(weight),
  [`${prefix}_font_size`]: typeof size === 'string' ? { unit: 'custom', size, sizes: [] } : px(size),
  ...(o.lh ? { [`${prefix}_line_height`]: px(o.lh, 'em') } : {}),
  ...(o.ls !== undefined ? { [`${prefix}_letter_spacing`]: px(o.ls, 'em') } : {}),
  ...(o.transform ? { [`${prefix}_text_transform`]: o.transform } : {}),
  ...(o.style ? { [`${prefix}_font_style`]: o.style } : {}),
});
const svg = (m) => ({ value: { id: m.id, url: m.url }, library: 'svg' });
const item = (icon, label) => C('wd-hb-item', { dir: 'row', align: 'center', gap: 14 }, [
  W('icon', 'wd-hb-ico', { selected_icon: svg(icon), primary_color: GOLD, size: px(40) }),
  W('heading', 'wd-hb-lab', { title: label, header_size: 'p', title_color: IVORY, ...font('typography', 'Poppins', 15, 600, { lh: 1.25, ls: 0.06, transform: 'uppercase' }) }),
]);

const CSS = `
selector{overflow:hidden}
selector .wd-hb-gold{background:linear-gradient(180deg,#F1DC9C 0%,#D4B061 45%,#A9822F 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
selector .wd-hb-copy{padding:96px 40px 96px max(80px, calc((100% - 1280px) / 2))}
selector .wd-hb-rule{width:160px;height:3px;background:#C9A961;margin:8px 0 4px}
selector .wd-hb-items{flex-wrap:wrap;row-gap:20px}
selector .wd-hb-items>.e-con{--width:auto;width:auto;flex:0 0 auto}
selector .wd-hb-item + .wd-hb-item{border-left:1px solid #C9A961;padding-left:28px;margin-left:4px}
selector .wd-hb-ico .elementor-icon{display:flex;color:#C9A961}
selector .wd-hb-ico svg{width:40px;height:40px;fill:none !important;stroke:currentColor}
selector .wd-hb-photo{align-self:stretch;position:relative;min-height:560px}
selector .wd-hb-photo .elementor-widget-image,selector .wd-hb-photo img{position:absolute;inset:0;width:100%;height:100%}
selector .wd-hb-photo img{object-fit:cover;object-position:left top}
selector .wd-hb-cta .elementor-button{background-color:#C9A961 !important;color:#05291F !important}
selector .wd-hb-cta .elementor-button:hover{background-color:#D6BB7B !important}
@media (max-width:1180px){
 selector .wd-hb-items{display:grid !important;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:0 !important}
 selector .wd-hb-item{flex-direction:column !important;align-items:flex-start !important;gap:8px !important;padding:0 10px !important;margin:0 !important}
 selector .wd-hb-item:first-child{padding-left:0 !important}
 selector .wd-hb-lab .elementor-heading-title{font-size:13px !important}
 selector .wd-hb-ico svg{width:30px;height:30px}
}
@media (max-width:1024px){
 selector .wd-hb-copy{padding:72px 32px 72px 40px}
 selector .wd-hb-photo{min-height:480px}
}
@media (max-width:767px){
 selector{flex-direction:column !important}
 selector .wd-hb-copy{width:100% !important;padding:48px 20px 32px}
 selector .wd-hb-photo{width:100% !important;min-height:0;height:420px}
 selector .wd-hb-photo img{object-position:60% top}
}`;

function banner(oldButton) {
  const btn = JSON.parse(JSON.stringify(oldButton));
  btn.id = L.id();
  btn.settings._css_classes = `${btn.settings._css_classes || ''} wd-hb-cta`.trim();
  btn.settings._margin = { unit: 'px', top: '12', right: '0', bottom: '0', left: '0', isLinked: false };
  return C('wd-hb', {
    dir: 'row', align: 'stretch', bg: GREEN, minH: 620, tag: 'section',
    extra: { custom_css: CSS, _title: 'Home banner (client, Nov 2026)', overflow: 'hidden' },
  }, [
    C('wd-hb-copy', { justify: 'center', gap: 20, extra: { width: px(56, '%'), width_tablet: px(58, '%') } }, [
      W('heading', 'wd-hb-h1', {
        title: '<span class="wd-hb-gold">Injured</span> in a<br>car accident?', header_size: 'h1', title_color: IVORY,
        ...font('typography', 'Cinzel', 'clamp(36px, 4.7vw, 70px)', 600, { lh: 1.08, ls: 0.01, transform: 'uppercase' }),
      }),
      W('text-editor', 'wd-hb-tag', {
        editor: '<p>You don’t have to fight the insurance company alone.</p>', text_color: IVORY,
        ...font('typography', 'Poppins', 'clamp(17px, 1.6vw, 23px)', 400, { lh: 1.4, style: 'italic' }),
      }),
      W('html', 'wd-hb-rule-w', { html: '<div class="wd-hb-rule" role="presentation"></div>' }),
      C('wd-hb-items', { dir: 'row', align: 'center', gap: 24 }, [
        item(md('wd-home-banner-icon-car.svg'), 'Car<br>accidents'),
        item(md('wd-home-banner-icon-truck.svg'), 'Trucking<br>accidents'),
        item(md('wd-home-banner-icon-shield.svg'), 'UM<br>claims'),
      ]),
      btn,
    ]),
    C('wd-hb-photo', { extra: { width: px(44, '%'), width_tablet: px(42, '%') } }, [
      W('image', 'wd-hb-img', { image: { ...md('wd-home-banner-partners.webp'), source: 'library' }, image_size: 'full' }),
    ]),
  ], false);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(180000);
  await p.goto(`${SITE}/wp-admin/post.php?post=457&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(3000);
  // Target: a banner from an earlier run (by its title), else the original hero section.
  const target = await p.evaluate((fallback) => {
    const top = elementor.documents.getCurrent().container.children;
    const prev = top.find((c) => (c.settings.get('_title') || '').startsWith('Home banner'));
    return prev ? prev.id : fallback;
  }, OLD_HERO);
  const oldButton = await p.evaluate((id) => {
    const c = elementor.getContainer(id); if (!c) return null;
    const find = (e) => (e.widgetType === 'button' ? e : (e.elements || []).map(find).find(Boolean));
    return find(c.model.toJSON());
  }, target);
  if (!oldButton) throw new Error('hero section not found; nothing changed');
  const r = await p.evaluate(async ([id, model]) => {
    const doc = elementor.documents.getCurrent();
    const old = elementor.getContainer(id);
    const at = doc.container.children.indexOf(old);
    $e.run('document/elements/create', { container: doc.container, model, options: { at, edit: false } });
    $e.run('document/elements/delete', { container: old });
    await $e.run('document/save/publish');
    return { at, first: doc.container.model.get('elements').at(0).get('settings').get('_title'), count: doc.container.children.length };
  }, [target, banner(oldButton)]);
  console.log('replaced hero at index', r.at, '| first section now:', r.first, '| top-level sections:', r.count);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
