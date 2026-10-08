// Shared building blocks for the RecordFLOW Elementor build.
// Everything here produces native Elementor containers + widgets (no HTML widgets),
// so every text, link, image and color stays editable in the Elementor panel.
const crypto = require('crypto');

const C = {
  blue: '#0B57D0', blueHover: '#083F99', bright: '#3B82F6', ink: '#101828', slate: '#475467',
  cream: '#F3F0E8', paleBlue: '#E9F0FA', pill: '#E3EDFB', eyebrowLight: '#9DB9EF', mist: '#CBD5E1',
  footer: '#0B1322', card: '#1A2538', muted: '#98A2B3', border: '#E4E7EC', borderDark: '#D0D5DD',
  fieldBorder: '#2A3650', white: '#FFFFFF',
};
const HEAD = 'Saira', BODY = 'Figtree';
const APP = 'https://app.myrecordflow.com';
const URL = {
  home: '/', product: '/product-overview/', flowsense: '/flowsense/', videos: '/how-to-videos/',
  about: '/about-us/', contact: '/contact-us/', terms: '/terms-of-service/', privacy: '/privacy-policy/',
  youtube: 'https://www.youtube.com/@myrecordflow', x: 'https://x.com/myrecordflow',
  facebook: 'https://www.facebook.com/profile.php?id=61580314045608', linkedin: 'https://www.linkedin.com/company/108422183',
};

const id = () => crypto.randomBytes(4).toString('hex').slice(0, 7);
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
    title: text, header_size: tag, title_color: color, align,
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
const btnPrimary = (label, url = APP, o = {}) => button(label, url, 'primary', o);
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
function decoMark(media, size, pos, opacity) {
  return widget('image', {
    image: media, image_size: 'full', width: px(size), width_mobile: px(Math.round(size * 0.6)), opacity: px(opacity),
    _position: 'absolute', _element_width: 'initial', _element_custom_width: px(size), _element_custom_width_mobile: px(Math.round(size * 0.6)),
    _z_index: 0, _css_classes: 'rf-deco', custom_css: 'selector { pointer-events: none; }', ...pos,
  });
}
const pos = {
  br: (x, y) => ({ _offset_orientation_h: 'end', _offset_x_end: px(x), _offset_orientation_v: 'end', _offset_y_end: px(y) }),
  bl: (x, y) => ({ _offset_orientation_h: 'start', _offset_x: px(x), _offset_orientation_v: 'end', _offset_y_end: px(y) }),
  tr: (x, y) => ({ _offset_orientation_h: 'end', _offset_x_end: px(x), _offset_orientation_v: 'start', _offset_y: px(y) }),
  tl: (x, y) => ({ _offset_orientation_h: 'start', _offset_x: px(x), _offset_orientation_v: 'start', _offset_y: px(y) }),
};

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
function pillLabel(label, o = {}) {
  return iconList([label], {
    icon: 'fas fa-circle', iconSize: 6, iconColor: o.dot || C.blue, color: o.color || C.blue, size: 12, weight: 600, indent: 8,
    settings: {
      _element_width: 'auto', _flex_align_self: 'flex-start', _background_background: 'classic', _background_color: o.bg || C.pill,
      _border_radius: box(999), _padding: box(6, 12, 6, 12), icon_typography_letter_spacing: px(0.48),
      icon_typography_text_transform: 'uppercase',
    },
  });
}

// Outline pill tags (buttons without links, so the client can add one later)
const tag = (label) => widget('button', {
  text: label, link: { url: '', is_external: '', nofollow: '' }, size: 'xs',
  ...typo('typography', BODY, 13, 500, { lh: 1.2 }),
  button_text_color: C.slate, background_background: 'classic', background_color: 'rgba(0,0,0,0)',
  hover_color: C.slate, button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)',
  border_border: 'solid', border_width: box(1), border_color: C.borderDark, border_radius: box(999), text_padding: box(6, 12, 6, 12),
});

// Navy feature card (#1a2538) used on several pages: small label, h3, body
const darkCard = (label, title, body, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(o.gap ?? 10), padding: box(28), padding_mobile: box(24),
  background_background: 'classic', background_color: C.card, border_radius: box(12),
  ...(o.minH ? { min_height: px(o.minH) } : {}), overflow: 'hidden',
}, [
  ...(o.top ? [o.top] : [widget('heading', { title: label, header_size: 'p', title_color: C.eyebrowLight, ...typo('typography', BODY, 12, 600, { lh: 1.3 }) })]),
  H3(title, C.white, { sizes: o.titleSizes || [21, 21, 20] }),
  text(body, { color: C.mist, size: 15 }),
]);

