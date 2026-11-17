// Elementor build library for nickponterealty.com ("Coastal Light" design).
// Produces native Elementor containers + widgets so every text, image, link and color is editable in Elementor.
// Adapted from the RecordFLOW build (recordflow-site/lib.cjs).
const crypto = require('crypto');

const C = {
  blue: '#3F6E99', blueHover: '#2F5A80', bright: '#3F6E99', ink: '#1F3A5F', navy: '#1F3A5F', text: '#243447', slate: '#5A6B7D', faint: '#637387',
  bg: '#F3F7FA', panel: '#E6EFF5', plate: '#C9DBE8', border: '#D7E3EC', div: '#E3ECF3', borderDark: '#B9CCDC', pill: '#E6EFF5',
  white: '#FFFFFF', mist: '#DCE8F0', eyebrowLight: '#B9CCDC', dark1: '#2F5078', dark2: '#243F62', muted: '#5A6B7D',
};
const HEAD = 'Manrope', BODY = 'Figtree';
const clean = (t) => t;
const formSetup = () => ({});
const URL = {};

function id() { return crypto.randomBytes(4).toString('hex').slice(0, 7); }

const px = (size, unit = 'px') => ({ unit, size, sizes: [] });
const box = (t, r = t, b = t, l = r, unit = 'px') => ({ unit, top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: false });
const gap = (n, r = n) => ({ unit: 'px', size: n, column: String(n), row: String(r), isLinked: n === r });
const auto = { unit: 'custom', size: 'auto' };
const link = (url) => ({ url, is_external: /^https?:/.test(url) ? 'on' : '', nofollow: '' });
const resp = (key, [d, t, m], fn = (v) => v) => {
  const o = {};
  if (d !== undefined) o[key] = fn(d);
  if (t !== undefined) o[`${key}_tablet`] = fn(t);
  if (m !== undefined) o[`${key}_mobile`] = fn(m);
  return o;
};

// Typography. sizes = number or [desktop, tablet, mobile]
function typo(prefix, family, sizes, weight, extra = {}) {
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: family, [`${prefix}_font_weight`]: String(weight) };
  Object.assign(s, resp(`${prefix}_font_size`, Array.isArray(sizes) ? sizes : [sizes], (v) => px(v)));
  if (extra.lh) s[`${prefix}_line_height`] = px(extra.lh, 'em');
  if (extra.ls !== undefined) s[`${prefix}_letter_spacing`] = px(extra.ls);
  if (extra.transform) s[`${prefix}_text_transform`] = extra.transform;
  if (extra.style) s[`${prefix}_font_style`] = extra.style;
  return s;
}

const container = (settings, elements = [], isInner = true) => ({ id: id(), elType: 'container', isInner, settings, elements });
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });

/* ---------------------------------------------------------------- layout */
// Full-width page section: background on the outer box, content boxed at 1200px (1144 + 28px gutters).
function band(bg, children, o = {}) {
  const [pt, pb] = o.pad || [96, 96];
  return container({
    content_width: 'boxed', boxed_width: px(o.width || 1144), flex_direction: 'column',
    flex_gap: gap(o.gap ?? 40), ...(o.gapM !== undefined ? { flex_gap_mobile: gap(o.gapM) } : {}),
    padding: box(pt, 28, pb, 28),
    padding_tablet: box(Math.round(pt * 0.82), 28, Math.round(pb * 0.82), 28),
    padding_mobile: box(Math.round(pt * 0.66), 20, Math.round(pb * 0.66), 20),
    background_background: 'classic', background_color: bg,
    ...(o.dots ? { background_image: o.dots, background_repeat: 'repeat', background_position: 'top left', background_size: 'auto' } : {}),
    ...(o.overflow !== false ? { overflow: 'hidden' } : {}),
    ...(o.align ? { flex_align_items: o.align } : {}),
    ...(o.border ? { border_border: 'solid', border_width: o.border, border_color: C.border } : {}),
    ...(o.anchor ? { _element_id: o.anchor } : {}),
    ...(o.settings || {}),
  }, children, false);
}

// Flex column stack (no padding, full width)
const stack = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(o.gap ?? 18),
  ...(o.align ? { flex_align_items: o.align } : {}),
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.maxW ? { width: px(o.maxW), width_tablet: px(100, '%'), width_mobile: px(100, '%') } : {}),
  ...(o.settings || {}),
}, children);

// Flex row (wraps), used for button groups, inline items
const row = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', padding: box(0),
  flex_gap: gap(o.gap ?? 18, o.rowGap ?? o.gap ?? 18), flex_align_items: o.align || 'center',
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.settings || {}),
}, children);

