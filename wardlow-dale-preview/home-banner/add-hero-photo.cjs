// Adds the Sara & Torrie photo to the ORIGINAL Home hero (right side). Nothing else in the hero changes.
// Re-running replaces the photo widget it added before.
//   STATE=state.json MEDIA=hero-media.json node add-hero-photo.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const M = JSON.parse(fs.readFileSync(process.env.MEDIA, 'utf8'))['wd-home-hero-partners.webp'];
const CSS = `
selector{position:absolute !important;right:0;bottom:0;width:clamp(440px, calc(100% - 770px), 720px) !important;max-width:none !important;z-index:1;margin:0 !important;pointer-events:none}
selector img{display:block;width:100%;height:auto}
@media (max-width:1180px){selector{position:relative !important;right:auto;bottom:auto;align-self:flex-end;width:min(100%, 600px) !important;margin:32px 0 0 !important}}
@media (max-width:767px){selector{width:calc(100% + 40px) !important;margin:24px -20px 0 !important}}`;
const widget = {
  id: Math.random().toString(16).slice(2, 9), elType: 'widget', widgetType: 'image', elements: [],
  settings: { image: { id: M.id, url: M.url, alt: M.alt, source: 'library' }, image_size: 'full', _title: 'Hero photo (client, Nov 2026)', _css_classes: 'wd-hero-photo-client', custom_css: CSS },
};
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.goto('https://staging129.dreamweb.digital/wp-admin/post.php?post=457&action=elementor', { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(3000);
  console.log(await p.evaluate(async (model) => {
    const doc = elementor.documents.getCurrent();
    const hero = doc.container.children[0];
    const json = JSON.stringify(hero.model.toJSON());
    if (!json.includes('Injured?')) return 'first section is not the original hero; nothing changed';
    const prev = hero.children.find((c) => (c.settings.get('_title') || '').startsWith('Hero photo'));
    if (prev) $e.run('document/elements/delete', { container: prev });
    $e.run('document/elements/create', { container: hero, model, options: { at: hero.children.length, edit: false } });
    await $e.run('document/save/publish');
    return 'photo added to hero ' + hero.id + (prev ? ' (replaced previous)' : '');
  }, widget));
  await b.close();
})();
