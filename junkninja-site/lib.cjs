// Junk Ninja LLC – Elementor Pro build. Native containers + widgets so the client can edit
// every text, link, image and color in Elementor. Values come from the Claude Design handoff
// (Junk Ninja Home.dc.html + README).
const crypto = require('crypto');

const C = {
  navy: '#00264B', navyMid: '#0A3A6B', navyDeep: '#001B36',
  cyan: '#26CCDD', cyanLight: '#5FDCE8', cyanDark: '#0E8A99', cyanTint: '#F1FBFC', cyanTint2: '#E6F8FA',
  pink: '#F5398F', slate: '#3F556B', idle: '#566B80', eyebrow: '#0B7785', // idle + eyebrow darkened from #5E7388 / #0E8A99 for WCAG AA contrast
  surface: '#F1F5F8',
  border: '#D9E0E7', border2: '#D0D9E2', border3: '#E3E8EE', white: '#FFFFFF',
};
const HEAD = 'Russo One', BODY = 'Archivo';
const PHONE = '772-882-5955', TEL = 'tel:7728825955', SMS = 'sms:7728825955';
const EMAIL = 'junkninjallc@gmail.com';
const FACEBOOK = 'https://www.facebook.com/profile.php?id=61569525440522';
const TOWNS = ['Port Saint Lucie', 'Palm City', 'Jensen Beach', 'Stuart', 'Fort Pierce', 'Hobe Sound', 'Jupiter', 'Okeechobee'];

const id = () => crypto.randomBytes(4).toString('hex').slice(0, 7);
// number → px, string → custom CSS value (clamp(), auto, …)
const sz = (v, unit = 'px') => (typeof v === 'string' ? { unit: 'custom', size: v, sizes: [] } : { unit, size: v, sizes: [] });
const box = (t, r = t, b = t, l = r, unit = 'px') => {
  // Mixed numbers + CSS strings use the custom unit, so numbers need their own "px".
  const custom = [t, r, b, l].some((v) => typeof v === 'string');
  const v = (x) => (custom && typeof x === 'number' ? `${x}${unit}` : String(x));
  return { unit: custom ? 'custom' : unit, top: v(t), right: v(r), bottom: v(b), left: v(l), isLinked: false };
};
const gap = (c, r = c) => ({ unit: 'px', size: c, column: String(c), row: String(r), isLinked: c === r });
const link = (url) => ({ url, is_external: /^https?:/.test(url) ? 'on' : '', nofollow: '' });
const shadow = (x, y, color = C.cyan) => ({ horizontal: x, vertical: y, blur: 0, spread: 0, color });
const hide = { tablet: { hide_tablet: 'hidden-tablet', hide_mobile: 'hidden-mobile' }, desktop: { hide_desktop: 'hidden-desktop' } };

function typo(prefix, family, size, weight, o = {}) {
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: family, [`${prefix}_font_weight`]: String(weight), [`${prefix}_font_size`]: sz(size) };
  if (o.lh) s[`${prefix}_line_height`] = { unit: 'em', size: o.lh, sizes: [] };
  if (o.ls !== undefined) s[`${prefix}_letter_spacing`] = { unit: 'em', size: o.ls, sizes: [] };
  if (o.upper) s[`${prefix}_text_transform`] = 'uppercase';
  return s;
}

// Containers take "css_classes"; widgets take "_css_classes".
const container = (settings, elements = [], isInner = true) => {
  const s = { ...settings };
  if (s._css_classes) { s.css_classes = s._css_classes; delete s._css_classes; }
  return { id: id(), elType: 'container', isInner, settings: s, elements };
};
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });

/* ---------------------------------------------------------------- layout */
const SECTION_PAD = box('clamp(56px,8vw,104px)', 'clamp(20px,5vw,64px)', 'clamp(56px,8vw,104px)', 'clamp(20px,5vw,64px)');