// CSS grid. cols = [desktop, tablet, mobile] (numbers or custom templates)
function grid(children, o = {}) {
  const [d, t, m] = o.cols || [2, 2, 1];
  const col = (v) => (typeof v === 'number' ? px(v, 'fr') : { unit: 'custom', size: v });
  return container({
    container_type: 'grid', content_width: 'full', padding: box(0),
    grid_columns_grid: col(d), grid_columns_grid_tablet: col(t), grid_columns_grid_mobile: col(m),
    grid_rows_grid: { unit: 'custom', size: 'auto' }, grid_rows_grid_tablet: { unit: 'custom', size: 'auto' }, grid_rows_grid_mobile: { unit: 'custom', size: 'auto' },
    grid_auto_flow: 'row',
    grid_gaps: gap(o.gap ?? 56, o.rowGap ?? o.gap ?? 56),
    ...(o.gapT !== undefined ? { grid_gaps_tablet: gap(o.gapT, o.gapT) } : {}),
    grid_gaps_mobile: gap(o.gapM ?? Math.min(o.gap ?? 56, 40), o.gapM ?? Math.min(o.rowGap ?? o.gap ?? 56, 40)),
    grid_align_items: o.align || 'center',
    ...(o.settings || {}),
  }, children);
}

/* --------------------------------------------------------------- widgets */
const eyebrow = (text, color = C.blue, align = 'left', o = {}) => widget('heading', {
  title: text, header_size: 'p', title_color: color, align,
  ...typo('typography', BODY, o.size || 11, o.weight || 700, { lh: 1.3, ls: o.ls ?? 1.54, transform: 'uppercase' }),
});

