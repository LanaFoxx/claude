// FAQ: ten questions (FAQPage schema on).
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { faqs, heroes } = require('../content.json');
const { C, band } = L;

module.exports = {
  slug: 'faq', title: 'FAQ',
  seo: {
    title: 'Georgia Personal Injury FAQ | Cabrera Torres Law Firm',
    description: 'Plain answers about Georgia injury claims: what a lawyer costs, filing deadlines, what you can recover, who pays and uninsured drivers.',
    focus: 'Georgia personal injury FAQ',
  },
  build: (m) => [
    P.pageHero(m, heroes.faq),
    band(C.ivory, [P.faqAccordion(faqs, { sizes: [20, 20, 18], aSize: 17 })], { pad: [96, 104], width: 880 }),
    P.ctaBand(),
  ],
};