// Section heading block: eyebrow + h2 (+ optional paragraph)
const sectionHead = (eb, title, o = {}) => stack([
  eyebrow(eb, o.dark ? C.eyebrowLight : C.blue, o.align || 'left'),
  H2(title, o.dark ? C.white : C.ink, o.align || 'left'),
  ...(o.body ? [text(o.body, { color: o.dark ? C.mist : C.slate, align: o.align || 'left' })] : []),
], { gap: 14, maxW: o.maxW ?? 560, align: o.align === 'center' ? 'center' : undefined });

/* ------------------------------------------------------------- sections */
// Cream subpage hero with dot grid + faint mark bottom-right
function subHero(m, eb, title, lede, extra = []) {
  return band(C.cream, [
    decoMark(m.iconBlue, 480, pos.br(-120, -160), 0.06),
    eyebrow(eb, C.blue, 'center'),
    H1(title, C.ink, 'center', { maxW: 760 }),
    text(lede, { align: 'center', size: 18, lh: 1.55, maxW: 600, settings: { typography_font_size_mobile: px(17) } }),
    ...extra,
  ], { pad: [80, 72], gap: 18, align: 'center', dots: m.dots });
}

// Navy "Ready to start your free trial?" band used on every subpage
function ctaBand(m) {
  return band(C.ink, [
    decoMark(m.iconWhite, 420, pos.bl(-60, -120), 0.04),
    eyebrow('Get Started Today', C.eyebrowLight, 'center'),
    H2('Ready to start your free trial?', C.white, 'center'),
    text('Seven days, no card required, cancel anytime.', { align: 'center', color: C.mist, maxW: 520 }),
    btnPrimary('Start Risk-Free 7-day Trial', APP, { align: 'center' }),
  ], { pad: [80, 80], gap: 18, align: 'center' });
}

/* ---------------------------------------------------------------- header */
function header(m, menuId) {
  return [container({
    content_width: 'boxed', boxed_width: px(1144), flex_direction: 'row', flex_wrap: 'nowrap',
    flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(24), flex_gap_mobile: gap(12),
    padding: box(16, 28, 16, 28), padding_mobile: box(12, 20, 12, 20),
    background_background: 'classic', background_color: C.white,
    border_border: 'solid', border_width: box(0, 0, 3, 0), border_color: C.blue,
    sticky: 'top', sticky_on: ['desktop', 'tablet', 'mobile'], z_index: 20,
  }, [
    image(m.logoBlack, { width: [196, 196, 150], link: URL.home, align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(196), _element_custom_width_mobile: px(150), _flex_size: 'none' } }),
    widget('nav-menu', {
      menu: menuId, layout: 'horizontal', align_items: 'center', pointer: 'underline', animation_line: 'fade',
      dropdown: 'tablet', toggle: 'burger', toggle_align: 'right', full_width: 'stretch',
      ...typo('menu_typography', BODY, 14, 500, { lh: 1.4 }),
      color_menu_item: C.ink, color_menu_item_hover: C.ink, color_menu_item_active: C.blue,
      pointer_color_menu_item_hover: C.ink, pointer_color_menu_item_active: C.blue, pointer_width: px(1),
      padding_horizontal_menu_item: px(13), padding_vertical_menu_item: px(6),
      ...typo('dropdown_typography', BODY, 16, 500),
      color_dropdown_item: C.ink, background_color_dropdown_item: C.white,
      color_dropdown_item_hover: C.white, background_color_dropdown_item_hover: C.blue,
      color_dropdown_item_active: C.white, background_color_dropdown_item_active: C.blue,
      padding_horizontal_dropdown_item: px(28), padding_vertical_dropdown_item: px(14),
      dropdown_top_distance: px(19), dropdown_top_distance_mobile: px(15),
      toggle_color: C.ink, toggle_background_color: 'rgba(0,0,0,0)', toggle_size: px(26),
      _flex_size: 'grow', _flex_size_tablet: 'none', _flex_size_mobile: 'none',
      _flex_order_tablet: 'end', _flex_order_mobile: 'end',
    }),
    container({
      content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto,
      flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(18), flex_gap_mobile: gap(10),
      flex_justify_content: 'flex-end', _flex_size: 'none', _flex_size_tablet: 'grow', _flex_size_mobile: 'grow', padding: box(0),
    }, [
      textLink('Log-in', APP, { size: 14, color: C.slate, padY: 11, settings: { hide_mobile: 'hidden-mobile' } }),
      btnPrimary('Try Risk-Free', APP, { size: 14, pad: box(11, 18, 11, 18), settings: { text_padding_mobile: box(10, 14, 10, 14) } }),
    ]),
  ], false)];
}

/* ---------------------------------------------------------------- footer */
const footLinks = (items, o = {}) => iconList(items, { color: C.mist, hover: C.white, size: 14, weight: 400, space: 10, ...o });

