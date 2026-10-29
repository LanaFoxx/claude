// Helpful Guides & How-Tos (new page, /helpful-guides-and-how-tos/) – Claude Design "Helpful Guides and How-Tos".
const L = require('../lib.cjs');
const { C, HEAD, URL, px, box, gap, auto, typo, container, widget, cls, wcls, band, stack, linkBox, eyebrow } = L;
const { pageHero } = require('./faq.cjs');

const GUIDES = [
  ['01', 'Getting started', 'How To Become a California Tax Preparer', URL.become],
  ['02', 'Renewal', 'How To Renew Your CTEC Registration', URL.renew],
  ['03', 'Next steps', 'What To Do After Completing the 60 Hour Qualifying Education Course', URL.TODO_after60],
  ['04', 'Next steps', 'What To Do After Completing the 20 Hour Continuing Education Course', URL.TODO_after20],
  ['05', 'Help', 'Frequently Asked Questions', URL.faq],
  ['06', 'Updates', 'Tax News', URL.news],
];

// Same card as home.cjs articles(), without the description line or the 01–06 number.
const card = ([num, tag, title, url]) => linkBox(url, {
  container_type: 'grid', content_width: 'full',
  grid_columns_grid: { unit: 'custom', size: 'minmax(0,1fr) auto' }, grid_columns_grid_tablet: { unit: 'custom', size: 'minmax(0,1fr) auto' }, grid_columns_grid_mobile: { unit: 'custom', size: 'minmax(0,1fr) auto' },
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(32), grid_gaps_mobile: gap(16), grid_align_items: 'center',
  padding: box(36, 40, 36, 40), padding_mobile: box(24, 20, 24, 20), background_background: 'classic', background_color: C.sand, border_radius: box(16),
  ...cls('ctc-article'),
}, [
  stack([
    eyebrow(tag, C.goldText, 'left', { size: 15, ls: 0.12 }),
    widget('heading', { title, header_size: 'h2', title_color: C.navy, ...typo('typography', HEAD, [32, 28, 22], 700, { lh: 1.15, ls: 0 }), _margin: box(8, 0, 0, 0) }),
  ]),
  widget('icon', { selected_icon: { value: 'fas fa-arrow-right', library: 'fa-solid' }, view: 'stacked', shape: 'circle', primary_color: C.navy, secondary_color: C.white, size: px(22), icon_padding: px(21), ...wcls('ctc-article-arrow') }),
]);

module.exports = {
  slug: 'helpful-guides-and-how-tos', title: 'Helpful Guides & How-Tos', kind: 'newpage',
  build: () => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    pageHero('Info', 'Step-by-step help for California tax preparers.', 'Helpful Guides &amp; How-Tos'),
    band(C.white, [stack(GUIDES.map(card), { gap: 16 })], { pad: [40, 88] }),
  ], false)],
};
