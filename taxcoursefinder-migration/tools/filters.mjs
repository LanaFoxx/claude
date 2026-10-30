import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://taxcoursefinder.com/?v=' + Date.now(), { waitUntil: 'networkidle' });
const r = await p.evaluate(async () => { const d = await TCF.data(); const p0 = d.providers[0]; return { FEATURES: d.FEATURES, providerKeys: Object.keys(p0), sample: Object.fromEntries(Object.entries(p0).filter(([k, v]) => typeof v !== 'object' || v === null).slice(0, 80)) }; });
console.log(JSON.stringify(r, null, 1).slice(0, 6000));
await b.close();
