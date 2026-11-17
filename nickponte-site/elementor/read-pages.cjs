// Read-only: saves the content-page text (intro/body/form meta) to elementor/pages-meta.json.
const { chromium } = require('playwright');
const fs = require('fs');
const SITE = 'https://nickponterealty.com';
const IDS = [25, 31, 6103, 6082, 7513, 6182, 1145, 627];
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); p.setDefaultTimeout(120000);
  let nonce;
  for (let i = 0; i < 3 && !nonce; i++) { try {
    await p.goto(SITE + '/wp-login.php', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1500);
    await p.fill('#user_login', process.env.WPU, { timeout: 60000 }); await p.fill('#user_pass', process.env.WPP);
    await Promise.all([p.waitForNavigation().catch(() => {}), p.click('#wp-submit')]);
    await p.goto(SITE + '/wp-admin/', { waitUntil: 'domcontentloaded' }); nonce = await p.evaluate(() => window.wpApiSettings?.nonce);
  } catch (e) {} }
  const out = {};
  for (const id of IDS) {
    const r = await (await p.request.get(`${SITE}/wp-json/wp/v2/pages/${id}?context=edit&_fields=id,title,link,meta,featured_media`, { headers: { 'X-WP-Nonce': nonce } })).json();
    out[id] = { title: r.title?.raw, link: r.link, intro: r.meta?._npc_page_intro, body: r.meta?._npc_page_body, form: r.meta?._npc_page_form, enabled: r.meta?._npc_page_enabled };
    console.log(id, r.title?.raw, '| body', (r.meta?._npc_page_body || '').length, '| form', r.meta?._npc_page_form ? 'yes' : '-', '| on', r.meta?._npc_page_enabled);
  }
  fs.writeFileSync(__dirname + '/pages-meta.json', JSON.stringify(out, null, 1));
  await b.close();
})();