function footer(m) {
  const col = (children, g = 10) => stack(children, { gap: g });
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0),
    background_background: 'classic', background_color: C.footer,
    border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: 'rgba(255,255,255,0.08)',
  }, [
    container({
      container_type: 'grid', content_width: 'boxed', boxed_width: px(1144),
      grid_columns_grid: px(4, 'fr'), grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
      grid_rows_grid: { unit: 'custom', size: 'auto' }, grid_rows_grid_tablet: { unit: 'custom', size: 'auto' }, grid_rows_grid_mobile: { unit: 'custom', size: 'auto' },
      grid_gaps: gap(40), grid_gaps_mobile: gap(36), grid_align_items: 'start',
      padding: box(56, 28, 28, 28), padding_mobile: box(48, 20, 24, 20),
    }, [
      col([
        image(m.logoWhite, { width: 182, link: URL.home, align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(182) } }),
        text('Software and sensors for ditch and canal water delivery. American owned, based in Colorado, USA.', { color: C.mist, size: 14, maxW: 300 }),
        footLinks([['YouTube', URL.youtube], ['X', URL.x], ['Facebook', URL.facebook], ['LinkedIn', URL.linkedin]],
          { inline: true, space: 14, color: C.white, hover: C.eyebrowLight, size: 13, weight: 600 }),
      ], 16),
      col([eyebrow('Product', C.eyebrowLight), footLinks([['Product Overview', URL.product], ['FlowSENSE', URL.flowsense], ['How-To Videos', URL.videos], ['Log-in', APP]])]),
      col([eyebrow('Company', C.eyebrowLight), footLinks([['About Us', URL.about], ['Contact Us', URL.contact], ['Terms of Service', URL.terms], ['Privacy Policy', URL.privacy]])]),
      col([eyebrow('Newsletter', C.eyebrowLight),
        text('Water management notes, product updates, no spam.', { color: C.mist, size: 14, lh: 1.5 }),
        widget('form', {
          form_name: 'Newsletter',
          form_fields: [{ _id: id(), custom_id: 'email', field_type: 'email', field_label: 'Email', placeholder: 'Email', required: 'true', width: '70', width_tablet: '70', width_mobile: '70' }],
          show_labels: '', input_size: 'sm', button_text: 'Submit', button_size: 'sm', button_width: '30', button_width_tablet: '30', button_width_mobile: '30',
          submit_actions: ['email'], email_subject: 'New RecordFLOW newsletter sign-up',
          column_gap: px(8), row_gap: px(8),
          field_text_color: C.white, field_background_color: C.ink, field_border_color: C.fieldBorder, field_border_width: box(1), field_border_radius: box(6),
          ...typo('field_typography', BODY, 14, 400),
          button_background_color: C.blue, button_text_color: C.white, button_background_hover_color: C.blueHover, button_hover_color: C.white,
          button_border_radius: box(6), ...typo('button_typography', BODY, 14, 600), button_text_padding: box(10, 14, 10, 14),
          success_message: 'Thanks! You are on the list.',
        }),
      ]),
    ]),
    container({
      content_width: 'boxed', boxed_width: px(1144), flex_direction: 'row', flex_direction_mobile: 'column',
      flex_justify_content: 'space-between', flex_align_items: 'center', flex_align_items_mobile: 'flex-start', flex_wrap: 'wrap', flex_gap: gap(8),
      custom_css: 'selector > .e-con-inner { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; }',
      padding: box(0, 28, 28, 28), padding_mobile: box(0, 20, 24, 20),
    }, [
      text('© 2026 RecordFLOW. All Rights Reserved.', { color: C.muted, size: 12, lh: 1.5, inline: true }),
      container({ content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto, _flex_size: 'none', flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(8), padding: box(0) }, [
        image(m.iconBlue, { width: 16, settings: { _element_width: 'initial', _element_custom_width: px(16) } }),
        text('Built by water managers, not tech insiders.', { color: C.muted, size: 12, lh: 1.5, inline: true }),
      ]),
    ]),
  ], false)];
}

// Page Settings > Custom CSS: the site's older Additional CSS forced boxed containers to 1280px.
const pageSettings = {
  custom_css: '/* Let Elementor\'s Boxed Width control work (older site CSS forced 1280px). */\nselector .e-con.e-con-boxed > .e-con-inner { max-width: var(--content-width); }\n',
};

module.exports = {
  C, HEAD, BODY, APP, URL, id, px, box, gap, auto, link, resp, typo, container, widget, fa,
  band, stack, row, grid, eyebrow, heading, H1, H2, H3, text, button, btnPrimary, textLink, image, decoMark, pos,
  iconList, checkList, pillLabel, tag, darkCard, sectionHead, subHero, ctaBand, header, footer, pageSettings,
};
