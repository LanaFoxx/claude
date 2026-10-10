import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const slugs = ['', 'ctec-20-hour-course/', 'ctec-60-hour-course/', 'ctec-requirements/', 'how-to-become-a-ctec-registered-tax-preparer/', 'how-to-renew-ctec-registration/', 'how-to-choose-a-ctec-course/', 'how-we-compare-providers/', 'faqs/', 'about/', 'provider-rights/', 'provider-application/', 'privacy-policy/', 'terms-of-use/'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
for (const s of slugs) {
  await p.goto('https://taxcoursefinder.com/' + s + '?audit=' + Date.now(), { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const q = (sel, a) => document.querySelector(sel)?.getAttribute(a) || '';
    const imgs = [...document.querySelectorAll('img')].filter(i => i.offsetParent !== null || i.closest('header,footer,main'));
    const noAlt = imgs.filter(i => !i.hasAttribute('alt')).length;
    const emptyAlt = imgs.filter(i => i.getAttribute('alt') === '' && !/check-/.test(i.src)).map(i => i.src.split('/').pop());
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { const j = JSON.parse(s.textContent); const g = j['@graph'] || [j]; return g.map(x => x['@type'] + (x['@type'] === 'ItemList' ? '(' + x.numberOfItems + ')' : '')).join('+'); } catch (e) { return 'INVALID'; } });
    return { title: document.title, titleLen: document.title.length, desc: q('meta[name=description]', 'content').length, canon: q('link[rel=canonical]', 'href'), robots: q('meta[name=robots]', 'content'),
      h1: [...document.querySelectorAll('h1')].filter(h => h.offsetParent !== null).map(h => h.textContent.trim().replace(/\s+/g, ' ')), imgs: imgs.length, noAlt, emptyAlt, ld,
      kw20: (document.body.innerText.match(/20[- ]hour ctec course/gi) || []).length, kw60: (document.body.innerText.match(/60[- ]hour ctec course/gi) || []).length };
  });
  console.log('/' + s, JSON.stringify(r));
}
await b.close();
