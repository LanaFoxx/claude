// Shared building blocks for the Recco Consulting Elementor build.
// Everything here produces native Elementor containers + widgets (no HTML widgets),
// so every text, link, image and color stays editable in the Elementor panel.
const crypto = require('crypto');

const C = {
  navy: '#1E495E', green: '#95AB3B', slate: '#4A5F6B', gray: '#808285', line: '#DFE6EA', lineSoft: '#E6EBEE',
  field: '#D6DEE2', tint: '#F4F7F8', deep: 'rgba(14,42,58,0.96)', white: '#FFFFFF',
};
const SERIF = 'Source Serif 4', SANS = 'Manrope';
const EMAIL = 'info@reccoconsulting.com';
const U = { privacy: '/privacy-policy/', terms: '/terms-of-use/', apps: '/enterprise-apps/', platforms: '/ai-platforms/', seed: '/seed/' };
// Site navigation, shared by the footer (the header uses the WordPress menu "Recco Main Menu").
const NAV = [['Home', '/'], ['Services', '/#services'], ['Enterprise Apps', U.apps], ['AI Platforms', U.platforms], ['SEED', U.seed], ['About Us', '/#about'], ['Contact', '/#contact']];
const A = { services: '/#services', platforms: '/#platforms', news: '/#news', about: '/#about', approach: '/#approach', contact: '/#contact' };

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
const fa = (value) => ({ value, library: value.startsWith('far') ? 'fa-regular' : 'fa-solid' });

// Typography. sizes = number or [desktop, tablet, mobile]
function typo(prefix, family, sizes, weight, extra = {}) {
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: family, [`${prefix}_font_weight`]: String(weight) };
  Object.assign(s, resp(`${prefix}_font_size`, Array.isArray(sizes) ? sizes : [sizes], (v) => px(v)));
  if (extra.lh) s[`${prefix}_line_height`] = px(extra.lh, 'em');
  if (extra.ls !== undefined) s[`${prefix}_letter_spacing`] = px(extra.ls);
  if (extra.transform) s[`${prefix}_text_transform`] = extra.transform;
  return s;
}

const container = (settings, elements = [], isInner = true) => ({ id: id(), elType: 'container', isInner, settings, elements });
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });

/* ---------------------------------------------------------------- layout */
// Full-width section: background on the outer box, content boxed at 1216px (1280 incl. 32px gutters).
function band(children, o = {}) {
  const [pt, pb] = o.pad || [96, 96];
  return container({
    content_width: 'boxed', boxed_width: px(o.width || 1216), flex_direction: 'column',
    flex_gap: gap(o.gap ?? 48), flex_gap_mobile: gap(o.gapM ?? Math.min(o.gap ?? 48, 36)),
    padding: box(pt, 32, pb, 32),
    padding_tablet: box(Math.round(pt * 0.8), 32, Math.round(pb * 0.8), 32),
    padding_mobile: box(Math.round(pt * 0.66), 20, Math.round(pb * 0.66), 20),
    ...(o.bg ? { background_background: 'classic', background_color: o.bg } : {}),
    ...(o.image ? {
      background_background: 'classic', background_color: o.bg || C.navy, background_image: o.image,
      background_position: o.imagePos || 'center center', background_size: 'cover', background_repeat: 'no-repeat',
    } : {}),
    ...(o.overlay || {}),
    overflow: 'hidden',
    ...(o.anchor ? { _element_id: o.anchor } : {}),
    ...(o.title ? { _title: o.title } : {}),
    ...(o.settings || {}),
  }, children, false);
}

// Background overlays (Elementor: Style > Background Overlay)
const overlayColor = (color) => ({ background_overlay_background: 'classic', background_overlay_color: color, background_overlay_opacity: px(1) });
const overlayGradient = (a, b, angle = 180, aStop = 0, bStop = 100) => ({
  background_overlay_background: 'gradient', background_overlay_color: a, background_overlay_color_stop: px(aStop, '%'),
  background_overlay_color_b: b, background_overlay_color_b_stop: px(bStop, '%'),
  background_overlay_gradient_type: 'linear', background_overlay_gradient_angle: px(angle, 'deg'), background_overlay_opacity: px(1),
});

const stack = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(o.gap ?? 18),
  ...(o.align ? { flex_align_items: o.align } : {}),
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  // A cap, not a fixed width, so the block can shrink in narrow columns (e.g. small laptops).
  ...(o.maxW ? { width: px(100, '%'), custom_css: `selector { max-width: ${o.maxW}px; }` } : {}),
  ...(o.settings || {}),
}, children);

