// Tax News (/tax-news/, page 117) – Claude Design "Tax News". Cards = the site's 3 real blog posts
// (from the WP posts API, Oct 2026; excerpts trimmed to ~200 chars). Posts have no featured images.
const L = require('../lib.cjs');
const { C, HEAD, px, box, gap, auto, typo, container, widget, cls, wcls, band, stack, linkBox, eyebrow, text } = L;
const { pageHero } = require('./faq.cjs');

const POSTS = [
  { date: 'July 19, 2021', title: 'Free Official Tax Preparer Coffee Mug', url: 'https://cataxcourses.com/free-official-tax-preparer-coffee-mug/',
    excerpt: 'This week only (7/19 - 7/23), if you enroll in our CTEC 20 Hour Renewal Course, you’ll receive a free official Tax Preparer Coffee Mug (Free Shipping Too!) Send us a selfie picture of you and your…' },
  { date: 'July 1, 2021', title: 'California Tax Preparers Must Pass Background Check and Fingerprint Scan (Live Scan Process)', url: 'https://cataxcourses.com/california-tax-preparers-must-pass-background-check-and-fingerprint-scan-live-scan-process/',
    excerpt: 'The California Tax Education Council now requires all tax perparers to pass a background check and have their fingerprints scanned (among other requirements) in order to successfully complete their…' },
  { date: 'August 20, 2020', title: 'New legislation impacts California Tax Education Council (CTEC) requirements', url: 'https://cataxcourses.com/new-legislation-impacts-california-tax-education-council-ctec-requirements/',
    excerpt: 'California Assembly Bill 3143 was signed into law last year with new provisions and requirements that will extend the California Tax Education Council (CTEC) program until January 1, 2023. It was the…' },
];

// Same card as home.cjs articles(): number | date + title + excerpt + "Read More" | arrow circle.
function card(p, i) {
  const cols = { unit: 'custom', size: 'auto minmax(0,1fr) auto' };
  return linkBox(p.url, {
    container_type: 'grid', content_width: 'full',
    grid_columns_grid: cols, grid_columns_grid_tablet: cols, grid_columns_grid_mobile: { unit: 'custom', size: 'auto minmax(0,1fr)' },
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(32), grid_gaps_mobile: gap(16), grid_align_items: 'center',
    padding: box(36, 40, 36, 40), padding_mobile: box(24, 20, 24, 20), background_background: 'classic', background_color: C.sand, border_radius: box(16),
    ...cls('ctc-article'),
  }, [
    widget('heading', { title: String(i + 1).padStart(2, '0'), header_size: 'span', title_color: C.gold, ...typo('typography', HEAD, [64, 56, 40], 800, { lh: 1, ls: 0 }), _element_width: 'initial', _element_custom_width: px(90), _element_custom_width_mobile: px(52) }),
    stack([
      eyebrow(p.date, C.goldText, 'left', { size: 15, ls: 0.12 }),
      widget('heading', { title: p.title, header_size: 'h2', title_color: C.navy, ...typo('typography', HEAD, [32, 28, 22], 700, { lh: 1.15, ls: 0 }), _margin: box(8, 0, 10, 0) }),
      text(p.excerpt, { size: [19, 18, 16], lh: 1.6, maxW: 860 }),
      widget('heading', { title: 'Read More →', header_size: 'span', title_color: C.goldText, ...typo('typography', HEAD, 19, 700, { lh: 1.3, ls: 0 }), _margin: box(14, 0, 0, 0) }),
    ]),
    widget('icon', { selected_icon: { value: 'fas fa-arrow-right', library: 'fa-solid' }, view: 'stacked', shape: 'circle', primary_color: C.navy, secondary_color: C.white, size: px(22), icon_padding: px(21), ...wcls('ctc-article-arrow') }),
  ]);
}

module.exports = {
  slug: 'new-tax-news', title: 'Tax News (new design preview)', liveId: 117, kind: 'page',
  build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    pageHero('Info', 'Updates for California tax preparers.', 'Tax News Blog'),
    band(C.white, [stack(POSTS.map(card), { gap: 16 })]),
  ], false)],
};
