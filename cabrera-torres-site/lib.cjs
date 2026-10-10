// Shared building blocks for the Cabrera Torres Law Elementor build.
// Everything here produces native Elementor containers + widgets (no HTML widgets),
// so every text, link, image and color stays editable in the Elementor panel.
const crypto = require('crypto');

const C = {
  black: '#0B0B0B', pure: '#000000', panel: '#161411', cream: '#F6F1E8', white: '#FFFFFF',
  gold: '#C9A24A', goldLight: '#E2C27A', goldDark: '#8A6E2E', goldDeep: '#B8873A',
  sand: '#D9CFBC', paper: '#E8E1D3', body: '#3A352E', ink2: '#2A2520', slate: '#4A443C', fine: '#6B645A', foot: '#B5AC9C',
  goldLine: 'rgba(201,162,74,0.25)', rule: 'rgba(11,11,11,0.12)',
};
const FONT = 'Jost';
const PHONE = '678.490.0000', TEL = 'tel:+16784900000', EMAIL = 'a_torres978@yahoo.com';
const ADDRESS = '1770 Indian Trail Lilburn Rd NW<br>Norcross, GA 30093';

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

// Typography. sizes = number or [desktop, tablet, mobile]; ls in em (converted to px from the font size).
function typo(prefix, sizes, weight, extra = {}) {
  const arr = Array.isArray(sizes) ? sizes : [sizes];
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: FONT, [`${prefix}_font_weight`]: String(weight) };
  Object.assign(s, resp(`${prefix}_font_size`, arr, (v) => px(v)));
  if (extra.lh) s[`${prefix}_line_height`] = px(extra.lh, 'em');
  if (extra.ls !== undefined) s[`${prefix}_letter_spacing`] = px(+(extra.ls * arr[0]).toFixed(2));
  if (extra.transform) s[`${prefix}_text_transform`] = extra.transform;
  if (extra.style) s[`${prefix}_font_style`] = extra.style;
  return s;
}

const container = (settings, elements = [], isInner = true) => ({ id: id(), elType: 'container', isInner, settings, elements });
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });

/* ---------------------------------------------------------------- layout */
// Full-width page section: background on the outer box, content boxed at 1216px (1280 with 32px gutters).
function band(bg, children, o = {}) {
  const [pt, pb] = o.pad || [110, 120];
  return container({
    content_width: 'boxed', boxed_width: px(o.width || 1216), flex_direction: 'column',
    flex_gap: gap(o.gap ?? 0), flex_align_items: o.align || 'stretch',
    padding: box(pt, 32, pb, 32),
    padding_tablet: box(Math.round(pt * 0.8), 32, Math.round(pb * 0.8), 32),
    padding_mobile: box(Math.round(pt * 0.65), 20, Math.round(pb * 0.65), 20),
    background_background: 'classic', background_color: bg,
    ...(o.pattern ? patternOverlay(o.pattern) : {}),
    overflow: 'hidden',
    ...(o.anchor ? { _element_id: o.anchor } : {}),
    ...(o.settings || {}),
  }, children, false);
}

// The faint gold art-deco pattern behind dark sections (5% opacity, 1400px tiles).
const patternOverlay = (media) => ({
  background_overlay_background: 'classic', background_overlay_image: media,
  background_overlay_position: 'center center', background_overlay_repeat: 'repeat',
  background_overlay_size: 'initial', background_overlay_bg_width: px(1400), background_overlay_opacity: px(0.05),
});

const stack = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(o.gap ?? 18),
  ...(o.align ? { flex_align_items: o.align } : {}),
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.maxW ? { width: px(o.maxW), width_tablet: px(100, '%'), width_mobile: px(100, '%') } : {}),
  ...(o.settings || {}),
}, children);

const row = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', padding: box(0),
  flex_gap: gap(o.gap ?? 16, o.rowGap ?? o.gap ?? 16), flex_align_items: o.align || 'center',
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.settings || {}),
}, children);

// CSS grid. cols = [desktop, tablet, mobile] (numbers = equal fr columns, strings = custom templates)
function grid(children, o = {}) {
  const [d, t, m] = o.cols || [3, 1, 1];
  const col = (v) => (typeof v === 'number' ? px(v, 'fr') : { unit: 'custom', size: v });
  return container({
    container_type: 'grid', content_width: 'full', padding: box(0),
    grid_columns_grid: col(d), grid_columns_grid_tablet: col(t), grid_columns_grid_mobile: col(m),
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
    grid_auto_flow: 'row',
    grid_gaps: gap(o.gap ?? 24, o.rowGap ?? o.gap ?? 24),
    grid_gaps_mobile: gap(Math.min(o.gap ?? 24, 32), Math.min(o.rowGap ?? o.gap ?? 24, 32)),
    grid_align_items: o.align || 'stretch',
    ...(o.settings || {}),
  }, children);
}

