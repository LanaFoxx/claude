// About the firm: intro + photo, "why choose us" cards.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { about: ab, heroes } = require('../content.json');
const { C, box, band, stack, grid, eyebrow, heading, text } = L;

module.exports = {
  slug: 'about', title: 'About',
  seo: {
    title: 'About Us | Cabrera-Torres Law Firm, Norcross GA',
    description: 'Cabrera-Torres Law Firm is a bilingual personal injury firm in Norcross, GA. Client-centered representation, every case prepared for trial.',
    focus: 'Norcross personal injury law firm',
  },
  build: (m) => [
    P.pageHero(m, heroes.about),
    band(C.white, [
      grid([
        stack([
          heading(ab.h1, 'h2', [42, 36, 30], C.ink, 'left', { lh: 1.15 }),
          text(ab.p1, { size: 17, settings: { _margin: box(4, 0, 0, 0) } }),
          text(ab.p2, { size: 17 }),
        ], { gap: 18 }),
        P.framedPhoto(m.jenSuit, { tilt: -2, maxW: 420 }),
      ], { cols: [2, 1, 1], gap: 60, rowGap: 56, align: 'start' }),
      eyebrow(ab.whyKicker, C.roseDeep, 'center', { settings: { _margin: box(100, 0, 28, 0) } }),
      grid(ab.why.map((w) => P.numberCard(w.n, w.h, w.p)), { cols: [3, 1, 1], gap: 24 }),
    ], { pad: [100, 110] }),
    P.ctaBand(),
  ],
};