// Full-width page section, content boxed at 1200px.
function band(bg, children, o = {}) {
  return container({
    content_width: 'boxed', boxed_width: sz(o.width || 1200), flex_direction: 'column', flex_gap: gap(o.gap ?? 32), html_tag: 'section',
    padding: o.pad || SECTION_PAD, background_background: 'classic', background_color: bg,
    ...(o.anchor ? { _element_id: o.anchor } : {}),
    ...(o.dark ? { _css_classes: 'jn-dark' } : {}),
    ...(o.settings || {}),
  }, children, false);
}
const stack = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(o.gap ?? 14),
  ...(o.align ? { flex_align_items: o.align } : {}), ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.maxW ? { width: sz(o.maxW), width_tablet: sz(100, '%'), width_mobile: sz(100, '%') } : {}),
  ...(o.settings || {}),
}, children);
const row = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', padding: box(0),
  flex_gap: gap(o.gap ?? 12, o.rowGap ?? o.gap ?? 12), flex_align_items: o.align || 'center',
  ...(o.justify ? { flex_justify_content: o.justify } : {}), ...(o.settings || {}),
}, children);
// CSS grid with a custom column template (auto-fit grids collapse without breakpoints).
const autoFit = (min) => `repeat(auto-fit,minmax(min(100%,${min}px),1fr))`;
function grid(children, cols, o = {}) {
  const c = (v) => ({ unit: 'custom', size: v });
  const [d, t = d, m = t] = Array.isArray(cols) ? cols : [cols];
  return container({
    container_type: 'grid', content_width: 'full', padding: box(0),
    grid_columns_grid: c(d), grid_columns_grid_tablet: c(t), grid_columns_grid_mobile: c(m),
    grid_rows_grid: c('auto'), grid_rows_grid_tablet: c('auto'), grid_rows_grid_mobile: c('auto'), grid_auto_flow: 'row',
    grid_gaps: o.gaps || gap(o.gap ?? 24, o.rowGap ?? o.gap ?? 24), grid_align_items: o.align || 'start',
    ...(o.settings || {}),
  }, children);
}
// Fixed-size circle (step numbers, ninja badges)
const circle = (size, bg, children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_align_items: 'center', padding: box(0),
  width: sz(size), width_tablet: sz(size), width_mobile: sz(size), min_height: sz(size), _flex_size: 'none', _flex_size_tablet: 'none', _flex_size_mobile: 'none', flex_gap: gap(0),
  background_background: 'classic', background_color: bg, border_radius: box(50, 50, 50, 50, '%'),
  ...(o.shadow ? { box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: o.shadow } : {}),
  ...(o.settings || {}),
}, children);

/* --------------------------------------------------------------- widgets */
function heading(title, tag, o = {}) {
  return widget('heading', {
    title, header_size: tag, title_color: o.color || C.navy, align: o.align || 'left',
    ...typo('typography', o.family || HEAD, o.size, o.weight || 400, { lh: o.lh, ls: o.ls, upper: o.upper }),
    ...(o.link ? { link: link(o.link) } : {}),
    ...(o.cls ? { _css_classes: o.cls } : {}),
    ...(o.settings || {}),
  });
}
// Russo One display heading with the hard cyan offset text shadow
const display = (title, tag, size, o = {}) => heading(title, tag, { size, lh: o.lh || 1.12, ls: o.ls ?? 0.06, upper: true, cls: `jn-shadow ${o.cls || ''}`.trim(), ...o });
const H2 = (title, o = {}) => display(title, 'h2', o.size || 'clamp(26px,3.8vw,44px)', { color: o.dark ? C.white : C.navy, ...o });
const eyebrow = (title, o = {}) => heading(title, 'p', { family: BODY, size: 14, weight: 800, ls: 0.2, upper: true, lh: 1.3, color: o.dark ? C.cyan : C.eyebrow, ...o });

