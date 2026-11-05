// Site-wide PageSpeed settings for public.preferredparking.com. Prints each form's previous values
// so they can be restored. STATE=... node optimize-settings.cjs
const { chromium } = require('playwright');
const SITE = 'https://public.preferredparking.com';

const FORMS = [
  { page: 'options-general.php', fields: { blogname: 'Preferred Parking Service', blogdescription: 'Parking Made Simple. Service Made Exceptional.' } },
  { page: 'admin.php?page=elementor-settings', fields: { elementor_local_google_fonts: '1' } },
  { page: 'admin.php?page=mapps-page-cache', fields: {
    'cache_enabler[enabled]': true, 'cache_enabler[cache_expires]': true, 'cache_enabler[cache_expiry_time]': '12',
    'cache_enabler[clear_site_cache_on_saved_post]': true, 'cache_enabler[clear_site_cache_on_changed_plugin]': true,
    'cache_enabler[compress_cache]': true, 'cache_enabler[minify_html]': true,
  } },
];

(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } }); const p = await c.newPage();
  for (const f of FORMS) {
    await p.goto(`${SITE}/wp-admin/${f.page}`, { waitUntil: 'load' });
    const prev = await p.evaluate((fields) => {
      const out = {};
      for (const [name, val] of Object.entries(fields)) {
        const el = [...document.querySelectorAll(`[name="${name}"]`)].find((e) => e.type !== 'hidden') || document.querySelector(`[name="${name}"]`);
        if (!el) { out[name] = 'MISSING'; continue; }
        out[name] = el.type === 'checkbox' ? el.checked : el.value;
        if (el.type === 'checkbox') el.checked = !!val; else el.value = val;
      }
      return out;
    }, f.fields);
    console.log(f.page, 'previous:', JSON.stringify(prev));
    if (Object.values(prev).includes('MISSING')) throw new Error('field missing on ' + f.page);
    const form = p.locator(`form:has([name="${Object.keys(f.fields)[0]}"])`);
    await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), form.evaluate((fm) => (fm.querySelector('[type=submit][name=submit], #submit, [type=submit]')).click())]);
    console.log(' saved:', (await p.evaluate(() => document.querySelector('.notice, .updated, #setting-error-settings_updated')?.innerText || '')).trim().slice(0, 80));
  }
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
