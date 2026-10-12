// Section building blocks for the inner pages (Enterprise Apps, AI Platforms, SEED) and the new
// homepage sections. All native Elementor widgets; tables are grid containers, one cell per box.
const L = require('./lib.cjs');
const { C, SERIF, SANS, id, px, box, gap, auto, link, typo, fa, container, widget, band, stack, row, grid, eyebrow, eyebrowText, H2, H3, text, button } = L;

// Navy photo banner at the top of each inner page.
const subHero = (m, { label, title, lede, image, pos = 'center center', buttons = [] }) => band([
  eyebrow(m, label),
  widget('heading', {
    title, header_size: 'h1', title_color: C.white,
    ...typo('typography', SERIF, [56, 46, 36], 300, { lh: 1.08, ls: -0.8 }),
    _element_width: 'initial', _element_custom_width: px(900), _element_custom_width_tablet: px(100, '%'),
  }),
  text(lede, { color: 'rgba(255,255,255,0.86)', size: [18, 18, 17], lh: 1.6, maxW: 720 }),
  ...(buttons.length ? [row(buttons, { gap: 14, settings: { width: auto, padding: box(8, 0, 0, 0) } })] : []),
], {
  pad: [112, 104], gap: 24, image: m[image], imagePos: pos, title: 'Page hero',
  overlay: L.overlayGradient('rgba(14,42,58,0.92)', 'rgba(14,42,58,0.72)', 90),
  settings: { min_height: px(520), min_height_tablet: px(440), min_height_mobile: px(0), flex_justify_content: 'center' },
});

// Section heading: arch + eyebrow, h2, optional intro.
const head = (m, label, title, intro, o = {}) => stack([
  eyebrow(m, label),
  H2(title, o.dark ? C.white : C.navy, { ls: -0.46, sizes: o.sizes }),
  ...(intro ? [text(intro, { color: o.dark ? 'rgba(255,255,255,0.8)' : C.slate, size: [17, 17, 16] })] : []),
], { gap: 14, maxW: o.maxW ?? 720 });

// Green text link with arrow ("Explore SEED →").
const arrowLink = (label, url, o = {}) => widget('button', {
  text: label, link: link(url), align: 'left', selected_icon: fa('fas fa-arrow-right'), icon_align: 'row-reverse', icon_indent: px(8),
  ...typo('typography', SANS, o.size || 15, 700, { lh: 1.3 }),
  button_text_color: o.color || C.navy, hover_color: C.green, background_background: 'classic', background_color: 'rgba(0,0,0,0)',
  button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)',
  border_border: 'solid', border_width: box(0, 0, 1.5, 0), border_color: C.green, border_radius: box(0), text_padding: box(0, 0, 4, 0),
  ...(o.settings || {}),
});

// Numbered cards in a ruled grid (like "How we work"). items: [title, body, (linkLabel, url)]
const numberedCards = (items, cols = [3, 1, 1], o = {}) => grid(items.map(([title, body, linkLabel, url], i) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(40, 32, 40, 32), padding_mobile: box(30, 20, 30, 20),
  background_background: 'classic', background_color: C.white, background_hover_background: 'classic', background_hover_color: C.tint,
  _title: title,
}, [
  widget('heading', { title: String(i + 1).padStart(2, '0'), header_size: 'p', title_color: C.green, ...typo('typography', SERIF, 14, 400, { lh: 1.3, ls: 1.4 }) }),
  H3(title, [22, 21, 20]),
  text(body, { size: 15.5, lh: 1.65 }),
  ...(linkLabel ? [container({ content_width: 'full', padding: box(10, 0, 0, 0), flex_direction: 'column', flex_justify_content: 'flex-end', flex_align_items: 'flex-start', _flex_size: 'grow' }, [arrowLink(linkLabel, url)])] : []),
])), {
  cols, gap: 1, gapT: 1, gapM: 1, align: 'stretch',
  settings: { background_background: 'classic', background_color: C.line, border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.line, ...(o.settings || {}) },
});

// Check-mark list (icon list) for "Key details".
const checkList = (items, o = {}) => L.iconList(items, {
  icon: 'fas fa-check', iconSize: 12, iconColor: C.green, color: o.color || C.slate, hover: o.color || C.slate, size: 15, weight: 500, indent: 12, space: 12,
  settings: { custom_css: 'selector .elementor-icon-list-item { align-items: flex-start !important; }\nselector .elementor-icon-list-icon { margin-top: 5px; }\nselector .elementor-icon-list-text { line-height: 1.55; }' },
});