function text(html, o = {}) {
  const body = /^\s*</.test(html) ? html : `<p>${html}</p>`;
  return widget('text-editor', {
    editor: body, paragraph_spacing: sz(0), align: o.align || 'left',
    text_color: o.color || C.navy, link_color: o.linkColor || o.color || C.navy, link_hover_color: C.cyanDark,
    ...typo('typography', BODY, o.size || 17, o.weight || 400, { lh: o.lh || 1.55 }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: sz(o.maxW), _element_custom_width_mobile: sz(100, '%') } : {}),
    ...(o.settings || {}),
  });
}

const BTN = {
  cyan: { bg: C.cyan, fg: C.navy, hover: C.cyanLight },
  white: { bg: C.white, fg: C.navy, hover: C.cyanTint2 },
  ghostDark: { bg: 'rgba(0,0,0,0)', fg: C.white, hover: 'rgba(255,255,255,.14)', border: C.white },
  navy: { bg: C.navy, fg: C.white, hover: C.navyMid, shadow: true },
  ghostLight: { bg: 'rgba(0,0,0,0)', fg: C.navy, hover: C.surface, border: C.navy },
  navyFlat: { bg: C.navy, fg: C.white, hover: C.navyMid },
};
// o.grow: flex basis in px (button stretches inside wrapping rows)
function button(label, url, variant, o = {}) {
  const v = BTN[variant];
  const padY = o.padY ?? 18, padX = o.padX ?? 26;
  const css = [];
  if (o.grow !== undefined) css.push(`selector { flex: 1 1 ${o.grow}px; } selector .elementor-button { width: 100%; }`);
  if (o.full) css.push('selector .elementor-button { width: 100%; }');
  if (o.nowrap) css.push('selector .elementor-button { white-space: nowrap; }');
  return widget('button', {
    text: label, link: link(url), align: o.align || (o.full ? 'justify' : ''),
    ...typo('typography', BODY, o.size || 17, 800, { lh: 1.2, ls: 0.03, upper: true }),
    button_text_color: v.fg, background_background: 'classic', background_color: v.bg,
    hover_color: v.fg, button_background_hover_background: 'classic', button_background_hover_color: v.hover,
    border_radius: box(o.radius ?? 6),
    text_padding: v.border ? box(padY - 2, padX, padY - 2, padX) : box(padY, padX, padY, padX),
    ...(v.border ? { border_border: 'solid', border_width: box(2), border_color: v.border, button_hover_border_color: v.border } : {}),
    ...(v.shadow && o.shadow !== false ? { button_box_shadow_box_shadow_type: 'yes', button_box_shadow_box_shadow: shadow(-4, 4) } : {}),
    ...(o.icon ? { selected_icon: o.icon, icon_align: 'row', icon_indent: sz(o.iconGap ?? 10) } : {}),
    ...(css.length ? { custom_css: css.join('\n') } : {}),
    ...(o.settings || {}),
  });
}
const fa = (value) => ({ value, library: value.startsWith('far') ? 'fa-regular' : 'fa-solid' });

function image(media, o = {}) {
  const css = [];
  if (o.ratio) css.push(`selector img { width: 100%; aspect-ratio: ${o.ratio}; object-fit: cover; display: block; }`);
  if (o.css) css.push(o.css);
  return widget('image', {
    image: media, image_size: o.size || 'full', align: o.align || 'center',
    ...(o.width !== undefined ? { width: sz(o.width, o.widthUnit || 'px') } : {}),
    ...(o.height !== undefined ? { height: sz(o.height) } : {}),
    ...(o.radius ? { image_border_radius: box(o.radius) } : {}),
    ...(o.shadow ? { image_box_shadow_box_shadow_type: 'yes', image_box_shadow_box_shadow: o.shadow } : {}),
    ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
    ...(o.elWidth ? { _element_width: 'initial', _element_custom_width: sz(o.elWidth, o.elWidthUnit || 'px') } : {}),
    ...(css.length ? { custom_css: css.join('\n') } : {}),
    ...(o.settings || {}),
  });
}