/* --------------------------------------------------------------- widgets */
// Small uppercase gold label above headings
const eyebrow = (text, color = C.goldDark, align = 'left', o = {}) => widget('heading', {
  title: text, header_size: o.tag || 'p', title_color: color, align, ...(o.alignM ? { align_mobile: o.alignM } : {}),
  ...typo('typography', o.size || 13, o.weight || 500, { lh: 1.4, ls: o.ls ?? 0.3, transform: 'uppercase' }),
  ...(o.settings || {}),
});

function heading(text, tag, sizes, color, align = 'left', o = {}) {
  return widget('heading', {
    title: text, header_size: tag, title_color: color, align, ...(o.alignM ? { align_mobile: o.alignM } : {}),
    ...typo('typography', sizes, o.weight || 700, { lh: o.lh || 1.12, ls: o.ls ?? -0.01, style: o.style }),
    ...(o.link ? { link: link(o.link) } : {}),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    ...(o.settings || {}),
  });
}
// Section title with the light-weight gold second phrase from the design
const accent = (t, color) => `<span style="font-weight:200;color:${color}">${t}</span>`;
const H2 = (bold, light, dark, align = 'center', o = {}) => heading(
  `${bold}${o.br ? '<br>' : ' '}${accent(light, dark ? C.goldLight : C.goldDark)}`, 'h2', o.sizes || [58, 44, 36], dark ? C.cream : C.black, align, o,
);
const H3 = (text, color, sizes, o = {}) => heading(text, 'h3', sizes, color, o.align || 'left', { lh: o.lh || 1.2, ls: 0, ...o });

function text(html, o = {}) {
  const body = /^\s*</.test(html) ? html : `<p>${html}</p>`;
  return widget('text-editor', {
    editor: body, paragraph_spacing: px(o.pSpace ?? 0), align: o.align || 'left', ...(o.alignM ? { align_mobile: o.alignM } : {}),
    text_color: o.color || C.body, link_color: o.linkColor || C.goldLight, link_hover_color: o.linkHover || C.goldLight,
    ...typo('typography', o.size || 16, o.weight || 300, { lh: o.lh || 1.6, ls: o.ls, transform: o.transform, style: o.style }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    ...(o.settings || {}),
  });
}

// Buttons. variant: 'gold' (gradient fill) | 'outline' (gold hairline) | 'underline' (text link with gold rule)
const GOLD_GRADIENT = 'linear-gradient(135deg,#B8873A,#E2C27A 55%,#B8873A)';
function button(label, url, variant = 'gold', o = {}) {
  const base = {
    text: label, link: link(url), align: o.align || '', ...(o.alignM ? { align_mobile: o.alignM } : {}),
    ...typo('typography', 12, variant === 'gold' ? 600 : 500, { lh: 1.2, ls: o.ls ?? 0.16, transform: 'uppercase' }),
    border_radius: box(0), text_padding: o.pad || box(16, 30, 16, 30),
  };
  if (variant === 'gold') Object.assign(base, {
    button_text_color: C.black, hover_color: C.black,
    background_background: 'gradient', background_color: C.goldDeep, background_color_b: C.goldLight, background_gradient_angle: { unit: 'deg', size: 135, sizes: [] },
    button_background_hover_background: 'gradient', button_background_hover_color: C.goldDeep, button_background_hover_color_b: C.goldLight,
    custom_css: `selector .elementor-button { background: ${GOLD_GRADIENT}; transition: filter .2s; }\nselector .elementor-button:hover { filter: brightness(1.08); }`,
  });
  if (variant === 'outline') Object.assign(base, {
    button_text_color: C.cream, hover_color: C.goldLight,
    background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)',
    border_border: 'solid', border_width: box(1), border_color: 'rgba(201,162,74,0.6)', button_hover_border_color: C.goldLight,
    text_padding: o.pad || box(15, 28, 15, 28),
  });
  if (variant === 'underline') Object.assign(base, {
    ...typo('typography', 12, 500, { lh: 1.2, ls: 0.18, transform: 'uppercase' }),
    button_text_color: C.black, hover_color: C.goldDark,
    background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.gold, text_padding: box(0, 0, 6, 0),
  });
  return widget('button', { ...base, ...(o.settings || {}) });
}

function image(media, o = {}) {
  return widget('image', {
    image: media, image_size: 'full', align: o.align || 'center',
    ...(o.width !== undefined ? resp('width', Array.isArray(o.width) ? o.width : [o.width], (v) => (typeof v === 'object' ? v : px(v))) : {}),
    ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
    ...(o.settings || {}),
  });
}

const fa = (value) => ({ value, library: value.startsWith('far') ? 'fa-regular' : 'fa-solid' });

