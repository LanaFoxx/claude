import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [dir, out, ...files] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
await p.goto('http://127.0.0.1:8765/README.md');
for (const f of files) {
  const src = fs.readFileSync(dir + '/' + f, 'utf8');
  const r = await p.evaluate((src) => {
    const doc = new DOMParser().parseFromString(src, 'text/html');
    const xdc = doc.querySelector('x-dc');
    const helmet = xdc.querySelector('helmet'); const css = [...helmet.querySelectorAll('style')].map(s => s.textContent).join('\n'); helmet.remove();
    const root = xdc.querySelector('[data-screen-label]');
    const header = root.firstElementChild;
    const cands = [...xdc.querySelectorAll('div')].filter(d => (d.getAttribute('style') || '').includes('linear-gradient') && d.textContent.trim().startsWith('The independent directory'));
    const footer = cands[0];
    const out = { css, label: root.getAttribute('data-screen-label'), rootStyle: root.getAttribute('style'), header: header.outerHTML, footer: footer ? footer.outerHTML : '', footerParent: footer ? footer.parentElement.tagName + '|' + (footer.parentElement === root) : '' };
    header.remove(); if (footer) footer.remove();
    const after = []; // anything after footer in root?
    out.body = xdc.innerHTML;
    const sc = doc.querySelector('script[data-dc-script]');
    out.code = sc.textContent; out.props = sc.getAttribute('data-props') || '{}';
    out.title = doc.title;
    return out;
  }, src);
  fs.writeFileSync(out + '/' + f.replace('.dc.html', '.json'), JSON.stringify(r, null, 1));
  console.log(f, r.label, r.header.length, r.footer.length, r.footerParent, r.body.length);
}
await b.close();
