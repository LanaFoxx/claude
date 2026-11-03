// Design tokens + low-level Elementor JSON helpers for the Snow Bentley build.
// Everything produces native Elementor containers/widgets so the client can edit copy, links,
// images and colors in the Elementor panel.
const crypto = require('crypto');

const C = {
  espresso: '#3A2C26', bronze: '#937C5C', cream: '#F5EFE7', sand: '#EDE5DA', stone: '#EEEDE9', white: '#FFFFFF',
  hair: '#E3DACE', muted: '#6B5B50', gray: '#8C7F76', rule: '#C9BFB4', orGray: '#9A8E86',
};
const SERIF = 'Cormorant Garamond', SANS = 'Jost';

// Fluid values from the design (exact at 1920px, scale down on smaller desktops).
const GUT = 'clamp(20px, 3.3vw, 62px)';
const SEC = 'clamp(56px, 5vw, 96px)';

const LINKS = {
  phone: '415-823-8595', tel: 'tel:4158238595', email: 'snow@snowbentley.com', mailto: 'mailto:snow@snowbentley.com',
  valuation: 'https://snowbentley.realscout.com/homesearch/home-reports?hva_public=true',
  facebook: 'https://www.facebook.com/p/Snow-Bentley-61575852646089/', instagram: 'https://www.instagram.com/snowlibentley/?hl=en',
  linkedin: 'https://www.linkedin.com/in/snow-bentley', google: 'https://maps.app.goo.gl/bK8Nzc5w69ZdCsiJ9',
  review: 'https://www.google.com/maps/place//data=!4m3!3m2!1s0x8c1df049d2be74b1:0x378b4f58eef62d80!12e1?source=g.page.m.kd._&laa=lu-desktop-review-solicitation',
  search: '/home-search/listings/', portal: '/home-search/listings/',
};
const CONSENT = "I agree to be contacted by Snow Bentley via call, email, and text for real estate services. To opt out, you can reply 'stop' at any time or reply 'help' for assistance. You can also click the unsubscribe link in the emails. Message and data rates may apply. Message frequency may vary. <a href=\"/terms-and-conditions/\">Privacy Policy</a>.";

function id() { return crypto.randomBytes(4).toString('hex').slice(0, 7); }
const px = (size, unit = 'px') => ({ unit, size, sizes: [] });
const cu = (css) => ({ unit: 'custom', size: css, sizes: [] }); // custom CSS value (clamp(), calc() ...)
const box = (t, r = t, b = t, l = r, unit = 'px') => ({ unit, top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: false });
const cbox = (t, r = t, b = t, l = r) => box(t, r, b, l, 'custom');
const gap = (n, r = n) => ({ unit: 'px', size: n, column: String(n), row: String(r), isLinked: n === r });
const link = (url, ext) => ({ url: url || '', is_external: (ext ?? /^https?:/.test(url || '')) ? 'on' : '', nofollow: '' });

// Typography. size: number (px) | string (custom CSS) | [desktop, tablet, mobile]
function typo(prefix, family, size, weight, o = {}) {
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: family, [`${prefix}_font_weight`]: String(weight) };
  const val = (v) => (typeof v === 'string' ? cu(v) : px(v));
  if (Array.isArray(size)) {
    const [d, t, m] = size;
    if (d !== undefined) s[`${prefix}_font_size`] = val(d);
    if (t !== undefined) s[`${prefix}_font_size_tablet`] = val(t);
    if (m !== undefined) s[`${prefix}_font_size_mobile`] = val(m);
  } else if (size !== undefined) s[`${prefix}_font_size`] = val(size);
  if (o.lh !== undefined) s[`${prefix}_line_height`] = typeof o.lh === 'string' ? cu(o.lh) : px(o.lh, 'em');
  if (o.ls !== undefined) s[`${prefix}_letter_spacing`] = px(o.ls);
  if (o.upper) s[`${prefix}_text_transform`] = 'uppercase';
  if (o.style) s[`${prefix}_font_style`] = o.style;
  if (o.decoration) s[`${prefix}_text_decoration`] = o.decoration;
  return s;
}