// Icon List. items: [text] or [[text, url]]
function iconList(items, o = {}) {
  return widget('icon-list', {
    view: o.inline ? 'inline' : 'traditional',
    icon_list: items.map((it) => {
      const [t, u] = Array.isArray(it) ? it : [it];
      return { _id: id(), text: t, selected_icon: o.icon ? fa(o.icon) : { value: '', library: '' }, ...(u ? { link: link(u) } : {}) };
    }),
    space_between: px(o.space ?? 8), icon_size: px(o.iconSize ?? 0), text_indent: px(o.indent ?? (o.icon ? 10 : 0)),
    icon_color: o.iconColor || C.gold, text_color: o.color || C.sand, text_color_hover: o.hover || o.color || C.sand,
    ...typo('icon_typography', o.size || 14, o.weight || 300, { lh: o.lh || 1.5, ls: o.ls, transform: o.transform }),
    ...(o.settings || {}),
  });
}

// Frosted dark card used in About and Testimonials
const glassCSS = `selector { backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); transition: border-color .2s; }
selector:hover { border-color: ${C.gold}; }`;
const glass = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(o.gap ?? 0), padding: o.pad || box(36, 32, 36, 32), padding_mobile: box(30, 24, 30, 24),
  background_background: 'classic', background_color: 'rgba(22,20,17,0.72)',
  border_border: 'solid', border_width: box(1), border_color: 'rgba(201,162,74,0.15)',
  custom_css: glassCSS, ...(o.settings || {}),
}, children);

/* ---------------------------------------------------------------- header */
function header(m, menuId) {
  const topText = (t, color, o = {}) => text(t, { color, size: 13, weight: 500, ls: o.ls ?? 0.14, transform: 'uppercase', lh: 1.4, ...o });
  const topbar = container({
    content_width: 'boxed', boxed_width: px(1216), flex_direction: 'row', flex_wrap: 'wrap',
    flex_justify_content: 'space-between', flex_justify_content_mobile: 'center', flex_align_items: 'center', flex_gap: gap(16, 4),
    padding: box(10, 32, 10, 32), padding_mobile: box(8, 16, 8, 16),
    background_background: 'classic', background_color: C.pure,
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.goldLine,
  }, [
    topText('Se habla español · Free consultation · No fee unless we win', C.cream, { size: 13, settings: { typography_font_size_mobile: px(11), align_mobile: 'center' } }),
    row([
      topText('Norcross, GA', C.sand, { settings: { hide_mobile: 'hidden-mobile' } }),
      topText(`<a href="${TEL}">${PHONE}</a>`, C.goldLight, { ls: 0.18, linkColor: C.goldLight, linkHover: C.cream, settings: { typography_font_size_mobile: px(12) } }),
    ], { gap: 20, settings: { width: auto, width_mobile: auto, _flex_size: 'none' } }),
  ], false);

  const nav = container({
    content_width: 'boxed', boxed_width: px(1216), flex_direction: 'row', flex_wrap: 'nowrap',
    flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(24), flex_gap_mobile: gap(12),
    padding: box(14, 32, 14, 32), padding_mobile: box(12, 16, 12, 16),
    background_background: 'classic', background_color: 'rgba(11,11,11,0.92)',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: 'rgba(255,255,255,0.06)',
    sticky: 'top', sticky_on: ['desktop', 'tablet', 'mobile'], z_index: 50,
    custom_css: 'selector { backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }',
  }, [
    image(m.logo, { width: [250, 220, 180], link: '/', align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(250), _element_custom_width_tablet: px(220), _element_custom_width_mobile: px(180), _flex_size: 'none' } }),
    widget('nav-menu', {
      menu: menuId, layout: 'horizontal', align_items: 'center', pointer: 'none',
      dropdown: 'tablet', toggle: 'burger', toggle_align: 'right', full_width: 'stretch',
      ...typo('menu_typography', 12, 400, { lh: 1.4, ls: 0.16, transform: 'uppercase' }),
      color_menu_item: C.cream, color_menu_item_hover: C.goldLight, color_menu_item_active: C.cream,
      padding_horizontal_menu_item: px(14), padding_vertical_menu_item: px(8),
      ...typo('dropdown_typography', 14, 500, { ls: 0.14, transform: 'uppercase' }),
      color_dropdown_item: C.cream, background_color_dropdown_item: C.black,
      color_dropdown_item_hover: C.black, background_color_dropdown_item_hover: C.goldLight,
      color_dropdown_item_active: C.goldLight, background_color_dropdown_item_active: C.black,
      padding_horizontal_dropdown_item: px(24), padding_vertical_dropdown_item: px(16),
      dropdown_top_distance: px(15),
      toggle_color: C.goldLight, toggle_background_color: 'rgba(0,0,0,0)', toggle_size: px(26),
      _flex_size: 'grow', _flex_size_tablet: 'none', _flex_size_mobile: 'none',
      _flex_order_tablet: 'end', _flex_order_mobile: 'end',
      custom_css: 'selector .elementor-nav-menu--main .elementor-item { white-space: nowrap; }',
    }),
    button('Free Case Evaluation', '/#contact', 'gold', {
      pad: box(12, 22, 12, 22), ls: 0.14,
      settings: { _flex_size: 'none', _flex_size_tablet: 'grow', hide_mobile: 'hidden-mobile', align_tablet: 'right' },
    }),
  ], false);
  return [topbar, nav];
}

