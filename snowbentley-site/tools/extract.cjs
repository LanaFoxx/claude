// Extracts the content of every live snowbentley.com page into source/content.json:
// one entry per page, one item per Luxury Presence section ({ type, ...data }).
// The Elementor builders (lib/sections.cjs) turn each section type into native widgets.
//   node tools/extract.cjs [slug ...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ALL = ['about', 'blog', 'buyers', 'commercial', 'contact', 'done-deals', 'guides', 'home-valuation', 'neighborhoods',
  'properties/sale', 'properties/sold', 'residential', 'review-site', 'sellers', 'terms-and-conditions', 'testimonials',
  'what-were-looking-for', 'home-search/listings',
  ...['atherton', 'hillsborough', 'lamorinda', 'los-gatos', 'menlo-park', 'mountain-view', 'pacific-heights', 'palo-alto', 'piedmont', 'san-francisco'].map((s) => `neighborhoods/${s}`)];
const OUT = path.join(__dirname, '..', 'source', 'content.json');

// Runs in the page.
function extractPage() {
  const media = (u) => {
    if (!u) return null;
    const m = u.match(/media\/([0-9a-f-]{36})/);
    if (m) return m[1];
    const s = u.match(/url\(["']?([^"')]+)/);
    return s ? s[1] : (u.startsWith('http') ? u : null);
  };
  const T = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const cleanHtml = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('*').forEach((n) => { [...n.attributes].forEach((a) => { if (!['href', 'target', 'rel'].includes(a.name)) n.removeAttribute(a.name); }); });
    return c.innerHTML.replace(/<!--.*?-->/g, '').replace(/\s+/g, ' ').trim();
  };
  const bgOf = (el) => { const b = getComputedStyle(el).backgroundImage; return b && b.includes('url(') ? media(b) : null; };
  const imgs = (root) => [...root.querySelectorAll('img')].filter(visible).map((i) => {
    const r = i.getBoundingClientRect(); return { src: media(i.currentSrc || i.src), alt: i.alt || '', x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter((i) => i.src);
  const buttons = (root) => [...root.querySelectorAll('a')].filter(visible).filter((a) => /button|btn|cta/i.test(a.className) || getComputedStyle(a).borderRadius.startsWith('9') || parseFloat(getComputedStyle(a).borderRadius) > 15)
    .map((a) => ({ text: T(a), href: a.getAttribute('href') })).filter((b) => b.text);
  const blocks = (root, skip = []) => {
    const out = [];
    root.querySelectorAll('p, ul, ol, h3, h4, h5, h6').forEach((el) => {
      if (!visible(el) || el.closest('a,button,form,li') || skip.some((s) => s.contains(el)) || el.parentElement.closest('ul,ol')) return;
      if (el.tagName === 'P' && el.closest('p') !== el) return;
      const t = T(el); if (!t) return;
      const cs = getComputedStyle(el);
      out.push({ tag: el.tagName.toLowerCase(), html: cleanHtml(el), italic: cs.fontStyle === 'italic' });
    });
    return out;
  };

  const secs = [...document.querySelectorAll('section')].filter((x) => !x.parentElement.closest('section'));
  return secs.map((sec) => {
    const kind = String(sec.querySelector('[class]')?.className || '').split(' ')[0];
    const cs = getComputedStyle(sec);
    const base = { type: kind || 'unknown', bg: cs.backgroundColor, bgImage: bgOf(sec), height: Math.round(sec.getBoundingClientRect().height) };
    const h1 = sec.querySelector('h1'), h2 = sec.querySelector('h2');
    const pre = sec.querySelector('[class*=pre-title], [class*=pretitle], [class*=subtitle]');
    switch (kind) {
      case 'custom-intro': case 'neighborhood-intro':
        return { ...base, eyebrow: T(pre), title: T(h1), image: base.bgImage || imgs(sec)[0]?.src || null };
      case 'full-bleed-cta': case 'simple-cta': {
        const im = imgs(sec); const secR = sec.getBoundingClientRect();
        const btn = buttons(sec);
        return {
          ...base, title: T(h2 || h1 || sec.querySelector('h3')), titleTag: (h2 || h1) ? (h2 ? 'h2' : 'h1') : 'h3',
          pre: T(pre) || null, blocks: blocks(sec).filter((b) => ![T(h2 || h1), T(pre)].some((x) => x && b.html.replace(/<[^>]+>/g, '').trim().toLowerCase() === x.toLowerCase())), buttons: btn, images: im.map((i) => i.src),
          imageSide: im.length ? (im[0].x < secR.width / 2 - 100 ? 'left' : 'right') : null,
          imageBleed: im.length ? (im[0].x <= 2 || im[im.length - 1].x + im[im.length - 1].w >= secR.width - 2) : false,
          imageW: im[0]?.w, imageH: im[0]?.h, textAlign: getComputedStyle(h2 || h1 || sec).textAlign,
        };
      }
      case 'gallery-style-menu':
        return { ...base, items: [...sec.querySelectorAll('a')].filter((a) => a.querySelector('img')).map((a) => ({ label: T(a.querySelector('h3,h2,h4') || a), href: a.getAttribute('href'), image: media(a.querySelector('img').currentSrc) })) };
      case 'agent-bio':
        return { ...base, title: T(h2), image: imgs(sec)[0]?.src, paragraphs: [...sec.querySelectorAll('p')].map((p) => p.innerText.trim()).filter(Boolean),
          social: [...sec.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter((h) => /^http/.test(h)) };
      case 'agent-details':
        return { ...base, title: T(sec.querySelector('h3,h2')), rows: [...sec.querySelectorAll('span')].filter((x) => getComputedStyle(x).fontWeight === '600').map((lab) => {
          const row = lab.parentElement.parentElement; const a = row.querySelector('a');
          return { label: T(lab), value: a ? T(a) : T(row).replace(T(lab), '').trim(), href: a?.getAttribute('href') || null };
        }) };
      case 'custom-form':
        return { ...base, title: T(h2), intro: blocks(sec).map((b) => b.html), fields: [...sec.querySelectorAll('input, select, textarea')].filter((f) => f.type !== 'hidden').map((f) => ({
          tag: f.tagName.toLowerCase(), type: f.type, name: f.name, placeholder: f.placeholder || T(f.closest('label')) || '', required: f.required,
          options: f.tagName === 'SELECT' ? [...f.options].map((o) => o.text.trim()) : undefined,
        })) };
      case 'text-grid':
        return { ...base, title: T(h2), items: [...sec.querySelectorAll('h3,h4')].map((h) => ({ title: T(h), body: T(h.parentElement.querySelector('p, div:not(:has(h3,h4))')) })) };
      case 'timeline':
        return { ...base, title: T(h2), subtitle: T(sec.querySelector('.timeline__subtitle')), items: [...sec.querySelectorAll('.timeline__item')].map((it) => ({
          label: T(it.querySelector('.timeline__tag')), title: T(it.querySelector('.timeline__name')), html: cleanHtml(it.querySelector('.timeline__text') || it),
          tagLeft: it.querySelector('.timeline__tag').getBoundingClientRect().x < innerWidth / 2,
        })) };
      case 'gridItem':
        return { ...base, title: T(h2), pre: T(pre), items: [...sec.querySelectorAll('a')].filter((a) => a.querySelector('img') && /neighborhoods\//.test(a.getAttribute('href'))).map((a) => ({ name: T(a.querySelector('h3,h4,h2') || a), href: a.getAttribute('href'), image: media(a.querySelector('img').currentSrc) })) };
      case 'signup-form-download':
        return { ...base, title: T(h2 || sec.querySelector('h3')), image: imgs(sec)[0]?.src, imageSide: imgs(sec)[0]?.x > innerWidth / 2 - 100 ? 'right' : 'left', fields: [...sec.querySelectorAll('input')].filter((f) => f.type !== 'hidden' && f.type !== 'checkbox').map((f) => f.placeholder) };
      case 'cardItem':
        return { ...base, count: sec.querySelectorAll('[class*=card]').length };
      case 'terms-and-conditions':
        return { ...base, html: cleanHtml(sec.querySelector('[class*=content], [class*=body]') || sec) };
      case 'neighborhood-overview':
        return { ...base, title: T(h2), text: T(sec.querySelector('p')), stats: [...sec.querySelectorAll('h5')].map((h) => ({ value: T(h), label: T(h.parentElement.querySelector('p')) })) };
      case 'poi':
        return { ...base, title: T(h2), text: T(sec.querySelector('.neighborhood-poi__description')),
          scores: [...sec.querySelectorAll('.neighborhood-score')].map((x) => ({ value: T(x.querySelector('h5')), title: T(x.querySelector('h6')), label: T(x.querySelector('small')) })),
          poiTitle: T(sec.querySelector('.neighborhood-poi-table__title')), poiText: T(sec.querySelector('.neighborhood-poi-table__description')),
          filters: [...sec.querySelectorAll('.neighborhood-poi-table__button')].map((x) => x.childNodes[0]?.textContent.trim() || T(x)).filter(Boolean),
          rows: [...sec.querySelectorAll('tr.item-point')].map((r) => {
            const td = [...r.querySelectorAll('td')]; const a = r.querySelectorAll('.neighborhood-poi-table__card a');
            return { name: [...a[0].childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim(), href: a[0].getAttribute('href'),
              address: a[1] ? [...a[1].childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim() : '', mapHref: a[1]?.getAttribute('href') || '',
              image: r.querySelector('img')?.src || '', category: T(td[1]), distance: T(td[2]), reviews: T(td[3]), rating: T(td[4]) };
          }) };
      case 'neighborhood-demographics': {
        const tabNames = [...sec.querySelectorAll('.neighborhood-demographics-nav__tab')].map(T);
        const descs = [...sec.querySelectorAll('.neighborhood-demographics-description__addition')].map(T);
        const items = [...sec.querySelectorAll('.neighborhood-demographics-tabs__content-item')];
        const tabs = items.map((it, i) => {
          const stats = [...it.querySelectorAll('.neighborhood-demographics-tabs__overview-item')].map((o) => ({ value: T(o.querySelector('h5')), label: (o.querySelector('p').childNodes[0]?.textContent || '').trim() }));
          const charts = [...it.querySelectorAll('.neighborhood-demographics-tabs__item-section-title')].map((t) => {
            const box = t.parentElement; let bars = [];
            box.querySelectorAll('.js-population-age-item').forEach((x) => bars.push({ label: T(x.querySelector('.neighborhood-demographics-tabs__age-range')), value: T(x.querySelector('.js-age-bar-value')) }));
            box.querySelectorAll('.neighborhood-demographics-education__symbol').forEach((x) => bars.push({ label: T(x.querySelector('[class*=symbol-label]')), value: T(x.querySelector('[class*=symbol-value]')) }));
            box.querySelectorAll('.neighborhood-demographics-chart__binary-chart-label').forEach((x) => bars.push({ label: (x.childNodes[0]?.textContent || '').replace(':', '').trim(), value: T(x.querySelector('.value')) }));
            box.querySelectorAll('.neighborhood-demographics-chart__chart-monobar-item').forEach((x) => bars.push({ label: T(x.querySelector('[class*=monobar-label]')), value: T(x.querySelector('[class*=monobar-value]')) }));
            return { title: T(t), bars };
          });
          return { name: tabNames[i] || '', stats, charts };
        });
        // descriptions are ordered households, employment, population in the DOM; match by keyword
        const pick = (k) => descs.find((d) => d.toLowerCase().includes(k)) || '';
        tabs.forEach((t) => { t.text = /pop/i.test(t.name) ? pick('people call') : /house/i.test(t.name) ? pick('household') : pick('work'); });
        return { ...base, title: T(h2), tabs };
      }
      case 'schoolTemplate': {
        const data = JSON.parse(sec.querySelector('script.js-schoolsData')?.textContent || '[]');
        return { ...base, title: T(h2), text: T(sec.querySelector('.neighborhood-schools-description')),
          tabs: [...sec.querySelectorAll('.neighborhood-schools-nav__item')].map((x) => (x.childNodes[0]?.textContent || '').replace(/\(\s*$/, '').trim()), schools: data };
      }
      case 'gallery':
        return { ...base, images: [...new Set(imgs(sec).map((i) => i.src))] };
      case 'neighborhood-map': {
        const a = sec.querySelector('a[href*="daddr"]');
        const m = a && a.href.match(/daddr=([-\d.]+),([-\d.]+)/);
        return { ...base, name: T(sec.querySelector('div[class*=title], div[class*=name]')) || '', lat: m ? +m[1] : null, lng: m ? +m[2] : null, href: a?.href || null };
      }
      case 'neighborhood-home-search-cta':
        return { ...base, buttons: buttons(sec).length ? buttons(sec) : [...sec.querySelectorAll('a')].map((a) => ({ text: T(a), href: a.getAttribute('href') })) };
      default:
        return { ...base, title: T(h2 || h1), blocks: blocks(sec).slice(0, 20), buttons: buttons(sec), images: imgs(sec).map((i) => i.src) };
    }
  });
}

(async () => {
  const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
  const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const b = await chromium.launch();
  const queue = want.slice();
  await Promise.all([0, 1, 2, 3, 4].map(async () => {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    while (queue.length) {
      const s = queue.shift();
      await p.goto(`https://snowbentley.com/${s}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
      const h = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 700) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(120); }
      await p.waitForTimeout(1500);
      const title = await p.title();
      const meta = await p.evaluate(() => document.querySelector('meta[name=description]')?.content || '');
      out[s] = { title, description: meta, sections: (await p.evaluate(extractPage)).filter((x) => x.type !== 'jsIGTemplate' && !(x.height === 0 && x.type !== 'propertyItem' && x.type !== 'blogItem')) };
      console.log(s, out[s].sections.map((x) => x.type).join(', '));
    }
    await p.close();
  }));
  await b.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
})();