// Containers name their Advanced controls differently from widgets (css_classes, margin, position, z_index, width);
// helpers below speak "widget", so translate here.
const CON_KEYS = { _css_classes: 'css_classes', _margin: 'margin', _margin_tablet: 'margin_tablet', _margin_mobile: 'margin_mobile', _padding: 'padding', _position: 'position', _z_index: 'z_index', _element_custom_width: 'width', _element_custom_width_tablet: 'width_tablet', _element_custom_width_mobile: 'width_mobile' };
function conSettings(settings) {
  const out = {};
  // Containers default to the kit's 20px widget gap; this build always sets gaps explicitly.
  if (settings.container_type !== 'grid' && !settings.flex_gap) out.flex_gap = { unit: 'px', size: 0, column: '0', row: '0', isLinked: true };
  if (settings._element_width === 'auto') {
    const a = { unit: 'custom', size: 'auto', sizes: [] };
    Object.assign(out, { width: a, width_tablet: a, width_mobile: a, _flex_size: 'none' });
  }
  for (const [k, v] of Object.entries(settings)) {
    if (k === '_element_width') continue;
    if (CON_KEYS[k]) {
      const nk = CON_KEYS[k];
      if (nk === 'css_classes' && out.css_classes) out.css_classes += ' ' + v; else if (!(nk in settings)) out[nk] = v; else out[nk] = out[nk] ?? v;
    } else if (k === 'css_classes' && out.css_classes) out.css_classes = v + ' ' + out.css_classes;
    else out[k] = v;
  }
  return out;
}
const container = (settings, elements = [], isInner = true) => ({ id: id(), elType: 'container', isInner, settings: conSettings(settings), elements });
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });
const cls = (...c) => ({ _css_classes: c.filter(Boolean).join(' ') });

/* ------------------------------------------------------------------ layout */
// Full-width section with the design's fluid gutters and section padding.
function section(children, o = {}) {
  const s = {
    content_width: 'full', flex_direction: o.dir || 'column', flex_gap: gap(o.gap ?? 0),
    padding: o.pad || cbox(SEC, GUT, SEC, GUT),
    ...(o.bg ? { background_background: 'classic', background_color: o.bg } : {}),
    ...(o.align ? { flex_align_items: o.align } : {}),
    ...(o.justify ? { flex_justify_content: o.justify } : {}),
    ...(o.minH ? { min_height: typeof o.minH === 'string' ? cu(o.minH) : px(o.minH) } : {}),
    ...(o.image ? {
      background_background: 'classic', background_image: o.image, background_position: 'center center', background_size: 'cover', background_repeat: 'no-repeat',
      ...(o.bg ? { background_color: o.bg } : {}),
      background_overlay_background: 'classic', background_overlay_color: o.overlay || 'rgba(0,0,0,0.3)',
    } : {}),
    ...(o.anchor ? { _element_id: o.anchor } : {}),
    ...(o.cls ? cls(o.cls) : {}),
    ...(o.overflow ? { overflow: o.overflow } : {}),
    ...(o.settings || {}),
  };
  return container(s, children, false);
}

// Flex column / row without padding
const stack = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(o.gap ?? 0),
  ...(o.align ? { flex_align_items: o.align } : {}), ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.width ? { width: typeof o.width === 'string' ? cu(o.width) : px(o.width), width_tablet: px(100, '%'), width_mobile: px(100, '%') } : {}),
  ...(o.maxW ? { _element_width: 'initial', custom_css: `selector { max-width: ${o.maxW}px; width: 100%; }` } : {}),
  ...(o.cls ? cls(o.cls) : {}),
  ...(o.settings || {}),
}, children);
const row = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: o.nowrap ? 'nowrap' : 'wrap', padding: box(0),
  flex_gap: gap(o.gap ?? 20, o.rowGap ?? o.gap ?? 20), flex_align_items: o.align || 'center',
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.cls ? cls(o.cls) : {}),
  ...(o.settings || {}),
}, children);

// CSS grid. cols = [desktop, tablet, mobile] as number of equal columns or a template string.
function grid(children, o = {}) {
  const [d, t, m] = o.cols || [3, 2, 1];
  const col = (v) => (typeof v === 'number' ? px(v, 'fr') : { unit: 'custom', size: v });
  return container({
    container_type: 'grid', content_width: 'full', padding: box(0),
    grid_columns_grid: col(d), grid_columns_grid_tablet: col(t), grid_columns_grid_mobile: col(m),
    grid_rows_grid: { unit: 'custom', size: o.rows || 'auto' }, grid_rows_grid_tablet: { unit: 'custom', size: 'auto' }, grid_rows_grid_mobile: { unit: 'custom', size: 'auto' },
    grid_auto_flow: 'row', grid_gaps: gap(o.gap ?? 15, o.rowGap ?? o.gap ?? 15),
    grid_align_items: o.align || 'stretch',
    ...(o.cls ? cls(o.cls) : {}),
    ...(o.settings || {}),
  }, children);
}

