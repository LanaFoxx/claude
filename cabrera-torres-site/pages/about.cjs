// About the firm: intro + photo, "why choose us" cards.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { about: ab, heroes } = require('../content.json');
const { C, box, band, stack, grid, eyebrow, heading, text } = L;

module.exports = {
  slug: 'about', title: 'About',
  seo: {
    title: 'About Us | Cabrera Torres Law Firm, Norcross GA',
    description: 'Cabrera Torres Law Firm is a bilingual personal injury firm in Norcross, GA. Client-centered representation, every case prepared for trial.',
    focus: 'Norcross personal injury law firm',
  },
  build: (m) => [
    P.pageHero(m, heroes.about),
    band(C.ivory, [
      grid([
        stack([
          heading(ab.h1, 'h2', [44, 38, 32], C.ink, 'left', { lh: 1.14 }),
          text(ab.p1, { size: 17, settings: { _margin: box(4, 0, 0, 0) } }),
          text(ab.p2, { size: 17 }),
        ], { gap: 18 }),
        P.framedPhoto(m.jenWindow, { maxW: 420, ratio: '4 / 5', pos: 'center 30%' }),
      ], { cols: [2, 1, 1], gap: 60, rowGap: 56, align: 'start' }),
    ], { pad: [100, 100], width: 1320 }),
    band(C.espMid, [
      eyebrow(ab.whyKicker, C.ivory, 'center', { ls: 0.34, settings: { _margin: box(0, 0, 32, 0) } }),
      grid(ab.why.map((w) => P.numberCard(w.n, w.h, w.p, { dark: true })), { cols: [3, 1, 1], gap: 24 }),
    ], { pad: [100, 100], width: 1320 }),
    P.ctaBand(),
  ],
};
