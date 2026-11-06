// Sets Yoast SEO title + meta description per page (from source/content.json, the live site's own
// titles; the homepage gets Snow's chosen title). Saves through the block editor's Yoast store.
// Usage: STATE=... node tools/seo.cjs [page-path ...]   ('' = home)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const SITE = process.env.WP_URL || 'https://staging195.dreamwebdigital.com';
const ROOT = path.join(__dirname, '..');
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'content.json'), 'utf8'));
const deployed = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'deployed.json'), 'utf8')).pages;

const SEO = {
  '': ['Snow Bentley | Commercial & Luxury REALTOR® | eXp Commercial', 'Snow Bentley Realty: award-winning, Chinese-speaking Bay Area agent for commercial leasing & sales and luxury residential real estate. CA DRE# 01911217, eXp Commercial.'],
  properties: [content['properties/sale']?.title, ''],
  'home-search': [content['home-search/listings']?.title, content['home-search/listings']?.description],
  review: ['Leave a Review | Snow Bentley', ''],
};
// The live Contact description carries an old phone number; use Snow's current one everywhere.
const fixPhone = (t) => (t || '').replace(/\(415\) 273-9885/g, '(415) 823-8595');
const seoFor = (p) => (SEO[p] || [content[p]?.title, content[p]?.description]).map(fixPhone);

(async () => {
  const only = process.argv.slice(2);
  const targets = Object.entries(deployed).filter(([p]) => !only.length || only.includes(p) || (only.includes('home') && p === ''));
  const b = await chromium.launch();
  const c = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const pg = await c.newPage();
  for (const [p, { id }] of targets) {
    const [title, desc] = seoFor(p);
    if (!title) { console.log('skip (no title)', p); continue; }
    await pg.goto(`${SITE}/wp-admin/post.php?post=${id}&action=edit`, { waitUntil: 'load', timeout: 120000 });
    await pg.waitForFunction(() => window.wp?.data?.select('yoast-seo/editor') && wp.data.select('core/editor').getCurrentPostId(), null, { timeout: 120000 });
    await pg.waitForTimeout(2500);
    const r = await pg.evaluate(async ([title, desc]) => {
      const y = wp.data.dispatch('yoast-seo/editor');
      y.setSeoTitle ? y.setSeoTitle(title) : y.updateData({ title });
      if (desc) (y.setDescription ? y.setDescription(desc) : y.updateData({ description: desc }));
      // Yoast writes its hidden fields from the store; make sure they carry the values before saving.
      await new Promise((r) => setTimeout(r, 800));
      const t = document.querySelector('input[name="yoast_wpseo_title"]'); if (t) t.value = title;
      const d = document.querySelector('input[name="yoast_wpseo_metadesc"]'); if (d && desc) d.value = desc;
      await wp.data.dispatch('core/editor').savePost();
      for (let i = 0; i < 60 && (wp.data.select('core/editor').isSavingPost() || wp.data.select('core/edit-post').isSavingMetaBoxes?.()); i++) await new Promise((r) => setTimeout(r, 500));
      return wp.data.select('core/editor').didPostSaveRequestSucceed();
    }, [title, desc]);
    console.log(r ? 'ok ' : 'FAIL', p || 'home', '|', title);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
