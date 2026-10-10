import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2]; const only = process.argv[3];
const hf = JSON.parse(fs.readFileSync(S + '/build/hf.json'));
const hover = JSON.parse(fs.readFileSync(S + '/build/hover.json')).hover_css;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
fs.mkdirSync(S + '/shots', { recursive: true });
const media = s => s.replace(/@@MEDIA:([^@]+)@@/g, '/assets/$1');
for (const f of fs.readdirSync(S + '/build/pages')) {
  if (only && !f.startsWith(only)) continue;
  const pg = JSON.parse(fs.readFileSync(S + '/build/pages/' + f));
  const doc = (ssr) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${pg.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;500;600;700;800&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/site.css"><style>${hover}</style><script>window.TCF={api:'/api.json'};</script><script src="/tcf-runtime.js"></script></head><body>
${media(hf.header)}<main>${media(pg.widget.replace('@@SSR@@', ssr))}</main>${media(hf.footer)}</body></html>`;
  fs.writeFileSync(S + '/pre/__' + pg.slug + '.html', doc(''));
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => console.log('ERR', pg.slug, e.message));
  await p.goto('http://127.0.0.1:8765/__' + pg.slug + '.html', { waitUntil: 'networkidle' });
  if (!pg.runtime) await p.evaluate(([rid, code, props]) => { const C = new Function(code + '\nreturn Component;')(); TCF.mount(document.getElementById(rid + '-root'), document.getElementById(rid + '-tpl'), C, props); }, [pg.rid, pg.code, pg.props]);
  await p.waitForTimeout(800);
  const ssr = await p.evaluate((rid) => document.getElementById(rid + '-root').innerHTML, pg.rid);
  pg.ssr = ssr; fs.writeFileSync(S + '/build/pages/' + f, JSON.stringify(pg, null, 1));
  fs.writeFileSync(S + '/pre/__' + pg.slug + '.html', doc(ssr));
  await p.screenshot({ path: `${S}/shots/${pg.slug}-d.png`, fullPage: true });
  await p.close();
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  m.on('pageerror', e => console.log('ERR-m', pg.slug, e.message));
  await m.goto('http://127.0.0.1:8765/__' + pg.slug + '.html', { waitUntil: 'networkidle' });
  await m.waitForTimeout(800);
  const ov = await m.evaluate(() => document.documentElement.scrollWidth);
  await m.screenshot({ path: `${S}/shots/${pg.slug}-m.png`, fullPage: true });
  await m.close();
  console.log('ok', pg.slug, ssr.length, 'mobile scrollWidth', ov);
}
await b.close();