/* ---------------------------------------------------------------- footer */
function footer(m) {
  const label = (t) => eyebrow(t, C.gold, 'left', { size: 12, ls: 0.24 });
  const links = (items) => iconList(items, { color: C.sand, hover: C.goldLight, size: 14, weight: 300, space: 8 });
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0),
    background_background: 'classic', background_color: C.pure,
    border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.goldLine,
  }, [
    container({
      container_type: 'grid', content_width: 'boxed', boxed_width: px(1216),
      grid_columns_grid: { unit: 'custom', size: '1.3fr 1fr 1fr 1fr' }, grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
      grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
      grid_gaps: gap(40), grid_gaps_mobile: gap(36), grid_align_items: 'start',
      padding: box(70, 32, 40, 32), padding_mobile: box(56, 20, 32, 20),
    }, [
      stack([
        image(m.logo, { width: 260, link: '/', align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(260) } }),
        eyebrow('Advocate. Protect. Deliver.', C.gold, 'left', { size: 12, weight: 400, ls: 0.22 }),
        text('Más que una firma. Un propósito.', { color: C.sand, size: 18, weight: 200, style: 'italic', lh: 1.4 }),
      ], { gap: 12 }),
      stack([
        label('Norcross office'),
        text(`<p>${ADDRESS}<br><a href="${TEL}">${PHONE}</a></p>`, { color: C.sand, size: 14, lh: 1.7, linkColor: C.goldLight, linkHover: C.cream }),
      ], { gap: 14 }),
      stack([
        label('Practice areas'),
        links([['Motor Vehicle Accidents', '/#practice'], ['Dog Bites', '/#practice'], ['Slip & Fall', '/#practice'], ['Wrongful Death', '/#practice']]),
      ], { gap: 14 }),
      stack([
        label('Firm'),
        links([['About', '/#about'], ['Results', '/#results'], ['Client testimonials', '/#testimonials'], ['FAQ', '/#faq'], ['Resources', '/#blog']]),
      ], { gap: 14 }),
    ]),
    container({
      content_width: 'boxed', boxed_width: px(1216), flex_direction: 'row', flex_direction_mobile: 'column',
      flex_justify_content: 'space-between', flex_align_items: 'center', flex_align_items_mobile: 'flex-start', flex_wrap: 'wrap', flex_gap: gap(16, 10),
      padding: box(0, 32, 36, 32), padding_mobile: box(0, 20, 28, 20),
      custom_css: 'selector > .e-con-inner { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 22px; }',
    }, [
      text('© 2026 Cabrera Torres Law. All rights reserved.', { color: C.foot, size: 13, settings: { _element_width: 'auto' } }),
      iconList([['Privacy Policy', '#'], ['Disclaimer', '#']], { inline: true, color: C.foot, hover: C.goldLight, size: 13, space: 22, settings: { _element_width: 'auto' } }),
    ]),
  ], false)];
}

// Page Settings: dark canvas, hidden WP title, smooth anchor scrolling past the sticky nav, shared keyframes.
const pageSettings = {
  hide_title: 'yes', template: 'elementor_header_footer',
  background_background: 'classic', background_color: C.black,
  custom_css: `/* Let Elementor's Boxed Width control win over any older site CSS. */
selector .e-con.e-con-boxed > .e-con-inner { max-width: var(--content-width); }
html { scroll-behavior: smooth; }
selector [id] { scroll-margin-top: 90px; }
@keyframes ct-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes ct-up { from { transform: translateY(0); } to { transform: translateY(-50%); } }
@keyframes ct-down { from { transform: translateY(-50%); } to { transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { selector .ct-anim .elementor-icon-list-items, selector .ct-anim .elementor-heading-title { animation: none !important; } }
`,
};

module.exports = {
  C, FONT, PHONE, TEL, EMAIL, ADDRESS, id, px, box, gap, auto, link, resp, typo, container, widget, fa,
  band, patternOverlay, stack, row, grid, eyebrow, heading, accent, H2, H3, text, button, image, iconList, glass,
  header, footer, pageSettings,
};
