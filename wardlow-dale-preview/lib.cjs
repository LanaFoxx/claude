// Elementor JSON helpers for the Wardlow & Dale preview build.
// Every container is a Flexbox Container set to Full Width; colors and type are set on each
// widget from the SPEC.md tokens (Global Colors/Fonts are deliberately not used for the preview).
const crypto = require('crypto');

const T = {
  ivory: '#F7F4EE', linen: '#EFEBE3', white: '#FFFFFF', ink: '#0B1F1A', stone: '#5A6661',
  evergreen: '#0F4A3C', brand: '#015F4A', gold: '#C9A961', goldHover: '#D6BB7B', btn: '#8C6E2B', btnHover: '#7A5F22', antique: '#7A5F22',
  mist: '#A8B3AE', rule: '#DDD6C8', field: '#8C8579', error: '#B42318',
};
const FONT = 'Manrope';

const id = () => crypto.randomBytes(4).toString('hex').slice(0, 7);
const px = (size, unit = 'px') => ({ unit, size, sizes: [] });
const custom = (v) => ({ unit: 'custom', size: v, sizes: [] });
const box = (t, r = t, b = t, l = r, unit = 'px') => ({ unit, top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: false });
const cbox = (t, r, b, l) => ({ unit: 'custom', top: t, right: r, bottom: b, left: l, isLinked: false });
const gap = (c, r = c) => ({ unit: 'px', size: c, column: String(c), row: String(r), isLinked: c === r });
const link = (url) => ({ url, is_external: '', nofollow: '' });
// Side padding of every section: 60px, or wider so the content is 1320px max and centred.
const SIDE = 'max(60px, calc((100% - 1320px) / 2))';

function typo(prefix, size, weight, o = {}) {
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: FONT, [`${prefix}_font_weight`]: String(weight) };
  if (size !== undefined) s[`${prefix}_font_size`] = typeof size === 'string' ? custom(size) : px(size);
  if (o.lh !== undefined) s[`${prefix}_line_height`] = typeof o.lh === 'string' ? custom(o.lh) : px(o.lh, 'em');
  if (o.ls !== undefined) s[`${prefix}_letter_spacing`] = px(o.ls, 'em');
  if (o.transform) s[`${prefix}_text_transform`] = o.transform;
  return s;
}

// Container: full width, no padding, no gap unless given. `o` = native settings.
function C(cls, o = {}, children = [], isInner = true) {
  const s = {
    content_width: 'full', flex_direction: o.dir || 'column', padding: o.padding || box(0), flex_gap: o.gap !== undefined ? (typeof o.gap === 'object' ? o.gap : gap(o.gap)) : gap(0),
    css_classes: o.dir === 'row' ? `${cls} wd-row` : cls,
  };
  if (o.dir === 'row') s.flex_wrap = o.wrap || 'nowrap';
  if (o.justify) s.flex_justify_content = o.justify;
  if (o.align) s.flex_align_items = o.align;
  if (o.bg) Object.assign(s, { background_background: 'classic', background_color: o.bg });
  if (o.grid) {
    // Native grid at every Elementor breakpoint; the 980/600 changes are in the scoped CSS.
    const g = { unit: 'custom', size: o.grid, sizes: [] };
    Object.assign(s, {
      container_type: 'grid', grid_columns_grid: g, grid_columns_grid_tablet: g, grid_columns_grid_mobile: g,
      grid_rows_grid: { unit: 'custom', size: 'auto' }, grid_rows_grid_tablet: { unit: 'custom', size: 'auto' }, grid_rows_grid_mobile: { unit: 'custom', size: 'auto' },
      grid_gaps: o.gap !== undefined ? (typeof o.gap === 'object' ? o.gap : gap(o.gap)) : gap(0),
      grid_align_items: o.gridAlign || 'stretch', grid_auto_flow: 'row',
    });
    delete s.flex_direction; delete s.flex_gap;
  }
  if (o.tag) s.html_tag = o.tag;
  if (o.link) s.link = link(o.link);
  if (o.cssId) s._element_id = o.cssId;
  if (o.attrs) s._attributes = o.attrs;
  if (o.border) Object.assign(s, { border_border: 'solid', border_width: o.border.width, border_color: o.border.color });
  if (o.minH) s.min_height = px(o.minH);
  if (o.extra) Object.assign(s, o.extra);
  return { id: id(), elType: 'container', isInner, settings: s, elements: children };
}
const W = (widgetType, cls, settings) => ({ id: id(), elType: 'widget', widgetType, settings: { ...settings, ...(cls ? { _css_classes: cls } : {}) }, elements: [] });

