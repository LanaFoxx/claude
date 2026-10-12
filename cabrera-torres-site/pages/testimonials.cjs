// Testimonials: nine Google reviews.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { reviews, heroes } = require('../content.json');
const { C, band, grid, eyebrow, text, glass } = L;

module.exports = {
  slug: 'testimonials', title: 'Testimonials',
  seo: {
    title: 'Client Reviews & Testimonials | Cabrera-Torres Law Firm',
    description: 'Verified Google reviews from clients of Cabrera-Torres Law Firm, a bilingual personal injury firm in Norcross, Georgia led by Jennifer Cabrera-Torres.',
    focus: 'Cabrera-Torres Law Firm reviews',
  },
  build: (m) => [
    P.pageHero(m, heroes.testimonials, { photo: m.jenDress }),
    band(C.black, [
      grid(reviews.map((r) => glass([
        text('★★★★★', { color: C.goldLight, size: 24, ls: 0.12, lh: 1 }),
        text(`“${r.text}”`, { color: C.cream, size: 19, weight: 300, lh: 1.45, settings: { _flex_size: 'grow' } }),
        eyebrow(`${r.name} · Google`, C.sand, 'left', { size: 12, ls: 0.2 }),
      ], { gap: 18 })), { cols: [3, 2, 1], gap: 24 }),
    ], { pad: [100, 110], pattern: m.pattern }),
    P.ctaBand(),
  ],
};