// Inline list with the small pink "+" mark
function plusList(items, o = {}) {
  return widget('icon-list', {
    view: o.inline ? 'inline' : 'traditional',
    icon_list: items.map((t) => ({ _id: id(), text: t, selected_icon: fa('fas fa-plus') })),
    space_between: sz(o.space ?? 22), icon_size: sz(o.iconSize ?? 13), text_indent: sz(o.indent ?? 8),
    icon_color: C.pink, text_color: o.color || C.white,
    ...typo('icon_typography', o.family || BODY, o.size || 15, o.weight || 600, { lh: 1.4, ls: o.ls, upper: o.upper }),
    ...(o.settings || {}),
  });
}

/* -------------------------------------------------------- site settings */
// Global CSS (Site Settings > Custom CSS). Shared classes keep per-widget CSS small.
const KIT_CSS = `/* Junk Ninja global styles */
html { scroll-behavior: smooth; }
[id] { scroll-margin-top: 100px; }
.jn-shadow .elementor-heading-title { text-shadow: -.07em .07em 0 ${C.cyan}; text-wrap: balance; }
.jn-shadow .elementor-heading-title .jn-cyan { color: ${C.cyan}; text-shadow: -.07em .07em 0 ${C.cyanDark}; }
.elementor-widget-text-editor p { margin: 0; text-wrap: pretty; }
@keyframes jnmarq { to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .jn-track { animation: none !important; } html { scroll-behavior: auto; } }
@media (max-width: 1180px) { body { padding-bottom: 64px; } }
`;
const KIT = {
  viewport_tablet: 1180, viewport_mobile: 760,
  container_width: sz(1200), container_padding: box(0), space_between_widgets: gap(0),
  body_background_background: 'classic', body_background_color: C.white,
  body_color: C.navy, link_normal_color: C.navy, link_hover_color: C.cyanDark,
  ...typo('body_typography', BODY, 17, 400, { lh: 1.55 }),
  system_colors: [
    { _id: 'primary', title: 'Navy', color: C.navy }, { _id: 'secondary', title: 'Cyan', color: C.cyan },
    { _id: 'text', title: 'Slate text', color: C.slate }, { _id: 'accent', title: 'Pink', color: C.pink },
  ],
  custom_colors: [
    ['jnnavymid', 'Navy mid', C.navyMid], ['jnnavydeep', 'Navy deep', C.navyDeep], ['jncyanlt', 'Cyan light', C.cyanLight],
    ['jncyandk', 'Cyan dark', C.cyanDark], ['jntint', 'Cyan tint', C.cyanTint], ['jnidle', 'Slate idle', C.idle],
    ['jnsurface', 'Surface', C.surface], ['jnborder', 'Border', C.border], ['jnwhite', 'White', C.white],
  ].map(([_id, title, color]) => ({ _id, title, color })),
  system_typography: [
    { _id: 'primary', title: 'Display', typography_typography: 'custom', typography_font_family: HEAD, typography_font_weight: '400' },
    { _id: 'secondary', title: 'Body bold', typography_typography: 'custom', typography_font_family: BODY, typography_font_weight: '800' },
    { _id: 'text', title: 'Body', typography_typography: 'custom', typography_font_family: BODY, typography_font_weight: '400' },
    { _id: 'accent', title: 'Button', typography_typography: 'custom', typography_font_family: BODY, typography_font_weight: '800' },
  ],
  custom_css: KIT_CSS,
};