// Navy band with background photo: label, title, copy, CTA.
const seedBand = (m, { label, title, sub, body, cta, url, image = 'serverBlur', anchor }) => band([
  grid([
    stack([
      eyebrow(m, label),
      H2(title, C.white, { sizes: [42, 36, 30], lh: 1.12 }),
      ...(sub ? [widget('heading', { title: sub, header_size: 'p', title_color: C.green, ...typo('typography', SERIF, [22, 21, 19], 400, { lh: 1.35 }) })] : []),
    ], { gap: 16 }),
    stack([
      text(body, { color: 'rgba(255,255,255,0.84)', size: [17, 17, 16], lh: 1.7 }),
      button(cta, url, 'green', { arrow: true, settings: { _flex_align_self: 'flex-start' } }),
    ], { gap: 28 }),
  ], { cols: [2, 1, 1], gap: [72, 40], gapT: [36, 36], gapM: [28, 28], align: 'center' }),
], {
  pad: [96, 96], image: m[image], anchor, title: label,
  overlay: L.overlayGradient('rgba(30,73,94,0.96)', 'rgba(30,73,94,0.82)', 90),
});

// Comparison table. headers: [3], rows: [[a, b, c]], highlight: column index (1 or 2) shown as the Recco column.
// Desktop/tablet: 3 columns with a navy header row. Mobile: header row hidden, each row becomes a card
// and every value gets its column label above it.
function matrix(headers, rows, { highlight = 2, cols = 'minmax(0,0.8fr) minmax(0,1.1fr) minmax(0,1.1fr)' } = {}) {
  const cell = (children, ci, o = {}) => container({
    content_width: 'full', flex_direction: 'column', flex_gap: gap(6), padding: box(22, 24, 22, 24), padding_mobile: box(o.first ? 18 : 6, 18, o.last ? 18 : 6, 18),
    ...(ci === highlight ? { background_background: 'classic', background_color: o.header ? C.green : 'rgba(149,171,59,0.09)' } : {}),
    ...(o.header && ci !== highlight ? { background_background: 'classic', background_color: C.navy } : {}),
  }, children);
  const gridRow = (children, o = {}) => container({
    container_type: 'grid', content_width: 'full', padding: box(0),
    grid_columns_grid: { unit: 'custom', size: cols }, grid_columns_grid_tablet: { unit: 'custom', size: cols }, grid_columns_grid_mobile: px(1, 'fr'),
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(0), grid_align_items: 'stretch',
    ...(o.header ? { hide_mobile: 'hidden-mobile' } : { border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line }),
    ...(o.settings || {}),
  }, children);
  const mobileLabel = (t) => widget('heading', {
    title: t, header_size: 'p', title_color: C.gray, ...typo('typography', SANS, 11, 700, { lh: 1.3, ls: 1.1, transform: 'uppercase' }),
    hide_desktop: 'hidden-desktop', hide_tablet: 'hidden-tablet',
  });
  return stack([
    gridRow(headers.map((h, ci) => cell([widget('heading', {
      title: h, header_size: 'p', title_color: C.white, ...typo('typography', SANS, [13, 12, 12], 700, { lh: 1.35, ls: 0.9, transform: 'uppercase' }),
    })], ci, { header: true })), { header: true }),
    ...rows.map((r) => gridRow(r.map((v, ci) => cell([
      ...(ci > 0 ? [mobileLabel(headers[ci])] : []),
      ci === 0
        ? widget('heading', { title: v, header_size: 'h3', title_color: C.navy, ...typo('typography', SANS, [16, 15, 17], 700, { lh: 1.35 }) })
        : text(v, { size: [15, 14, 15], lh: 1.55, color: ci === highlight ? C.navy : C.slate, weight: ci === highlight ? 600 : 400 }),
    ], ci, { first: ci === 0, last: ci === r.length - 1 })), {
      settings: { background_background: 'classic', background_color: C.white, background_color_mobile: C.white },
    })),
  ], { gap: 0, settings: {
    border_border: 'solid', border_width: box(1), border_color: C.line, border_radius: box(12), overflow: 'hidden',
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 20, blur: 50, spread: -30, color: 'rgba(30,73,94,0.25)' },
    custom_css: '@media (max-width: 767px) { selector { border-radius: 10px; } }',
    _title: 'Comparison table',
  } });
}

module.exports = { subHero, head, arrowLink, numberedCards, checkList, seedBand, matrix };
