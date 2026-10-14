// Terms of Service and Privacy Policy share one layout: cream hero + 7 placeholder sections.
const L = require('../lib.cjs');
const fs = require('fs');
const path = require('path');
const { C, band, stack, heading, text, subHero } = L;

const SECTIONS = ['1. Overview', '2. Your account', '3. Your data', '4. Payments and trials', '5. Acceptable use', '6. Changes to these terms', '7. Contact'];
const BODY = '<p>Placeholder text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>\n<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>';

// Live site: the real legal text from myrecordflow.com (content/<slug>.html), in one Text Editor.
const LIVE_LEDE = { 'terms-of-service': 'Effective date: May 1, 2025.', 'privacy-policy': 'How RecordFLOW collects, uses and protects your information.' };
const liveBody = (slug) => band(C.white, [
  text(fs.readFileSync(path.join(__dirname, '..', 'content', `${slug}.html`), 'utf8'), { size: 16, lh: 1.7, pSpace: 14,
    settings: { custom_css: 'selector strong { color: #101828; } selector ol, selector ul { padding-left: 1.4em; margin: 0 0 14px; } selector li { margin-bottom: 6px; }' } }),
], { width: 744, pad: [72, 96], gap: 0 });

module.exports = (slug, title) => ({
  slug, title,
  build: (m) => L.LIVE ? [subHero(m, 'Legal', title, LIVE_LEDE[slug]), liveBody(slug)] : [
    subHero(m, 'Legal', title, 'Placeholder. Last updated: Month DD, YYYY.'),
    band(C.white, SECTIONS.map((s) => stack([
      heading(s, 'h2', [22, 22, 20], C.ink, 'left', { weight: 700, lh: 1.3, ls: 0 }),
      text(BODY, { size: 16, lh: 1.7, pSpace: 10 }),
    ], { gap: 10 })), { width: 744, pad: [72, 96], gap: 36, gapM: 28 }),
  ],
});
