import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://taxcoursefinder.com/provider-application/?v=' + Date.now(), { waitUntil: 'networkidle' });
const f = p.locator('[data-tcf-listing-form]');
// validation: submit empty
await f.locator('[type=submit]').click(); await p.waitForTimeout(300);
console.log('empty submit message:', await f.locator('[data-tcf-listing-status]').textContent());
await f.locator('[name=school_name]').fill('ZZ TEST SCHOOL (delete me)');
await f.locator('[name=website]').fill('https://example.com');
await f.locator('[name=contact_name]').fill('Test Person');
await f.locator('[name=contact_email]').fill('test@example.com');
await f.locator('[name=ce_offered]').check();
await f.locator('[name=ce_price]').fill('49.95');
await f.locator('[name=ce_regular]').fill('79');
await f.locator('[name=ce_url]').fill('https://example.com/ce');
for (const k of ['online_course_available', 'digital_book_available', 'email_support']) await f.locator(`[name="features[]"][value=${k}]`).check();
await f.locator('[name=reporting]').selectOption('24h');
await f.locator('[name=coupon_code]').fill('test10');
await f.locator('[name=coupon_details]').fill('10% off');
await f.locator('[name=confirm]').check();
await p.waitForTimeout(5500); // the server rejects forms submitted within 5 seconds of loading
await f.locator('[type=submit]').click();
await p.waitForTimeout(4000);
console.log('after submit:', (await p.locator('text=Thank you! We received').count()) ? 'THANK-YOU SHOWN' : await f.locator('[data-tcf-listing-status]').textContent(), 'errors:', errs.length);
// admin review
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); await ctx.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json', 'utf8')));
const a = await ctx.newPage();
await a.goto('https://taxcoursefinder.com/wp-admin/edit.php?post_type=tcfd_profile_sub', { waitUntil: 'networkidle' });
const link = a.locator('a.row-title', { hasText: 'ZZ TEST SCHOOL' }).first();
console.log('in queue:', await link.count());
await link.click(); await a.waitForLoadState('networkidle');
const rows = await a.locator('.tcfd-rv tbody tr').allTextContents();
console.log(rows.map(r => r.replace(/\s+/g, ' ').trim()).join('\n'));
await a.locator('#tcfd_profile_review').screenshot({ path: S + '/shots/listing-review.png' });
// clean up: trash then delete permanently
const id = new URL(a.url()).searchParams.get('post');
await a.locator('#delete-action a.submitdelete').click(); await a.waitForLoadState('networkidle');
await a.goto('https://taxcoursefinder.com/wp-admin/edit.php?post_status=trash&post_type=tcfd_profile_sub', { waitUntil: 'networkidle' });
const del = a.locator(`#post-${id} .delete a`);
if (await del.count()) { await a.locator(`#post-${id}`).hover(); await del.click(); await a.waitForLoadState('networkidle'); }
await a.goto('https://taxcoursefinder.com/wp-admin/edit.php?post_status=all&post_type=tcfd_profile_sub', { waitUntil: 'networkidle' });
console.log('test submission left in queue:', await a.locator('a.row-title', { hasText: 'ZZ TEST SCHOOL' }).count(), '| in trash:', await (async () => { await a.goto('https://taxcoursefinder.com/wp-admin/edit.php?post_status=trash&post_type=tcfd_profile_sub'); return a.locator('a', { hasText: 'ZZ TEST SCHOOL' }).count(); })());
await b.close();
