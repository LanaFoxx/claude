// Case results: eight pinned notes.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { results, disclaimer, heroes } = require('../content.json');
const { C, box, band, grid, text } = L;

module.exports = {
  slug: 'case-results', title: 'Case Results',
  seo: {
    title: 'Case Results | $15M+ Recovered | Cabrera Torres Law Firm',
    description: 'Recent settlements and verdicts in car, truck and serious-injury cases across metro Atlanta, including $1.2M, $550K and $500K recoveries.',
    focus: 'personal injury settlements Georgia',
  },
  build: (m) => [
    P.pageHero(m, heroes.results, { photo: m.jenCreamCut, cutout: true }),
    band(C.ivory, [
      grid(results.map((r) => P.resultNote(r)), { cols: [4, 2, 1], gap: 24, rowGap: 24, align: 'stretch' }),
      text(disclaimer, { color: C.inkSoft, size: 13, align: 'center', settings: { _margin: box(48, 0, 0, 0) } }),
    ], { pad: [100, 100], width: 1320, align: 'center' }),
    P.ctaBand(),
  ],
};
