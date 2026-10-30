import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, mob] of [[1440, false], [1024, false], [768, false], [390, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: mob });
  await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
  const el = p.getByText(/responsible for reporting completed CE credits/).first(); await el.scrollIntoViewIfNeeded();
  const last = await el.evaluate(e => { // text on the last rendered line
    const tn = [...e.childNodes].filter(n => n.nodeType === 3).pop(); const s = tn.textContent; const r = document.createRange(); let lastTop = null, out = '';
    for (let i = 0; i < s.length; i++) { r.setStart(tn, i); r.setEnd(tn, i + 1); const t = Math.round(r.getBoundingClientRect().top); if (lastTop === null || t > lastTop + 2) { lastTop = t; out = ''; } out += s[i]; }
    return out.replace(/ /g, ' ').trim(); });
  console.log(w, 'last line:', JSON.stringify(last));
  if (w === 1440) await el.screenshot({ path: `${S}/shots/irs.png` });
  await p.close();
}
await b.close();
