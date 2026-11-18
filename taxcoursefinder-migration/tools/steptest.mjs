import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], W = +(process.argv[3] || 1350);
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: W, height: 900 }, isMobile: W < 500, hasTouch: W < 500 });
await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/provider-application.html`, 'utf8') }));
let posted = null;
await ctx.route('**/wp-admin/admin-ajax.php', async r => {
  const body = r.request().postData() || '';
  if (body.includes('tcfd_listing_submit')) { posted = body; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { receipt: 'test', part: 'verify' } }) }); }
  return r.continue();
});
await ctx.route('**/listing-verified/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>verified page</body></html>' }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const out = (...a) => console.log(...a);
await p.goto('https://taxcoursefinder.com/provider-application/?pv=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
const vis = () => p.evaluate(() => [...document.querySelectorAll('[data-tcf-step]')].filter(s => s.offsetParent).map(s => s.getAttribute('data-tcf-step')).join(','));
const head = () => p.evaluate(() => document.querySelector('.tcf-steps-head')?.innerText.replace(/\s+/g, ' '));
out('start', await vis(), await head());
await p.screenshot({ path: `${S}/shots/st-${W}-1.png` });
await p.locator('.tcf-step-on .tcf-next').click(); await p.waitForTimeout(400);
out('empty next ->', await vis(), 'errors:', await p.locator('[data-tcf-err]:visible').count(), await p.locator('.tcf-step-on .tcf-step-status').innerText());
await p.fill('[name=school_name]', 'Test School'); await p.fill('[name=contact_name]', 'Pat Test'); await p.fill('[name=contact_email]', 'pat@example.com'); await p.fill('[name=website]', 'https://example.com');
await p.locator('.tcf-step-on .tcf-next').click(); await p.waitForTimeout(500);
out('step1 ok ->', await vis(), await head(), 'price visible before tick:', await p.locator('[name=ce_price]').isVisible());
await p.locator('.tcf-step-on .tcf-next').click(); await p.waitForTimeout(300);
out('no course ->', await vis(), await p.locator('[data-tcf-err]:visible').allInnerTexts());
await p.locator('[name=ce_offered]').check(); await p.waitForTimeout(200);
out('price visible after tick:', await p.locator('[name=ce_price]').isVisible(), 'qe price visible:', await p.locator('[name=qe_price]').isVisible());
await p.fill('[name=ce_price]', 'abc'); await p.locator('.tcf-step-on .tcf-next').click(); await p.waitForTimeout(300);
out('bad price ->', await vis(), await p.locator('[data-tcf-err]:visible').allInnerTexts());
await p.fill('[name=ce_price]', '69.95'); await p.fill('[name=ce_url]', 'https://example.com/ce');
await p.screenshot({ path: `${S}/shots/st-${W}-2.png` });
await p.locator('.tcf-step-on .tcf-next').click(); await p.waitForTimeout(400);
out('->', await vis(), await head());
await p.locator('[value=online_course_available]').check(); await p.locator('[value=physical_book_available]').check(); await p.selectOption('[name=reporting]', '24h');
await p.locator('.tcf-step-on .tcf-next').click(); await p.waitForTimeout(400);
out('->', await vis(), await head(), 'ce coupon visible', await p.locator('[name=ce_coupon_code]').isVisible(), 'qe coupon visible', await p.locator('[name=qe_coupon_code]').isVisible());
await p.fill('[name=ce_coupon_code]', 'SAVE10'); await p.fill('[name=ce_coupon_details]', '10% off');
await p.screenshot({ path: `${S}/shots/st-${W}-4.png` });
await p.locator('.tcf-step-on .tcf-next').click(); await p.waitForTimeout(500);
out('->', await vis(), await head());
out('review:', (await p.locator('[data-tcf-review]').innerText()).replace(/\n+/g, ' | ').slice(0, 600));
await p.screenshot({ path: `${S}/shots/st-${W}-5.png`, fullPage: true });
// reload: restored
await p.waitForTimeout(600);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
out('after reload:', await vis(), await head(), '| note:', await p.locator('.tcf-draft-note').innerText(), '| school:', await p.inputValue('[name=school_name]'), 'price:', await p.inputValue('[name=ce_price]'), 'coupon:', await p.inputValue('[name=ce_coupon_code]'));
// sidebar / edit go back
await p.locator('[data-tcf-goto="2"]').click(); await p.waitForTimeout(400); out('edit ->', await vis());
if (W > 760) { await p.locator('a[href="#step-5"]').click(); await p.waitForTimeout(400); out('sidebar step 5 ->', await vis()); } else { await p.locator('.tcf-step-on .tcf-next').click(); await p.locator('.tcf-step-on .tcf-next').click(); await p.locator('.tcf-step-on .tcf-next').click(); await p.waitForTimeout(400); }
// save and finish later
await p.locator('.tcf-step-on .tcf-later').click(); await p.waitForTimeout(3000);
const box = await p.locator('.tcf-step-on .tcf-later-box').innerText(); out('later box:', box.replace(/\s+/g, ' ').slice(0, 300));
const link = await p.locator('.tcf-step-on .tcf-later-link input').inputValue().catch(() => '');
out('link', link);
await p.screenshot({ path: `${S}/shots/st-${W}-later.png` });
// another device
if (link) {
  const c2 = await b.newContext({ viewport: { width: W, height: 900 } });
  await c2.route(u => u.href.includes('/provider-application/?resume='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/provider-application.html`, 'utf8') }));
  const q = await c2.newPage(); await q.goto(link, { waitUntil: 'networkidle' }); await q.waitForTimeout(2500);
  out('other device:', await q.evaluate(() => [...document.querySelectorAll('[data-tcf-step]')].filter(s => s.offsetParent).map(s => s.getAttribute('data-tcf-step')).join(',')), '|', await q.locator('.tcf-draft-note').innerText(), '| school:', await q.inputValue('[name=school_name]'), 'price:', await q.inputValue('[name=ce_price]'), 'features:', await q.locator('[name="features[]"]:checked').count());
  await c2.close();
}
// submit without confirm -> error, then confirm -> intercepted success
await p.locator('.tcf-step-on [type=submit]').click(); await p.waitForTimeout(400);
out('no confirm ->', await vis(), await p.locator('[data-tcf-err]:visible').allInnerTexts());
await p.locator('[name=confirm]').check(); await p.locator('.tcf-step-on [type=submit]').click(); await p.waitForTimeout(2500);
out('submitted:', p.url(), 'qe fields sent?', posted ? /qe_price=/.test(posted) || posted.includes('name="qe_price"') : 'n/a', 'ce price sent?', posted ? posted.includes('69.95') : 'n/a');
out('draft cleared:', await p.evaluate(() => localStorage.getItem('tcf_form_draft_verify')));
out('errors', errs);
await b.close();
