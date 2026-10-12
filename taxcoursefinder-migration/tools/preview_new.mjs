import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const hf = JSON.parse(fs.readFileSync(S + '/build/hf.json'));
const hover = JSON.parse(fs.readFileSync(S + '/build/hover.json')).hover_css;
const media = s => s.replace(/@@MEDIA:([^@]+)@@/g, '/assets/$1');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const slug of process.argv.slice(3)) {
  const pg = JSON.parse(fs.readFileSync(`${S}/build/pages/${slug}.json`));
  fs.writeFileSync(`${S}/pre/__${slug}.html`, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;500;600;700;800&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/site.css"><style>${hover}</style></head><body>${media(hf.header)}<main>${media(pg.widget.replace('@@SSR@@', pg.ssr))}</main>${media(hf.footer)}</body></html>`);
  for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: w < 500 });
    await p.goto(`http://127.0.0.1:8765/__${slug}.html`, { waitUntil: 'networkidle' });
    console.log(slug, t, 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth));
    await p.screenshot({ path: `${S}/shots/new-${slug}-${t}.png`, fullPage: true });
    await p.close();
  }
}
await b.close();