function heading(text, tag, sizes, color = C.ink, align = 'left', o = {}) {
  return widget('heading', {
    title: clean(text), header_size: tag, title_color: color, align,
    ...typo('typography', HEAD, sizes, o.weight || 800, { lh: o.lh || 1.08, ls: o.ls ?? -0.4, style: o.style }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    ...(o.link ? { link: link(o.link) } : {}),
    ...(o.settings || {}),
  });
}
const H1 = (text, color, align = 'center', o = {}) => heading(text, 'h1', o.sizes || [58, 46, 38], color, align, { lh: 1.04, ...o });
const H2 = (text, color, align = 'left', o = {}) => heading(text, 'h2', o.sizes || [44, 36, 30], color, align, o);
const H3 = (text, color, o = {}) => heading(text, 'h3', o.sizes || [22, 21, 20], color, o.align || 'left', { weight: 700, lh: 1.2, ls: 0, ...o });

function text(html, o = {}) {
  html = clean(html);
  const body = /^\s*</.test(html) ? html : `<p>${html}</p>`;
  return widget('text-editor', {
    editor: body, paragraph_spacing: px(o.pSpace ?? 0), align: o.align || 'left',
    text_color: o.color || C.slate, link_color: o.linkColor || C.blue, link_hover_color: o.linkHover || C.blueHover,
    ...typo('typography', o.family || BODY, o.size || 17, o.weight || 400, { lh: o.lh || 1.6, style: o.style }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    ...(o.inline ? { _element_width: 'auto' } : {}),
    ...(o.settings || {}),
  });
}

// Solid button. variant: 'primary' | 'navy' | 'link'
function button(label, url, variant = 'primary', o = {}) {
  const base = {
    text: label, link: link(url), align: o.align || '',
    ...typo('typography', BODY, o.size || 16, 600, { lh: 1.2 }),
    border_radius: box(6), text_padding: o.pad || box(15, 24, 15, 24),
  };
  if (variant === 'primary') Object.assign(base, {
    button_text_color: C.white, background_background: 'classic', background_color: C.blue,
    hover_color: C.white, button_background_hover_background: 'classic', button_background_hover_color: C.blueHover,
    ...(o.shadow ? { button_box_shadow_box_shadow_type: 'yes', button_box_shadow_box_shadow: { horizontal: 0, vertical: 8, blur: 20, spread: 0, color: 'rgba(11,87,208,0.25)' } } : {}),
  });
  if (variant === 'navy') Object.assign(base, {
    button_text_color: C.white, background_background: 'classic', background_color: C.ink,
    hover_color: C.white, button_background_hover_background: 'classic', button_background_hover_color: o.hoverBg || C.blue,
  });
  if (variant === 'link') Object.assign(base, {
    button_text_color: o.color || C.ink, background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    hover_color: o.hover || C.blue, button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)',
    text_padding: box(o.padY ?? 0, 0, o.padY ?? 0, 0), size: 'sm',
  });
  return widget('button', { ...base, ...(o.settings || {}) });
}
const btnPrimary = (label, url, o = {}) => button(label, url, 'primary', o);
const textLink = (label, url, o = {}) => button(label, url, 'link', { size: 15, align: 'left', ...o });

function image(media, o = {}) {
  return widget('image', {
    image: media, image_size: 'full', align: o.align || 'center',
    ...(o.width !== undefined ? resp('width', Array.isArray(o.width) ? o.width : [o.width], (v) => (typeof v === 'object' ? v : px(v))) : {}),
    ...(o.maxW ? { space: px(o.maxW) } : {}),
    ...(o.height ? { ...resp('height', Array.isArray(o.height) ? o.height : [o.height], (v) => px(v)), 'object-fit': 'cover', 'object-position': o.objPos || 'center center' } : {}),
    ...(o.radius ? { image_border_radius: box(o.radius) } : {}),
    ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
    ...(o.shadow ? { custom_css: `selector img { filter: drop-shadow(${o.shadow}); }` } : {}),
    ...(o.settings || {}),
  });
}

// Faint brand-mark watermark, absolutely positioned in its section.

const fa = (value) => ({ value, library: value.startsWith('far') ? 'fa-regular' : 'fa-solid' });

// Icon List. items: [text] or [[text, url]]
function iconList(items, o = {}) {
  return widget('icon-list', {
    view: o.inline ? 'inline' : 'traditional',
    icon_list: items.map((it) => {
      const [t, u] = Array.isArray(it) ? it : [it];
      return { _id: id(), text: t, selected_icon: o.icon ? fa(o.icon) : { value: '', library: '' }, ...(u ? { link: link(u) } : {}) };
    }),
    space_between: px(o.space ?? 10), icon_size: px(o.iconSize ?? 0), text_indent: px(o.indent ?? (o.icon ? 10 : 0)),
    icon_color: o.iconColor || C.blue, text_color: o.color || C.slate, text_color_hover: o.hover || o.color || C.slate,
    ...typo('icon_typography', o.family || BODY, o.size || 15, o.weight || 500, { lh: 1.4 }),
    ...(o.settings || {}),
  });
}

// Checklist with pale-blue rounded check squares, in a CSS grid of `cols` columns.
function checkList(items, [d, t, m] = [2, 2, 1], o = {}) {
  const css = (n) => `selector .elementor-icon-list-items { display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); gap: ${o.rowGap ?? 10}px ${o.colGap ?? 24}px; }`;
  return iconList(items, {
    icon: 'fas fa-check', iconSize: 10, color: C.ink, size: 15, weight: 500, indent: 10, space: 0,
    settings: {
      custom_css: `${css(d)}
selector .elementor-icon-list-item { margin: 0 !important; padding: 0 !important; }
selector .elementor-icon-list-icon { flex: none; width: 18px; height: 18px; padding: 0 !important; border-radius: 4px; background: ${C.pill}; display: inline-flex; align-items: center; justify-content: center; }
selector .elementor-icon-list-icon svg { width: 10px; height: 10px; margin: 0 !important; }
@media (max-width: 1024px) { ${css(t)} }
@media (max-width: 767px) { ${css(m)} }`,
    },
  });
}

// Small rounded "pill" label with a dot (icon list single item + widget background)

// Outline pill tags (buttons without links, so the client can add one later)

// Navy feature card (#1a2538) used on several pages: small label, h3, body

// Section heading block: eyebrow + h2 (+ optional paragraph)
const sectionHead = (eb, title, o = {}) => stack([
  eyebrow(eb, o.dark ? C.eyebrowLight : C.blue, o.align || 'left'),
  H2(title, o.dark ? C.white : C.ink, o.align || 'left'),
  ...(o.body ? [text(o.body, { color: o.dark ? C.mist : C.slate, align: o.align || 'left' })] : []),
], { gap: 14, maxW: o.maxW ?? 560, align: o.align === 'center' ? 'center' : undefined });

/* ------------------------------------------------------------- sections */
// Cream subpage hero with dot grid + faint mark bottom-right

// Navy "Ready to start your free trial?" band used on every subpage


module.exports = { C, HEAD, BODY, id, px, box, gap, auto, link, resp, typo, container, widget, fa, band, stack, row, grid, eyebrow, heading, H1, H2, H3, text, button, btnPrimary, textLink, image, iconList, checkList, sectionHead };
