const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: 'state.json', viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  p.setDefaultTimeout(180000);
  for (const id of [55, 682]) {
    await p.goto(`https://eazyerrands.com/wp-admin/post.php?post=${id}&action=elementor`, { waitUntil: 'load' });
    await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container); await p.waitForTimeout(3000);
    console.log(id, await p.evaluate(async () => {
      const out = []; const walk = (c) => { c.children?.forEach((k) => { 
        const t = k.settings.get('title');
        if (k.model.get('widgetType') === 'heading' && ['Registered &', 'Background Screened', 'Registered With', 'Florida AHCA'].includes(t)) {
          $e.run('document/elements/settings', { container: k, settings: { align_mobile: 'center', align_tablet: 'center' }, options: { external: true } }); out.push(t); }
        walk(k); }); };
      walk(elementor.documents.getCurrent().container);
      const tag = elementor.getContainer('08ad6c9');
      if (tag) { $e.run('document/elements/settings', { container: tag, settings: { _element_custom_width: { unit: 'px', size: 640, sizes: [] }, typography_font_size: { unit: 'px', size: 19, sizes: [] } }, options: { external: true } }); out.push('tagline'); }
      await $e.run('document/save/publish'); return out.join(', ');
    }));
  }
  await b.close();
})();
