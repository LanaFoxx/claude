// Case results: every result, a mix of case types (Jen added slip-and-fall and products liability results).
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { results, disclaimer, heroes } = require('../content.json');
const { C, box, band, grid, text } = L;

module.exports = {
  slug: 'case-results', title: 'Case Results',
  seo: {
    title: 'Case Results | $15M+ Recovered | Cabrera Torres Law Firm',
    description: 'Recent settlements and verdicts in car, truck, slip-and-fall and products liability cases across metro Atlanta, including a $1.2M truck recovery.',
    focus: 'personal injury settlements Georgia',
  },
  build: (m) => [
    P.pageHero(m, heroes.results, { photo: m.jenCreamCut, cutout: true }),
    band(C.wood, [
      grid(results.map((r) => P.resultNote(r)), { cols: [4, 2, 1], gap: 24, rowGap: 24, align: 'stretch',
        // Desktop: 8 half-columns so a short last row sits centered instead of hanging left.
        settings: { custom_css: '@media (min-width: 1025px) { selector { grid-template-columns: repeat(8, minmax(0, 1fr)) !important; } selector > .e-con { grid-column: span 2; } selector > .e-con:nth-last-child(3):nth-child(4n+1) { grid-column: 2 / span 2; } selector > .e-con:nth-last-child(2):nth-child(4n+1) { grid-column: 3 / span 2; } selector > .e-con:nth-last-child(1):nth-child(4n+1) { grid-column: 4 / span 2; } }' } }),
      text(disclaimer, { color: C.ivory, size: 13, align: 'center', settings: { _margin: box(48, 0, 0, 0) } }),
    ], { pad: [100, 100], width: 1320, align: 'center' }),
    P.ctaBand(),
  ],
};