/* ---------------------------------------------------------------- header */
const phoneIcon = fa('fas fa-phone-alt');
function header(m, menuId) {
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0),
    background_background: 'classic', background_color: 'rgba(255,255,255,.72)',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: 'rgba(0,38,75,.12)',
    sticky: 'top', sticky_on: ['desktop', 'tablet', 'mobile'], z_index: 20,
    custom_css: 'selector { -webkit-backdrop-filter: blur(16px) saturate(160%); backdrop-filter: blur(16px) saturate(160%); }',
  }, [container({
    content_width: 'boxed', boxed_width: sz(1240), flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'center',
    flex_gap: gap(26), flex_gap_tablet: gap(10), padding: box(12, 'clamp(16px,4vw,32px)', 12, 'clamp(16px,4vw,32px)'),
  }, [
    image(m.logo, { height: 68, width: 'auto', link: '/', align: 'left', settings: { _flex_size: 'none', _element_width: 'auto' } }),
    widget('nav-menu', {
      menu: String(menuId), layout: 'horizontal', align_items: 'end', pointer: 'none',
      dropdown: 'tablet', toggle: 'burger', toggle_align: 'right', full_width: 'stretch', submenu_icon: fa('fas fa-caret-down'),
      ...typo('menu_typography', BODY, 15, 600, { lh: 1.3, ls: 0.04, upper: true }),
      color_menu_item: C.navy, color_menu_item_hover: C.cyanDark, color_menu_item_active: C.navy,
      padding_horizontal_menu_item: sz(13), padding_vertical_menu_item: sz(8), menu_space_between: sz(0),
      ...typo('dropdown_typography', BODY, 15, 600, { lh: 1.3, ls: 0.04, upper: true }),
      color_dropdown_item: C.navy, background_color_dropdown_item: C.white,
      color_dropdown_item_hover: C.navy, background_color_dropdown_item_hover: C.surface,
      color_dropdown_item_active: C.navy, background_color_dropdown_item_active: C.white,
      padding_horizontal_dropdown_item: sz(22), padding_vertical_dropdown_item: sz(11),
      dropdown_box_shadow_box_shadow_type: 'yes', dropdown_box_shadow_box_shadow: { horizontal: 0, vertical: 8, blur: 28, spread: 0, color: 'rgba(0,38,75,.18)' },
      dropdown_top_distance: sz(10), dropdown_top_distance_tablet: sz(11),
      toggle_color: C.navy, toggle_color_hover: C.navy, toggle_background_color: 'rgba(0,0,0,0)', toggle_size: sz(22),
      toggle_border_width: sz(2), toggle_border_radius: sz(6),
      _flex_size: 'grow', _flex_size_tablet: 'none', _flex_order_tablet: 'end',
      custom_css: `/* Desktop: dropdown panel min width, quote item only in mobile menu */
selector .elementor-nav-menu--main .sub-menu { min-width: 270px !important; padding: 10px 0; }
selector .elementor-nav-menu--main .jn-menu-quote { display: none; }
/* Hamburger: 46x46 outlined box */
selector .elementor-menu-toggle { width: 46px; height: 46px; box-sizing: border-box; border: 2px solid ${C.navy}; border-radius: 6px; padding: 0; justify-content: center; }
/* Mobile menu panel */
selector .elementor-nav-menu__container.elementor-nav-menu--dropdown { box-shadow: 0 12px 24px rgba(0,38,75,.15); border-bottom: 1px solid ${C.border3}; }
selector .elementor-nav-menu__container.elementor-nav-menu--dropdown a { padding: 15px 20px !important; font-weight: 700; border-top: 1px solid ${C.border3}; }
selector .elementor-nav-menu__container.elementor-nav-menu--dropdown .sub-menu a { padding-left: 36px !important; }
selector .elementor-nav-menu__container.elementor-nav-menu--dropdown .jn-menu-quote > a { background: ${C.navy} !important; color: #fff !important; }`,
    }),
    button('Get a Free Quote', '/#quote', 'navyFlat', { size: 15, padY: 12, padX: 18, settings: { ...hide.tablet, _flex_size: 'none', typography_letter_spacing: sz(0.04, 'em') } }),
    button(PHONE, TEL, 'ghostLight', {
      size: 18, padY: 4, padX: 0, icon: phoneIcon, iconGap: 8,
      settings: {
        ...hide.tablet, _flex_size: 'none', border_border: 'none', typography_letter_spacing: sz(0, 'em'), typography_text_transform: 'none',
        button_background_hover_color: 'rgba(0,0,0,0)', hover_color: C.cyanDark,
        custom_css: `selector .elementor-button-icon svg { fill: ${C.cyan}; width: 18px; height: 18px; }`,
      },
    }),
    button(`Call ${PHONE}`, TEL, 'cyan', {
      size: 15, padY: 0, padX: 0, icon: phoneIcon, iconGap: 0,
      settings: {
        ...hide.desktop, _flex_size: 'none', _title: 'Mobile call button',
        custom_css: `selector { margin-left: auto !important; }
selector .elementor-button { width: 46px; height: 46px; padding: 0; display: flex; align-items: center; justify-content: center; }
selector .elementor-button-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
selector .elementor-button-icon { margin: 0; } selector .elementor-button-icon svg { width: 22px; height: 22px; fill: ${C.navy}; }`,
      },
    }),
  ])], false)];
}

