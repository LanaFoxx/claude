import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const BLOCK = /jquery|elementor\/assets\/js|elementor-pro\/assets\/js|hello-frontend|wp-includes\/js\/dist\/(hooks|i18n)/;
const block = process.argv[2] === 'block';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
async function page(w, u) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, hasTouch: w < 500 });
  if (block) await ctx.route(BLOCK, r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text().slice(0, 120)); });
  await p.goto('https://taxcoursefinder.com' + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  return { p, errs, ctx };
}
const res = [];
// 20h desktop: sort + show more + row click
{ const { p, errs, ctx } = await page(1350, '/ctec-20-hour-course/');
  const rows0 = await p.locator('.tcf-trow:visible').count();
  await p.locator('select:visible').first().selectOption('price'); await p.waitForTimeout(400);
  const first = await p.locator('.tcf-trow:visible .tcf-cell-provider').first().textContent();
  const more = p.getByText(/Show \d+ more/).first(); if (await more.count()) { await more.click(); await p.waitForTimeout(400); }
  const rows1 = await p.locator('.tcf-trow:visible').count();
  await p.locator('.tcf-trow:visible').nth(1).click({ position: { x: 400, y: 20 } }); await p.waitForLoadState(); await p.waitForTimeout(500);
  res.push(['20h desk', rows0, rows1, first.trim().slice(0, 25), p.url().replace('https://taxcoursefinder.com', ''), errs]); await ctx.close(); }
// home mobile: menu + faq + filters
{ const { p, errs, ctx } = await page(390, '/');
  await p.locator('.tcf-burger, [aria-label*="menu" i]').first().click(); await p.waitForTimeout(400);
  const menuOpen = await p.evaluate(() => document.documentElement.className + ' ' + document.body.className);
  res.push(['home mob', menuOpen.includes('menu') || menuOpen.includes('open') ? 'menu-open' : 'menu? ' + menuOpen.slice(0, 80), errs]); await ctx.close(); }
{ const { p, errs, ctx } = await page(390, '/ctec-60-hour-course/');
  const f = p.getByText('See all filters').first(); await f.click(); await p.waitForTimeout(400);
  const dr = await p.evaluate(() => document.documentElement.classList.contains('tcf-drawer-open'));
  res.push(['60h mob filters', dr, errs]); await ctx.close(); }
{ const { p, errs, ctx } = await page(390, '/faqs/');
  const q = p.locator('.tcf-faq summary, .tcf-faq button, details summary').first(); const n = await q.count(); if (n) await q.click();
  res.push(['faqs', n, errs]); await ctx.close(); }
{ const { p, errs, ctx } = await page(1350, '/schools/california-tax-courses/');
  const tabs = await p.locator('.tcfd-subnav a').count(); res.push(['school', tabs, errs]); await ctx.close(); }
{ const { p, errs, ctx } = await page(1350, '/provider-application/');
  await p.locator('form button[type=submit], form input[type=submit]').first().click(); await p.waitForTimeout(600);
  const errsShown = await p.locator('[class*=err]:visible, [role=alert]:visible').count();
  res.push(['verify form empty submit', errsShown, errs]); await ctx.close(); }
console.log((block ? 'BLOCKED ' : 'NORMAL  ') + JSON.stringify(res));
await b.close();