/* ------------------------------------------------------------------ widgets */
function heading(text, o = {}) {
  return widget('heading', {
    title: text, header_size: o.tag || 'h2', title_color: o.color || C.espresso, align: o.align || 'left',
    ...typo('typography', o.family || SERIF, o.size ?? 'clamp(34px, 2.5vw, 48px)', o.weight ?? 300, { lh: o.lh ?? 1.1, ls: o.ls ?? 2, upper: o.upper ?? true }),
    ...(o.link ? { link: link(o.link) } : {}),
    ...(o.mb !== undefined ? { _margin: box(0, 0, o.mb, 0) } : {}),
    ...(o.cls ? cls(o.cls) : {}),
    ...(o.settings || {}),
  });
}
const H1 = (t, o = {}) => heading(t, { tag: 'h1', size: 'clamp(40px, 3.5vw, 66px)', lh: 1.05, ...o });
const H2 = (t, o = {}) => heading(t, { tag: 'h2', ...o });
const H3 = (t, o = {}) => heading(t, { tag: 'h3', size: o.size ?? 'clamp(26px, 1.9vw, 36px)', weight: 400, ...o });

// Small uppercase label (Jost)
const label = (t, o = {}) => heading(t, {
  tag: o.tag || 'p', family: SANS, size: o.size ?? 13, weight: o.weight ?? 600, lh: 1.2, ls: o.ls ?? 0.5,
  color: o.color || C.espresso, align: o.align || 'left', ...o,
});

function text(html, o = {}) {
  const body = /^\s*</.test(html) ? html : `<p>${html}</p>`;
  return widget('text-editor', {
    editor: body, align: o.align || 'left', text_color: o.color || C.espresso,
    ...typo('typography', o.family || SANS, o.size ?? 'clamp(15px, 0.95vw, 18px)', o.weight ?? 300, { lh: o.lh ?? 1.5, ls: o.ls ?? 0.3, upper: o.upper, style: o.style }),
    ...(o.pSpace !== undefined ? { paragraph_spacing: px(o.pSpace) } : {}),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%') } : {}),
    ...(o.mb !== undefined ? { _margin: box(0, 0, o.mb, 0) } : {}),
    ...(o.cls ? cls(o.cls) : {}),
    ...(o.settings || {}),
  });
}

// Pill button. variant: dark | outline | white | glass | link
function button(label, url, variant = 'dark', o = {}) {
  const s = {
    text: label, link: link(url, o.external), align: o.align || '',
    ...typo('typography', SANS, o.size ?? 12, 600, { lh: 1, ls: 0.5, upper: true }),
    border_radius: box(999), text_padding: o.pad || box(22, 32, 22, 32),
    ...(o.width ? { _element_width: 'initial', _element_custom_width: typeof o.width === 'string' ? cu(o.width) : px(o.width) } : {}),
    ...(o.icon ? { selected_icon: o.icon, icon_align: o.iconAlign || 'row-reverse', icon_indent: px(o.iconGap ?? 10) } : {}),
    ...(o.cls ? cls(o.cls) : {}),
  };
  const v = {
    dark: { bg: C.espresso, fg: C.white, hbg: '#2A1F1A', hfg: C.white },
    outline: { bg: 'rgba(0,0,0,0)', fg: C.espresso, hbg: C.espresso, hfg: C.white, border: C.espresso },
    white: { bg: C.white, fg: C.espresso, hbg: C.cream, hfg: C.espresso },
    glass: { bg: 'rgba(255,255,255,0.8)', fg: C.espresso, hbg: C.white, hfg: C.espresso },
    outlineWhite: { bg: 'rgba(0,0,0,0)', fg: C.white, hbg: C.white, hfg: C.espresso, border: C.white },
  }[variant];
  Object.assign(s, {
    button_text_color: v.fg, background_background: 'classic', background_color: v.bg,
    hover_color: v.hfg, button_background_hover_background: 'classic', button_background_hover_color: v.hbg,
    ...(v.border ? { border_border: 'solid', border_width: box(1), border_color: v.border } : {}),
  });
  return widget('button', { ...s, ...(o.settings || {}) });
}

