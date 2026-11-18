import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], pv = process.argv[3] === 'pv';
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
if (pv) await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/provider-application.html`, 'utf8') }));
const p = await ctx.newPage();
await p.goto('https://taxcoursefinder.com/provider-application/' + (pv ? '?pv=1' : ''), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
console.log(await p.evaluate(() => {
  const g = [...document.querySelectorAll('[style*="grid-template-columns:1fr 1fr"]')][0];
  const out = [];
  const walk = (rules, mq) => { for (const r of rules) { if (r.cssRules && r.media) { if (matchMedia(r.media.mediaText).matches) walk(r.cssRules, r.media.mediaText); } else if (r.selectorText) { try { if (g.matches(r.selectorText) && /grid-template-columns/.test(r.cssText)) out.push((mq||'') + ' ' + r.cssText.slice(0, 220)); } catch (e) {} } } };
  for (const ss of document.styleSheets) { try { walk(ss.cssRules); } catch (e) {} }
  let a = g, chain = []; while (a && chain.length < 8) { chain.push(a.tagName + '.' + a.className); a = a.parentElement; }
  return { out, chain, root: document.documentElement.className };
}));
await b.close();
