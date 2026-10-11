// Privacy policy + Terms of use. Left: sticky title block. Right: intro + one Text Editor holding
// the whole policy (h2 + paragraphs), so the client edits it like a normal document.
const L = require('./lib.cjs');
const { C, SERIF, SANS, EMAIL, px, box, gap, auto, typo, container, widget, band, stack, eyebrow, text } = L;

const PLACEHOLDER = 'Placeholder text. Replace with language reviewed by counsel before the site goes live.';
const UPDATED = 'Last updated October 11, 2026';

const PAGES = {
  privacy: {
    slug: 'privacy-policy', title: 'Privacy policy',
    intro: 'This policy describes how Recco Consulting collects, uses and protects information you share with us through this website and in the course of our work together.',
    sections: [
      ['Information we collect', 'When you contact us through this site we collect the name, work email, company and message you provide. We also collect standard server logs and analytics data such as pages visited, browser type and approximate location.', true],
      ['How we use it', 'We use your contact details to respond to your enquiry and, where you have agreed, to keep in touch about our services. We do not sell personal information and we do not share it with third parties for their own marketing.', true],
      ['Cookies and analytics', 'This site uses a small number of cookies to keep the site working and to understand how it is used. You can disable cookies in your browser; the site will continue to function.', true],
      ['Retention and security', 'We keep enquiry data for as long as needed to handle your request and for a reasonable period afterwards. Data is stored with reputable providers and access is limited to the people who need it.', true],
      ['Your rights', `You may ask us to access, correct or delete the personal information we hold about you at any time by emailing <a href="mailto:${EMAIL}">${EMAIL}</a>.`, true],
      ['Contact', `Questions about this policy can be sent to <a href="mailto:${EMAIL}">${EMAIL}</a>.`, false],
    ],
  },
  terms: {
    slug: 'terms-of-use', title: 'Terms of use',
    intro: 'These terms govern your use of the Recco Consulting website. By using the site you agree to them. Our consulting engagements are governed by separate written agreements.',
    sections: [
      ['Use of this site', 'The content on this site is provided for general information about our services. You may view and print pages for your own reference. You may not reproduce, modify or redistribute content without our written permission.', true],
      ['No professional advice', 'Nothing on this site constitutes professional, legal or financial advice, and nothing here creates a client relationship. Advice is provided only under a signed engagement.', true],
      ['AI news and third-party content', 'The AI News section summarizes publicly available announcements from third-party vendors. Summaries are provided for convenience and may be generated automatically. We make no warranty as to their accuracy and are not affiliated with the vendors named.', true],
      ['Intellectual property', 'The Recco Consulting name, logo and site content are owned by Recco Consulting. Third-party names and logos belong to their respective owners.', true],
      ['Limitation of liability', 'To the fullest extent permitted by law, Recco Consulting is not liable for any loss arising from use of, or reliance on, this site.', true],
      ['Changes', 'We may update these terms from time to time. The date at the top of this page shows when they were last revised.', false],
    ],
  },
};

const body = (sections) => sections.map(([h, p, ph]) => `<h2>${h}</h2>\n<p>${p}</p>${ph ? `\n<p>${PLACEHOLDER}</p>` : ''}`).join('\n');

const build = (def) => (m) => [band([
  container({
    container_type: 'grid', content_width: 'full', padding: box(0),
    grid_columns_grid: { unit: 'custom', size: 'minmax(0,1fr) minmax(0,2fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
    grid_gaps: gap(72, 56), grid_gaps_tablet: gap(40), grid_gaps_mobile: gap(32), grid_align_items: 'start',
  }, [
    stack([
      eyebrow(m, 'Legal'),
      widget('heading', {
        title: def.title, header_size: 'h1', title_color: C.navy,
        ...typo('typography', SERIF, [54, 46, 36], 300, { lh: 1.06, ls: -0.65 }),
      }),
      text(UPDATED, { color: C.gray, size: 14, lh: 1.5 }),
    ], { gap: 18, settings: {
      sticky: 'top', sticky_on: ['desktop'], sticky_offset: 116, sticky_parent: 'yes', _title: 'Title (sticky on desktop)',
    } }),
    stack([
      text(def.intro, { color: C.navy, size: [18, 18, 17], lh: 1.6 }),
      text(body(def.sections), {
        lh: 1.7, pSpace: 14,
        settings: {
          _title: 'Policy text',
          custom_css: [
            'selector h2 { font-family: "Manrope", sans-serif; font-size: 20px; font-weight: 600; line-height: 1.3; letter-spacing: -0.2px; color: #1E495E; margin: 40px 0 14px; }',
            'selector h2:first-child { margin-top: 0; }',
            'selector a { text-decoration: none; border-bottom: 1px solid #95AB3B; }',
          ].join('\n'),
        },
      }),
    ], { gap: 40, maxW: 680, settings: { width_tablet: px(100, '%'), _title: 'Policy' } }),
  ]),
], { pad: [96, 112], title: def.title })];

module.exports = Object.fromEntries(Object.entries(PAGES).map(([k, def]) => [k, { slug: def.slug, title: def.title, build: build(def) }]));
