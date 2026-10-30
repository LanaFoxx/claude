import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
for (const slug of ['1-0-4-0-and-more-continuing-education', 'california-tax-courses']) {
  const r = await p.goto(`https://taxcoursefinder.com/schools/${slug}/?v=` + Date.now(), { waitUntil: 'networkidle' });
  const c = async t => p.getByText(t, { exact: true }).count();
  console.log(slug, r.status(), '| course help:', await c('Help with course material'), '| billing help:', await c('Login & billing help'), '| instructors:', await c('Instructors'), '| errors:', errs.length);
}
await b.close();
