// Testimonials: nine Google reviews.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { reviews, heroes } = require('../content.json');
const { C, band, grid, eyebrow, text, glass } = L;

module.exports = {
  slug: 'testimonials', title: 'Testimonials',
  seo: {
    title: 'Client Reviews & Testimonials | Cabrera Torres Law Firm',
    description: 'Verified Google reviews from clients of Cabrera Torres Law Firm, a bilingual personal injury firm in Norcross, Georgia led by Jennifer Cabrera-Torres.',
    focus: 'Cabrera Torres Law Firm reviews',
  },
  build: (m) => [
    P.pageHero(m, heroes.testimonials, { photo: m.jenDress }),
    band(C.blush, [
      grid(reviews.map((r) => glass([
        text('★★★★★', { color: C.rose, size: 26, ls: 0.12, lh: 1 }),
        text(r.text, { color: C.ink, size: 21, weight: 400, style: 'italic', family: L.QFONT, lh: 1.5, settings: { _flex_size: 'grow' } }),
        text(`<span style="display:inline-block;width:28px;height:1px;background:${C.rose};vertical-align:middle;margin-right:14px"></span>${r.name} · Google`, { color: C.roseDeep, size: 13, weight: 600, ls: 0.2, transform: 'uppercase', lh: 1.4 }),
      ], { gap: 20, pad: L.box(40, 36, 40, 36) })), { cols: [3, 2, 1], gap: 28 }),
    ], { pad: [100, 110], pattern: m.pattern }),
    P.ctaBand(),
  ],
};