// Heading widget. text may contain <strong>, <br>, <span class="wd-chip">.
const H = (text, tag, cls, o = {}) => W('heading', cls, {
  title: text, header_size: tag, title_color: o.color || T.ink,
  ...typo('typography', o.size ?? 18, o.weight ?? 400, { lh: o.lh, ls: o.ls, transform: o.transform }),
  ...(o.link ? { link: link(o.link) } : {}),
  ...(o.cssId ? { _element_id: o.cssId } : {}),
});
// Eyebrow: 13px / 600 / +0.14em / uppercase
const EB = (text, cls = '', color = T.evergreen, o = {}) => H(text, 'p', `wd-eyebrow ${cls}`.trim(), { color, size: o.size || 13, weight: 600, lh: 1.6, ls: 0.14, transform: 'uppercase' });
const H2 = (text, cls = '', color = T.ink, o = {}) => H(text, 'h2', `wd-h2 ${cls}`.trim(), { color, size: o.size || 52, weight: 300, lh: o.lh || 1.1, ls: -0.025 });
const H3 = (text, cls = '', o = {}) => H(text, 'h3', `wd-h3 ${cls}`.trim(), { color: o.color || T.ink, size: o.size || 26, weight: 700, lh: o.lh || 1.2, ls: o.ls ?? -0.01, link: o.link, cssId: o.cssId });
// Text editor (rich text)
const TX = (html, cls = '', o = {}) => W('text-editor', `wd-tx ${cls}`.trim(), {
  editor: html, text_color: o.color || T.ink, ...typo('typography', o.size ?? 18, o.weight ?? 400, { lh: o.lh ?? 1.6, ls: o.ls, transform: o.transform }),
  ...(o.cssId ? { _element_id: o.cssId } : {}),
});
const IMG = (m, cls = '', o = {}) => W('image', `wd-img ${cls}`.trim(), {
  image: { id: m.id, url: m.url, alt: m.alt || '', source: 'library' }, image_size: o.size || 'full',
  ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
});
const svg = (m) => ({ value: { id: m.id, url: m.url }, library: 'svg' });
const ICON = (m, cls = '', color = T.evergreen, size = 20) => W('icon', `wd-icon ${cls}`.trim(), {
  selected_icon: svg(m), primary_color: color, size: px(size),
});
// Buttons: gold (primary), outline, text link, icon-only (label kept for screen readers)
function BTN(text, url, cls, o = {}) {
  const v = o.variant || 'gold';
  const base = {
    text, link: link(url), ...typo('typography', o.size || (v === 'gold' && !o.sm ? 16 : 15), 600, { lh: 1.2, ls: 0, transform: 'none' }),
    border_radius: box(2), ...(o.icon ? { selected_icon: svg(o.icon), icon_align: o.iconBefore ? 'row' : 'row-reverse', icon_indent: px(o.iconGap ?? 10) } : {}),
  };
  const looks = {
    gold: { background_color: T.btn, button_text_color: T.white, button_background_hover_color: T.btnHover, hover_color: T.white, text_padding: box(0, o.sm ? 24 : 28) },
    outline: { background_color: 'rgba(0,0,0,0)', button_text_color: T.evergreen, button_background_hover_color: T.evergreen, hover_color: T.white, border_border: 'solid', border_width: box(1.5), border_color: T.evergreen, text_padding: box(0, 24) },
    text: { background_color: 'rgba(0,0,0,0)', button_text_color: o.color || T.ink, hover_color: o.hover || T.evergreen, button_background_hover_color: 'rgba(0,0,0,0)', text_padding: box(0) },
  };
  return W('button', `wd-btn wd-btn-${v} ${cls || ''}`.trim(), { ...base, ...looks[v], ...(o.extra || {}) });
}
const iconList = (items, cls, o = {}) => W('icon-list', `wd-list ${cls}`.trim(), {
  view: o.inline ? 'inline' : 'traditional',
  icon_list: items.map((it) => ({ _id: id(), text: it.text, selected_icon: it.icon ? svg(it.icon) : { value: '', library: '' }, link: it.link ? link(it.link) : { url: '' } })),
  icon_color: o.iconColor || T.gold, text_color: o.color || T.ivory, text_color_hover: o.hover || T.gold, icon_size: px(o.iconSize || 18),
  space_between: px(o.space ?? 12), text_indent: px(o.indent ?? 12),
  ...typo('icon_typography', o.size || 16, o.weight || 400, { lh: o.lh ?? 1.55 }),
});

module.exports = { T, FONT, SIDE, id, px, custom, box, cbox, gap, link, typo, C, W, H, EB, H2, H3, TX, IMG, ICON, BTN, iconList, svg };