const row = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: o.nowrap ? 'nowrap' : 'wrap', padding: box(0),
  flex_gap: gap(o.gap ?? 18, o.rowGap ?? o.gap ?? 18), flex_align_items: o.align || 'center',
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.settings || {}),
}, children);

// CSS grid. cols = [desktop, tablet, mobile] (numbers or custom templates)
function grid(children, o = {}) {
  const [d, t, m] = o.cols || [2, 1, 1];
  const col = (v) => (typeof v === 'number' ? px(v, 'fr') : { unit: 'custom', size: v });
  const g = (v) => (Array.isArray(v) ? gap(v[0], v[1]) : gap(v));
  return container({
    container_type: 'grid', content_width: 'full', padding: box(0),
    grid_columns_grid: col(d), grid_columns_grid_tablet: col(t), grid_columns_grid_mobile: col(m),
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_auto_flow: 'row',
    grid_gaps: g(o.gap ?? 56), grid_gaps_tablet: g(o.gapT ?? o.gap ?? 56), grid_gaps_mobile: g(o.gapM ?? 40),
    grid_align_items: o.align || 'start',
    ...(o.settings || {}),
  }, children);
}

/* --------------------------------------------------------------- widgets */
// Small green arch from the logo, used above every section eyebrow. It "draws" itself left to
// right when scrolled into view, like the design's SVG stroke: Elementor's entrance animation
// (Advanced > Motion Effects) supplies the in-view trigger, the custom CSS swaps the fade for a wipe.
const arch = (m, w = 56, align = 'left') => widget('image', {
  image: m.arch, image_size: 'full', align, width: px(w), _element_width: 'initial', _element_custom_width: px(w), _title: 'Arch accent',
  _animation: 'fadeIn', _animation_mobile: 'fadeIn', _animation_tablet: 'fadeIn', _animation_delay: 150,
  custom_css: [
    'selector.animated { animation-name: none; }',
    'selector.animated img { animation: reccoArchDraw 1.1s cubic-bezier(.4, 0, .2, 1) both; }',
    '@keyframes reccoArchDraw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }',
  ].join('\n'),
});

const eyebrowText = (text, align = 'left', color = C.green) => widget('heading', {
  title: text, header_size: 'p', title_color: color, align,
  ...typo('typography', SANS, 12, 700, { lh: 1.3, ls: 2.16, transform: 'uppercase' }),
});

// Arch + eyebrow label
const eyebrow = (m, text, o = {}) => stack([arch(m, o.archW || 56, o.align || 'left'), eyebrowText(text, o.align || 'left')],
  { gap: 8, align: o.align === 'center' ? 'center' : 'flex-start' });