/* ---------------------------------------------------------------- footer */
function footer(m) {
  const fLink = (label, url, o = {}) => heading(label, 'p', { family: BODY, size: o.size || 17, weight: o.weight || 400, lh: 1.4, color: C.white, link: url,
    settings: { _element_width: 'auto', custom_css: `selector a:hover { color: ${C.cyan} !important; }` } });
  const barBtn = (label, url, v) => button(label, url, v, { size: 14, padY: 0, padX: 8, radius: 0, settings: {
    _flex_size: 'grow', align: 'justify', custom_css: 'selector, selector .elementor-widget-container, selector .elementor-button-wrapper, selector .elementor-button { height: 100%; } selector .elementor-button { display: flex; align-items: center; justify-content: center; letter-spacing: .04em; }',
  } });
  return [
    container({
      content_width: 'boxed', boxed_width: sz(1200), flex_direction: 'row', flex_wrap: 'wrap',
      flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(40, 24),
      padding: box('clamp(32px,5vw,48px)', 'clamp(20px,5vw,64px)', 'clamp(32px,5vw,48px)', 'clamp(20px,5vw,64px)'),
      background_background: 'classic', background_color: C.navyDeep,
    }, [
      image(m.logoWhite, { height: 84, width: 'auto', link: '/', align: 'left', settings: { _element_width: 'auto' } }),
      stack([
        row([
          fLink(PHONE, TEL, { size: 22, weight: 800 }),
          fLink(EMAIL, `mailto:${EMAIL}`),
          heading('Open 6am–9pm, 7 days a week', 'p', { family: BODY, size: 17, lh: 1.4, color: C.white, settings: { _element_width: 'auto' } }),
          fLink('Facebook', FACEBOOK),
        ], { gap: 32, rowGap: 10, justify: 'flex-end' }),
        heading('© Junk Ninja LLC · Licensed and Insured', 'p', { family: BODY, size: 14, lh: 1.4, color: C.white, align: 'right' }),
      ], { gap: 14, align: 'flex-end', settings: { width: sz('auto'), width_tablet: sz('auto'), width_mobile: sz(100, '%') } }),
    ], false),
    // Sticky action bar (tablet + mobile)
    container({
      content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', padding: box(0), flex_gap: gap(0), flex_align_items: 'stretch',
      min_height: sz(64), ...hide.desktop, _title: 'Mobile action bar',
      custom_css: 'selector { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; height: 64px; box-shadow: 0 -4px 16px rgba(0,38,75,.25); }',
    }, [barBtn('Call', TEL, 'cyan'), barBtn('Text Photos', SMS, 'white'), barBtn('Free Quote', '/#quote', 'navyFlat')], false),
  ];
}

module.exports = {
  C, HEAD, BODY, PHONE, TEL, SMS, EMAIL, TOWNS, id, sz, box, gap, link, shadow, hide, typo, container, widget, fa,
  band, stack, row, grid, autoFit, circle, heading, display, H2, eyebrow, text, button, image, plusList, KIT, header, footer,
};