// Plain text link that looks like body/label copy (button widget with no background)
function textLink(label, url, o = {}) {
  return widget('button', {
    text: label, link: link(url, o.external), align: o.align || '', size: 'xs',
    ...typo('typography', o.family || SANS, o.size ?? 15, o.weight ?? 300, { lh: o.lh ?? 1.4, ls: o.ls ?? 0.5, upper: o.upper, decoration: o.underline ? 'underline' : undefined }),
    button_text_color: o.color || C.espresso, hover_color: o.hover || C.bronze,
    background_background: 'classic', background_color: 'rgba(0,0,0,0)', button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)',
    border_radius: box(0), text_padding: o.pad || box(0),
    ...(o.icon ? { selected_icon: o.icon, icon_align: o.iconAlign || 'row-reverse', icon_indent: px(o.iconGap ?? 10) } : {}),
    ...(o.cls ? cls(o.cls) : {}),
    ...(o.settings || {}),
  });
}

function image(media, o = {}) {
  return widget('image', {
    image: media, image_size: 'full', align: o.align || 'left',
    ...(o.width !== undefined ? { width: typeof o.width === 'string' ? cu(o.width) : px(o.width) } : { width: px(100, '%') }),
    ...(o.height !== undefined ? { height: typeof o.height === 'string' ? cu(o.height) : px(o.height), object_fit: 'cover', object_position: o.objPos || 'center center' } : {}),
    ...(o.ratio ? { custom_css: `selector img { aspect-ratio: ${o.ratio}; object-fit: cover; width: 100%; height: auto; }` } : {}),
    ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
    ...(o.cls ? cls(o.cls) : {}),
    ...(o.settings || {}),
  });
}

// Inline SVG icon (Elementor's "Upload SVG" style is overkill; Font Awesome covers what we need)
const fa = (value) => ({ value, library: value.startsWith('fab') ? 'fa-brands' : value.startsWith('far') ? 'fa-regular' : 'fa-solid' });

// Eyebrow: bronze 100px rule + label (left) or label + rule below (centered)
function eyebrow(t, o = {}) {
  if (o.center) {
    return stack([
      label(t, { align: 'center', color: o.color || C.muted, weight: 600, ls: 1, size: 13 }),
      widget('divider', { width: px(o.ruleW || 100), align: 'center', color: o.rule || C.bronze, weight: px(1), gap: px(0), ...cls('sb-rule') }),
    ], { gap: 14, align: 'center', settings: { _margin: box(0, 0, o.mb ?? 18, 0) } });
  }
  return row([
    widget('divider', { width: px(100), color: o.rule || C.bronze, weight: px(1), gap: px(0), _element_width: 'initial', _element_custom_width: px(100), ...cls('sb-rule') }),
    label(t, { color: o.color || C.bronze, weight: 400, ls: 1.5, size: 13, settings: { _element_width: 'auto' } }),
  ], { gap: 16, nowrap: true, settings: { _margin: box(0, 0, o.mb ?? 12, 0) } });
}

// Social icon circles
function social(o = {}) {
  return widget('social-icons', {
    social_icon_list: [
      { _id: id(), social_icon: fa('fab fa-facebook-f'), link: link(LINKS.facebook) },
      { _id: id(), social_icon: fa('fab fa-instagram'), link: link(LINKS.instagram) },
      { _id: id(), social_icon: fa('fab fa-linkedin-in'), link: link(LINKS.linkedin) },
      { _id: id(), social_icon: fa('fab fa-google'), link: link(LINKS.google) },
    ],
    shape: 'circle', align: o.align || 'left', icon_color: 'custom', icon_primary_color: C.espresso, icon_secondary_color: C.white,
    icon_size: px(o.size ?? 15), icon_padding: px(o.pad ?? 0.82, 'em'), icon_spacing: px(o.gap ?? 8),
    hover_primary_color: C.bronze, hover_secondary_color: C.white,
    ...(o.settings || {}),
  });
}

module.exports = {
  C, SERIF, SANS, GUT, SEC, LINKS, CONSENT, id, px, cu, box, cbox, gap, link, typo, container, widget, cls,
  section, stack, row, grid, heading, H1, H2, H3, label, text, button, textLink, image, fa, eyebrow, social,
};