function heading(text, tag, sizes, color = C.navy, align = 'left', o = {}) {
  return widget('heading', {
    title: text, header_size: tag, title_color: color, align,
    ...typo('typography', o.family || SERIF, sizes, o.weight || 300, { lh: o.lh || 1.1, ls: o.ls ?? -0.4 }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    ...(o.settings || {}),
  });
}
const H2 = (text, color = C.navy, o = {}) => heading(text, 'h2', o.sizes || [46, 38, 32], color, o.align || 'left', o);
const H3 = (text, sizes, color = C.navy, o = {}) => heading(text, 'h3', sizes, color, o.align || 'left', { family: SANS, weight: 600, lh: 1.2, ls: -0.2, ...o });

function text(html, o = {}) {
  const body = /^\s*</.test(html) ? html : `<p>${html}</p>`;
  return widget('text-editor', {
    editor: body, paragraph_spacing: px(o.pSpace ?? 0), align: o.align || 'left',
    text_color: o.color || C.slate, link_color: o.linkColor || C.navy, link_hover_color: C.green,
    ...typo('typography', o.family || SANS, o.size || 16, o.weight || 400, { lh: o.lh || 1.65, ls: o.ls }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    ...(o.settings || {}),
  });
}

// Pill buttons. variant: 'green' | 'ghostWhite' | 'outlineNavy' | 'navy'
function button(label, url, variant, o = {}) {
  const v = {
    green: { bg: C.green, fg: C.white, hbg: C.white, hfg: C.navy },
    ghostWhite: { bg: 'rgba(0,0,0,0)', fg: C.white, hbg: 'rgba(0,0,0,0)', hfg: C.white, border: 'rgba(255,255,255,0.45)', hborder: C.white },
    outlineNavy: { bg: 'rgba(0,0,0,0)', fg: C.navy, hbg: C.navy, hfg: C.white, border: C.navy, hborder: C.navy },
    navy: { bg: C.navy, fg: C.white, hbg: C.green, hfg: C.white },
  }[variant];
  return widget('button', {
    text: label, link: link(url), align: o.align || '',
    ...typo('typography', SANS, o.size || 15, 600, { lh: 1.2 }),
    border_radius: box(999), text_padding: o.pad || box(15, 26, 15, 26),
    button_text_color: v.fg, background_background: 'classic', background_color: v.bg,
    hover_color: v.hfg, button_background_hover_background: 'classic', button_background_hover_color: v.hbg,
    ...(v.border ? { border_border: 'solid', border_width: box(1.5), border_color: v.border, button_hover_border_color: v.hborder } : {}),
    ...(o.arrow ? { selected_icon: fa('fas fa-arrow-right'), icon_align: 'row-reverse', icon_indent: px(10) } : {}),
    ...(o.settings || {}),
  });
}

function image(media, o = {}) {
  return widget('image', {
    image: media, image_size: 'full', align: o.align || 'left',
    ...(o.width !== undefined ? resp('width', Array.isArray(o.width) ? o.width : [o.width], (v) => (typeof v === 'object' ? v : px(v))) : {}),
    ...(o.height ? { ...resp('height', Array.isArray(o.height) ? o.height : [o.height], (v) => px(v)), object_fit: o.fit || 'cover', 'object-fit': o.fit || 'cover', object_position: 'center center' } : {}),
    ...(o.radius ? { image_border_radius: box(o.radius) } : {}),
    ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
    ...(o.settings || {}),
  });
}

// Icon List (used for the footer links and the "Updated daily" line)
function iconList(items, o = {}) {
  return widget('icon-list', {
    view: o.inline ? 'inline' : 'traditional',
    icon_list: items.map((it) => {
      const [t, u] = Array.isArray(it) ? it : [it];
      return { _id: id(), text: t, selected_icon: o.icon ? fa(o.icon) : { value: '', library: '' }, ...(u ? { link: link(u) } : {}) };
    }),
    space_between: px(o.space ?? 10), icon_size: px(o.iconSize ?? 0), text_indent: px(o.indent ?? (o.icon ? 10 : 0)),
    icon_color: o.iconColor || C.green, text_color: o.color || C.slate, text_color_hover: o.hover || C.green,
    ...typo('icon_typography', SANS, o.size || 14, o.weight || 500, { lh: 1.4 }),
    ...(o.settings || {}),
  });
}

/* ---------------------------------------------------------------- header */
function header(m, menuId) {
  return [container({
    content_width: 'boxed', boxed_width: px(1216), flex_direction: 'row', flex_wrap: 'nowrap',
    flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(36), flex_gap_tablet: gap(20), flex_gap_mobile: gap(12),
    min_height: px(84), min_height_mobile: px(70), padding: box(14, 32, 14, 32), padding_mobile: box(10, 20, 10, 20),
    background_background: 'classic', background_color: 'rgba(255,255,255,0.92)',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.lineSoft,
    sticky: 'top', sticky_on: ['desktop', 'tablet', 'mobile'], z_index: 50,
    custom_css: 'selector { -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }',
    _title: 'Header',
  }, [
    image(m.logo, { width: [119, 119, 96], link: '/', settings: { _element_width: 'initial', _element_custom_width: px(119), _element_custom_width_mobile: px(96), _flex_size: 'none', _title: 'Logo' } }),
    widget('nav-menu', {
      menu: menuId, layout: 'horizontal', align_items: 'end', pointer: 'none',
      dropdown: 'tablet', toggle: 'burger', toggle_align: 'right', full_width: 'stretch',
      ...typo('menu_typography', SANS, 14, 600, { lh: 1.4, ls: 0.28 }),
      color_menu_item: C.navy, color_menu_item_hover: C.green, color_menu_item_active: C.navy,
      padding_horizontal_menu_item: px(0), padding_vertical_menu_item: px(6), menu_space_between: px(32),
      ...typo('dropdown_typography', SANS, 16, 600),
      color_dropdown_item: C.navy, background_color_dropdown_item: C.white,
      color_dropdown_item_hover: C.white, background_color_dropdown_item_hover: C.navy,
      color_dropdown_item_active: C.white, background_color_dropdown_item_active: C.navy,
      padding_horizontal_dropdown_item: px(32), padding_horizontal_dropdown_item_mobile: px(20), padding_vertical_dropdown_item: px(16),
      dropdown_top_distance: px(21), dropdown_top_distance_mobile: px(17),
      dropdown_border_border: 'solid', dropdown_border_width: box(1, 0, 1, 0), dropdown_border_color: C.lineSoft,
      toggle_color: C.navy, toggle_color_hover: C.green, toggle_background_color: 'rgba(0,0,0,0)', toggle_size: px(26),
      _flex_size: 'grow', _flex_size_tablet: 'none', _flex_size_mobile: 'none',
      _flex_order_tablet: 'end', _flex_order_mobile: 'end', _title: 'Main menu',
      custom_css: '@media (min-width: 1025px) and (max-width: 1240px) { selector { --e-nav-menu-horizontal-menu-item-margin: 20px; } selector .elementor-nav-menu--main .elementor-item { font-size: 13px; } }',
    }),
    button('Contact us', A.contact, 'outlineNavy', {
      size: 14, pad: box(11, 22, 11, 22),
      settings: { text_padding_mobile: box(9, 16, 9, 16), typography_font_size_mobile: px(13), _flex_size: 'none', _flex_size_tablet: 'grow', _flex_size_mobile: 'grow', align_tablet: 'right', align_mobile: 'right' },
    }),
  ], false)];
}

/* ---------------------------------------------------------------- footer */
function footer(m) {
  const rowBox = (children, extra = {}) => container({
    content_width: 'full', flex_direction: 'row', flex_direction_mobile: 'column', flex_wrap: 'wrap',
    flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(24), flex_gap_mobile: gap(18), padding: box(0),
    ...extra,
  }, children);
  return [container({
    content_width: 'boxed', boxed_width: px(1216), flex_direction: 'column', flex_gap: gap(32), flex_gap_mobile: gap(28),
    padding: box(48, 32, 40, 32), padding_mobile: box(40, 20, 36, 20),
    background_background: 'classic', background_color: C.white,
    border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.lineSoft, _title: 'Footer',
  }, [
    rowBox([
      image(m.logo, { width: 100, link: '/', settings: { _element_width: 'initial', _element_custom_width: px(100), _flex_size: 'none', _title: 'Logo' } }),
      iconList(NAV, {
        inline: true, space: 26, size: 13.5, weight: 500, color: C.slate,
        settings: { space_between_mobile: px(20), icon_align_mobile: 'center', _element_width: 'auto', _title: 'Footer links' },
      }),
    ], { _title: 'Footer top' }),
    rowBox([
      container({
        content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto, flex_direction: 'row', flex_wrap: 'nowrap',
        flex_align_items: 'center', flex_gap: gap(14), padding: box(0), _title: 'ERP badge',
      }, [
        image(m.erpBadge, { width: 56, link: '/#sustainability', settings: { _element_width: 'initial', _element_custom_width: px(56), _flex_size: 'none' } }),
        text('Emissions Reduction Program, Level 1 · Action 2026. Validated by RyeStrategy.', {
          color: C.gray, size: 12, lh: 1.5, settings: { _element_width: 'initial', _element_custom_width: px(280), _element_custom_width_mobile: px(220) },
        }),
      ]),
      container({
        content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto, flex_direction: 'row', flex_wrap: 'wrap',
        flex_justify_content: 'flex-end', flex_justify_content_mobile: 'center', flex_align_items: 'center', flex_gap: gap(20, 8), padding: box(0), _title: 'Legal links',
      }, [
        iconList([['Privacy policy', U.privacy], ['Terms of use', U.terms]], {
          inline: true, space: 20, size: 12.5, weight: 400, color: C.gray, hover: C.green, settings: { _element_width: 'auto', icon_align_mobile: 'center' },
        }),
        text('© 2026 Recco Consulting. All rights reserved.', { color: C.gray, size: 12.5, lh: 1.5, settings: { _element_width: 'auto', align_mobile: 'center' } }),
      ]),
    ], { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.lineSoft, padding: box(24, 0, 0, 0), _title: 'Footer bottom' }),
  ], false)];
}

// Page Settings > Custom CSS: anchor jumps clear the sticky header.
const pageSettings = {
  custom_css: [
    '/* Keep section anchors clear of the sticky header. */',
    'selector [id] { scroll-margin-top: 90px; }',
    '/* Even line breaks on headings, as in the design. */',
    'selector h1.elementor-heading-title { text-wrap: balance; }',
    'selector h2.elementor-heading-title, selector h3.elementor-heading-title, selector .elementor-widget-text-editor p { text-wrap: pretty; }',
  ].join('\n'),
};

module.exports = {
  C, SERIF, SANS, EMAIL, A, U, NAV, id, px, box, gap, auto, link, resp, typo, fa, container, widget,
  band, overlayColor, overlayGradient, stack, row, grid, arch, eyebrowText, eyebrow, heading, H2, H3, text, button, image, iconList,
  header, footer, pageSettings,
};
