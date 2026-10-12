// Case results: eight pinned notes.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { results, disclaimer, heroes } = require('../content.json');
const { C, box, band, grid, text } = L;
const TILT = [[-2, 0], [1.5, 14], [-1, 0], [2, 14], [1, 0], [-2, 14], [1.5, 0], [-1.5, 14]];

module.exports = {
  slug: 'case-results', title: 'Case Results',
  seo: {
    title: 'Case Results | $15M+ Recovered | Cabrera-Torres Law Firm',
    description: 'Recent settlements and verdicts in car, truck and serious-injury cases across metro Atlanta, including $1.2M, $550K and $500K recoveries.',
    focus: 'personal injury settlements Georgia',
  },
  build: (m) => [
    P.pageHero(m, heroes.results, { photo: m.jenDesk }),
    band(C.cream, [
      grid(results.map((r, i) => P.resultNote(r, ...TILT[i], { compact: true, pad: [40, 26, 32, 26], amountSizes: [46, 46, 44] })),
        { cols: [4, 2, 1], gap: 28, rowGap: 64, align: 'start' }),
      text(disclaimer, { color: C.fine, size: 13, align: 'center', settings: { _margin: box(64, 0, 0, 0) } }),
    ], { pad: [110, 110], align: 'center' }),
    P.ctaBand(),
  ],
};
