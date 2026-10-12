// Resources: article cards linking to the six posts.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { articles, heroes } = require('../content.json');
const { C, band, grid } = L;

module.exports = {
  slug: 'blog', title: 'Resources',
  seo: {
    title: 'Legal Resources After an Accident | Cabrera-Torres Law Firm',
    description: 'Plain-language guides on car crashes, truck accidents, dog bites, slip and falls, case value and contingency fees from a Norcross injury firm.',
    focus: 'Georgia accident legal resources',
  },
  build: (m) => [
    P.pageHero(m, heroes.blog),
    band(C.white, [
      grid(articles.map((a) => P.blogCard(m, a, { meta: true })), { cols: [3, 2, 1], gap: 32, rowGap: 40, align: 'start' }),
    ], { pad: [90, 110] }),
    P.ctaBand(),
  ],
};
