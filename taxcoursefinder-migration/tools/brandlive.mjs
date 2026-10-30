import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const pages = ['/', '/ctec-20-hour-course/', '/ctec-60-hour-course/', '/ctec-requirements/', '/how-to-become-a-ctec-registered-tax-preparer/', '/how-to-renew-ctec-registration/', '/how-to-choose-a-ctec-course/', '/how-we-compare-providers/', '/faqs/', '/about/', '/provider-rights/', '/provider-application/', '/privacy-policy/', '/terms-of-use/', '/ctec-live-scan-background-check/', '/ctec-experience-in-lieu-15-hour-course/'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const u of pages) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com' + u + '?v=' + Date.now(), { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const old = new Set(); const fonts = new Set();
    for (const el of document.querySelectorAll('.tcf-scope *, .tcf-scope')) {
      const s = getComputedStyle(el);
      for (const v of [s.color, s.backgroundColor, s.borderTopColor]) if (/rgb\((149, 171, 59|126, 147, 48|11, 46, 64|174, 194, 90)\)/.test(v)) old.add(v + ' ' + el.tagName + ' ' + (el.textContent || '').trim().slice(0, 25));
      if (el.textContent.trim() && el.children.length === 0) fonts.add(s.fontFamily.split(',')[0]);
    }
    const imgs = [...document.querySelectorAll('header img, footer img')].map(i => i.src.split('/').pop() + ':' + i.naturalWidth);
    return { old: [...old].slice(0, 5), fonts: [...fonts], imgs };
  });
  console.log(u, errs.length ? 'ERR ' + errs[0] : 'ok', JSON.stringify(r));
  await p.close();
}
await b.close();
