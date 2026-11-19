// Puts the original Home hero (section 32e60168, from the Nov 19 backup) back in place of the client banner.
//   STATE=state.json node restore-hero.cjs
const { chromium } = require('playwright');
const zlib = require('zlib'); const fs = require('fs'); const path = require('path');
const backup = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'home457-before-20261119.json.gz'))));
const hero = backup.elements.find((e) => e.id === '32e60168');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: process.env.STATE }); const p = await ctx.newPage();
  await p.goto('https://staging129.dreamweb.digital/wp-admin/post.php?post=457&action=elementor', { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(3000);
  console.log(await p.evaluate(async (model) => {
    const doc = elementor.documents.getCurrent();
    const banner = doc.container.children.find((c) => (c.settings.get('_title') || '').startsWith('Home banner'));
    if (!banner) return 'no banner found; nothing changed';
    const at = doc.container.children.indexOf(banner);
    $e.run('document/elements/create', { container: doc.container, model, options: { at, edit: false } });
    $e.run('document/elements/delete', { container: banner });
    await $e.run('document/save/publish');
    return 'original hero restored at index ' + at;
  }, hero));
  await b.close();
})();
