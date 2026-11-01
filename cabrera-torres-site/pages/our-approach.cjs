// Our Approach: Jen asked for its own page ("about and our approach seem to be the same" / "is there no new tab for
// this one? I'd like to use this pic for the approach tab"). Pillars, how a claim works, and trial preparation.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { process: edu, heroes } = require('../content.json');
const { C, box, gap, container, band, stack, grid, eyebrow, heading, H2, H3, text } = L;

module.exports = {
  slug: 'our-approach', title: 'Our Approach',
  seo: {
    title: 'Our Approach | Trial-Ready Injury Lawyer in Norcross, GA',
    description: 'How Cabrera Torres Law Firm handles your injury case: integrity, commitment and trial-ready preparation from the first call. Free consultation.',
    focus: 'personal injury lawyer Norcross',
  },
  build: (m) => [
    P.pageHero(m, heroes.approach, { photo: m.jenApproach }),
    // Four pillars, bold espresso on cream.
    band(C.ivory, [
      eyebrow('What guides every case', C.wood, 'center', { weight: 700, ls: 0.34, settings: { _margin: box(0, 0, 18, 0) } }),
      H2('Powerful advocacy.', 'Personal attention.', false, 'center', { sizes: [44, 38, 32] }),
      grid(P.PILLARS.map(([t, d, ic]) => container({
        content_width: 'full', flex_direction: 'column', flex_align_items: 'flex-start', flex_gap: gap(16), padding: box(32, 28, 32, 28),
        background_background: 'classic', background_color: C.light, border_border: 'solid', border_width: box(1), border_color: C.hair,
      }, [
        P.svg(P.ICON[ic], 48),
        H3(t, C.ink, [18, 18, 18], { ls: 0.1, lh: 1.3 }),
        text(d, { color: C.inkSoft, size: 16, lh: 1.65 }),
      ])), { cols: [4, 2, 1], gap: 24, settings: { margin: box(56, 0, 0, 0) } }),
    ], { pad: [100, 100], width: 1320, align: 'center' }),
    // How a claim works, on espresso.
    band(C.wood, [
      eyebrow(edu.kicker, C.ivory, 'center', { ls: 0.34, settings: { _margin: box(0, 0, 18, 0) } }),
      H2(edu.title1.replace(/,$/, ','), edu.title2, 'dark', 'center', { sizes: [44, 38, 32] }),
      grid(edu.steps.map((s) => P.numberCard(s.n, s.h, s.p, { dark: true, pad: box(32, 28, 32, 28), nGap: 16, pSize: 15 })), { cols: [4, 2, 1], gap: 24, settings: { margin: box(56, 0, 0, 0) } }),
    ], { pad: [100, 100], width: 1320, align: 'center' }),
    // Trial preparation, on near-black.
    band(C.nearBlack, [
      grid([
        stack([
          eyebrow('Litigation experience', C.ivory, 'left', { ls: 0.32 }),
          heading('Ready for the courtroom.', 'h2', [44, 38, 32], C.ivory, 'left', { lh: 1.12 }), // Jen: "this phrase is getting repetitive"
          text('We build every case to be told in front of a jury if it has to be, because that preparation is what moves insurers to treat you fairly.', { color: C.ivory, size: 17, lh: 1.75 }),
        ], { gap: 18 }),
        grid(P.LIT.map(([t, d]) => stack([
          eyebrow(t, C.rose, 'left', { size: 13, weight: 700, ls: 0.2 }),
          text(d, { color: C.ivory, size: 15, lh: 1.6 }),
        ], { gap: 8, settings: { padding: box(16, 0, 0, 0), border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.rose } })), { cols: [1, 3, 1], gap: 24 }),
      ], { cols: ['minmax(0,1.1fr) minmax(0,.9fr)', 1, 1], gap: 64, rowGap: 40, align: 'center' }),
    ], { pad: [100, 100], width: 1320 }),
    P.ctaBand(),
  ],
};
