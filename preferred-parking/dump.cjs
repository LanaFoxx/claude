const { chromium } = require('playwright'); const fs=require('fs');
const SITE='https://public.preferredparking.com';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: process.env.STATE, viewport:{width:1440,height:900} });
  const p = await ctx.newPage();
  await p.goto(`${SITE}/wp-admin/post.php?post=1631&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  const data = await p.evaluate(() => ({ els: elementor.documents.getCurrent().config.elements, ver: elementor.config.version, settings: elementor.documents.getCurrent().config.settings.settings, kit: elementor.config.kit_id }));
  fs.writeFileSync(process.env.OUT+'/pv-1631.json', JSON.stringify(data,null,1));
  // search all elementor content via admin search: list all post types with _elementor_data
  const hits = await p.evaluate(async () => {
    const n = elementorCommon.config.rest?.nonce || wpApiSettings?.nonce; const h={'X-WP-Nonce':n};
    const types = await (await fetch('/wp-json/wp/v2/types',{headers:h})).json();
    const out=[];
    for (const [k,t] of Object.entries(types)) { if(!t.rest_base) continue;
      const r = await fetch(`/wp-json/${t.rest_namespace||'wp/v2'}/${t.rest_base}?per_page=100&status=any&context=edit&_fields=id,slug,status,title,content,type`,{headers:h}); if(!r.ok) continue;
      const a = await r.json(); if(!Array.isArray(a)) continue;
      for (const x of a) { const c=(x.content?.raw||'')+(x.content?.rendered||''); if(/by mail|mailed|pay-by-mail/i.test(c)) out.push([k,x.id,x.slug,x.status,x.title?.raw]); }
      out.push(['type',k,a.length]);
    }
    return out;
  });
  console.log(JSON.stringify(hits));
  await b.close();
})();
