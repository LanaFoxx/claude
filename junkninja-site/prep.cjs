// Uploads assets/ to the Media Library (skips files already there) and creates the main menu.
// Usage: WP_URL=... STATE=state.json PREP=prep.json node prep.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const SITE = process.env.WP_URL;
const ALT = {
  'junk-ninja-logo.png': 'Junk Ninja LLC — Clutter Removed, Serenity Restored',
  'junk-ninja-logo-white.png': 'Junk Ninja LLC',
  'junk-ninja-mascot.png': 'Junk Ninja mascot',
  'junk-ninja-mascot.webp': 'Junk Ninja mascot',
  'junk-ninja-logo-300.png': 'Junk Ninja LLC — Clutter Removed, Serenity Restored',
  'junk-ninja-logo-white-424.png': 'Junk Ninja LLC',
  'job-trailer-load.webp': 'Junk Ninja trailer loaded with junk',
  'job-trailer-branded.webp': 'Junk Ninja LLC trailer on a job',
  'svc-garage.webp': 'Garage cleanout removal',
  'svc-rental.webp': 'Realtor and rental cleanout removal',
  'svc-furniture.webp': 'Furniture removal',
  'svc-appliance.webp': 'Old refrigerator, washer and dryer ready for appliance removal',
  'svc-estate.webp': 'Junk Ninja crew carrying an armchair out of a home during an estate cleanout',
  'svc-household.webp': 'Old sofa, dresser and bed frame on a driveway ready for junk removal',
  'ba-hottub-1-before.webp': 'Broken hot tub on a screened patio before removal',
  'ba-hottub-1-after.webp': 'Junk Ninja crew member sweeping the cleared patio after hot tub removal',
  'ba-garage-1-before-tall.webp': 'Garage packed with boxes and household items before cleanout',
  'ba-garage-1-before.webp': 'Garage packed with boxes and household items before cleanout',
  'ba-garage-1-after.webp': 'The same garage empty after cleanout',
  'ba-garage-2-after.webp': 'Garage cleared to the bare floor after cleanout',
  'svc-yard.webp': 'Bagged leaves and branches ready for yard waste removal',
  'svc-construction.webp': 'Dumpster full of renovation and construction debris',
  'ba-garage-after.webp': 'The same garage empty after cleanout',
  'placeholder-wide.webp': 'Photo to come', 'placeholder-tall.webp': 'Photo to come',
  'ba-hottub-3-after.webp': 'Patio cleared after hot tub removal',
};
const MENU = [
  ['Home', '/'], ['Junk Removal', '/#services'],
  ['More Services', '#', [['Cleanouts', '/#services'], ['Realtor & Property Manager', '/#realtors'], ['Storm & Flood', '/#services'], ['Construction & Light Demolition', '/#services']]],
  ['Service Areas', '/#areas'], ['Get a Free Quote', '/#quote', null, 'jn-menu-quote'],
];
(async () => {
  const prep = fs.existsSync(process.env.PREP) ? JSON.parse(fs.readFileSync(process.env.PREP, 'utf8')) : { media: {} };
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE });
  const p = await ctx.newPage();
  await p.goto(`${SITE}/wp-admin/`, { timeout: 120000 });
  const nonce = await p.evaluate(async () => (await fetch('/wp-admin/admin-ajax.php?action=rest-nonce')).text());
  // Photos uploaded by hand to the Media Library are picked up by file name.
  for (let page = 1; ; page++) {
    const r = await p.request.get(`${SITE}/wp-json/wp/v2/media?per_page=100&page=${page}&_fields=id,source_url`, { headers: { 'X-WP-Nonce': nonce } });
    if (!r.ok()) break;
    const items = await r.json();
    for (const it of items) {
      const f = it.source_url.split('/').pop().replace(/-scaled(?=\.)/, '');
      if (!prep.media[f]) prep.media[f] = { id: it.id, source_url: it.source_url };
    }
    if (items.length < 100) break;
  }
  for (const f of fs.readdirSync(path.join(__dirname, 'assets'))) {
    if (prep.media[f]?.id) continue;
    const buf = fs.readFileSync(path.join(__dirname, 'assets', f));
    const type = f.endsWith('.png') ? 'image/png' : 'image/webp';
    const res = await p.request.post(`${SITE}/wp-json/wp/v2/media`, {
      headers: { 'X-WP-Nonce': nonce, 'Content-Disposition': `attachment; filename="${f}"`, 'Content-Type': type }, data: buf, timeout: 120000,
    });
    const j = await res.json();
    if (!j.id) throw new Error(`${f}: ${JSON.stringify(j).slice(0, 300)}`);
    await p.request.post(`${SITE}/wp-json/wp/v2/media/${j.id}`, { headers: { 'X-WP-Nonce': nonce }, data: { alt_text: ALT[f] || '' } });
    prep.media[f] = { id: j.id, source_url: j.source_url };
    console.log('uploaded', f, j.id);
  }
  if (!prep.menu) {
    const api = async (url, data) => (await p.request.post(`${SITE}/wp-json/wp/v2/${url}`, { headers: { 'X-WP-Nonce': nonce }, data })).json();
    const menu = await api('menus', { name: 'Junk Ninja Main Menu' });
    let order = 1;
    const add = async ([title, url, kids, cls], parent = 0) => {
      const it = await api('menu-items', { title, url, menus: menu.id, parent, menu_order: order++, status: 'publish', classes: cls ? [cls] : [] });
      for (const k of kids || []) await add(k, it.id);
    };
    for (const it of MENU) await add(it);
    prep.menu = { id: menu.id };
    console.log('menu', menu.id);
  }
  fs.writeFileSync(process.env.PREP, JSON.stringify(prep, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
