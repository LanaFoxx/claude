// Builds native Elementor element trees (containers + core/Pro widgets) for the
// RecordFLOW "How-To Videos" design. No HTML widgets: every text, link, image and
// color is a regular Elementor control the client can edit.
const crypto = require('crypto');

const C = {
  blue: '#0B57D0', blueHover: '#083F99', ink: '#101828', slate: '#475467',
  cream: '#F3F0E8', eyebrowLight: '#9DB9EF', mist: '#CBD5E1', footer: '#0B1322',
  muted: '#98A2B3', field: '#101828', fieldBorder: '#2A3650', white: '#FFFFFF',
};
const HEAD = 'Saira', BODY = 'Figtree';

const id = () => crypto.randomBytes(4).toString('hex').slice(0, 7);
const px = (size, unit = 'px') => ({ unit, size, sizes: [] });
const box = (t, r, b, l, unit = 'px') => ({ unit, top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: false });
const gap = (n) => ({ unit: 'px', size: n, column: String(n), row: String(n), isLinked: true });

// Typography helper. sizes = [desktop, tablet, mobile]
function typo(prefix, family, sizes, weight, extra = {}) {
  const [d, t, m] = Array.isArray(sizes) ? sizes : [sizes];
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: family, [`${prefix}_font_size`]: px(d), [`${prefix}_font_weight`]: String(weight) };
  if (t) s[`${prefix}_font_size_tablet`] = px(t);
  if (m) s[`${prefix}_font_size_mobile`] = px(m);
  if (extra.lh) s[`${prefix}_line_height`] = px(extra.lh, 'em');
  if (extra.ls !== undefined) s[`${prefix}_letter_spacing`] = px(extra.ls);
  if (extra.transform) s[`${prefix}_text_transform`] = extra.transform;
  return s;
}

const container = (settings, elements = [], isInner = true) => ({ id: id(), elType: 'container', isInner, settings, elements });
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });

// Standard section: one boxed container (1200px incl. 28px gutters, 20px on phones) with its own background.
function band(settings, inner, innerSettings = {}) {
  return container({
    content_width: 'boxed', boxed_width: px(1144), flex_direction: 'column',
    ...settings, ...innerSettings,
  }, inner, false);
}

const eyebrow = (text, color = C.blue, align = 'left') => widget('heading', {
  title: text, header_size: 'p', title_color: color, align,
  ...typo('typography', BODY, 11, 700, { lh: 1.3, ls: 1.54, transform: 'uppercase' }),
});

const heading = (text, tag, sizes, color, align = 'left', extra = {}) => widget('heading', {
  title: text, header_size: tag, title_color: color, align,
  ...typo('typography', HEAD, sizes, 800, { lh: 1.06, ls: -0.4 }), ...extra,
});

const button = (text, url, extra = {}) => widget('button', {
  text, link: { url, is_external: '', nofollow: '' },
  ...typo('typography', BODY, 16, 600, { lh: 1.2 }),
  button_text_color: C.white, background_background: 'classic', background_color: C.blue,
  hover_color: C.white, button_background_hover_background: 'classic', button_background_hover_color: C.blueHover,
  border_radius: box(6, 6, 6, 6), text_padding: box(15, 24, 15, 24), ...extra,
});

// Faint brand-mark decoration, absolutely positioned inside its parent container.
const decoMark = (image, size, pos, opacity) => widget('image', {
  image, image_size: 'full', width: px(size), width_mobile: px(Math.round(size * 0.6)), opacity: px(opacity),
  _position: 'absolute', _element_width: 'initial', _element_custom_width: px(size), _element_custom_width_mobile: px(Math.round(size * 0.6)),
  _z_index: 0, _css_classes: 'rf-deco', custom_css: 'selector { pointer-events: none; }', ...pos,
});

/* ------------------------------------------------------------------ HEADER */
function header(m, menuId) {
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0, 0, 0, 0),
    background_background: 'classic', background_color: C.white,
    border_border: 'solid', border_width: box(0, 0, 3, 0), border_color: C.blue,
    sticky: 'top', sticky_on: ['desktop', 'tablet', 'mobile'], z_index: 20,
  }, [container({
    content_width: 'boxed', boxed_width: px(1144), flex_direction: 'row', flex_wrap: 'nowrap',
    flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(24), flex_gap_mobile: gap(12),
    padding: box(16, 28, 16, 28), padding_mobile: box(12, 20, 12, 20),
  }, [
    widget('image', {
      image: m.logoBlack, image_size: 'full', width: px(196), width_mobile: px(150),
      link_to: 'custom', link: { url: '/', is_external: '', nofollow: '' },
      _element_width: 'initial', _element_custom_width: px(196), _element_custom_width_mobile: px(150),
      _flex_size: 'none',
    }),
    widget('nav-menu', {
      menu: menuId, layout: 'horizontal', align_items: 'center', pointer: 'none',
      dropdown: 'tablet', toggle: 'burger', toggle_align: 'right', full_width: 'stretch',
      ...typo('menu_typography', BODY, 14, 500, { lh: 1.4 }),
      color_menu_item: C.ink, color_menu_item_hover: C.blue, color_menu_item_active: C.blue,
      padding_horizontal_menu_item: px(13), padding_vertical_menu_item: px(8),
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
      content_width: 'full', width: { unit: 'custom', size: 'auto' }, width_tablet: { unit: 'custom', size: 'auto' }, width_mobile: { unit: 'custom', size: 'auto' }, flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(18), flex_gap_mobile: gap(10),
      flex_justify_content: 'flex-end', _flex_size: 'none', padding: box(0, 0, 0, 0),
      _flex_size_tablet: 'grow', _flex_size_mobile: 'grow',
    }, [
      button('Log-in', 'https://app.myrecordflow.com', {
        ...typo('typography', BODY, 14, 600, { lh: 1.2 }),
        button_text_color: C.slate, background_color: 'rgba(0,0,0,0)', hover_color: C.blue,
        button_background_hover_color: 'rgba(0,0,0,0)', text_padding: box(11, 0, 11, 0),
        hide_mobile: 'hidden-mobile',
      }),
      button('Try Risk-Free', 'https://app.myrecordflow.com', {
        ...typo('typography', BODY, 14, 600, { lh: 1.2 }), text_padding: box(11, 18, 11, 18), text_padding_mobile: box(10, 14, 10, 14),
      }),
    ]),
  ])], false)];
}

/* -------------------------------------------------------------------- PAGE */
const VIDEOS = [
  'Create your account', 'Draw your first ditch on the map', 'Log a gauge reading offline',
  'Add photos and notes to a headgate', 'Build a dashboard for the board', 'Share access with ditch riders',
  'Install FlowSENSE at a flume', 'Export your records',
];

function videoCard(m, n, title) {
  return container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_gap: gap(6),
    min_height: px(206), min_height_tablet: px(200), min_height_mobile: px(190),
    padding: box(22, 22, 22, 22), overflow: 'hidden', position: '',
    html_tag: 'a', link: { url: 'https://www.youtube.com/@myrecordflow', is_external: 'on', nofollow: '' },
    background_background: 'classic', background_color: C.ink,
    background_overlay_background: 'gradient', background_overlay_color: 'rgba(16,24,40,0)', background_overlay_color_stop: px(40, '%'),
    background_overlay_color_b: 'rgba(16,24,40,0.85)', background_overlay_color_b_stop: px(100, '%'),
    background_overlay_gradient_type: 'linear', background_overlay_gradient_angle: px(180, 'deg'),
    border_radius: box(12, 12, 12, 12),
    css_classes: 'rf-video-card',
  }, [
    decoMark(m.iconWhite, 160, { _offset_orientation_h: 'end', _offset_x_end: px(-30), _offset_y: px(-30) }, 0.06),
    eyebrow(`Video ${String(n).padStart(2, '0')}`, C.eyebrowLight),
    widget('heading', {
      title, header_size: 'h3', title_color: C.white,
      ...typo('typography', HEAD, [20, 20, 19], 600, { lh: 1.2 }),
    }),
  ]);
}

function page(m) {
  const hero = band({
    background_background: 'classic', background_color: C.cream,
    background_image: m.dots, background_repeat: 'repeat', background_position: 'top left', background_size: 'auto',
    overflow: 'hidden',
  }, [
    decoMark(m.iconBlue, 480, { _offset_orientation_h: 'end', _offset_x_end: px(-120), _offset_orientation_v: 'end', _offset_y_end: px(-160) }, 0.06),
    eyebrow('How-To Videos', C.blue, 'center'),
    heading('Learn RecordFLOW in a few short videos.', 'h1', [58, 46, 38], C.ink, 'center', {
      _element_width: 'initial', _element_custom_width: px(760), _element_custom_width_tablet: px(100, '%'),
    }),
    widget('text-editor', {
      paragraph_spacing: px(0),
      editor: '<p>Placeholder: step-by-step walkthroughs from setting up your map to installing FlowSENSE. Also on <a href="https://www.youtube.com/@myrecordflow" target="_blank" rel="noopener">YouTube</a>.</p>',
      align: 'center', text_color: C.slate, link_color: C.blue, link_hover_color: C.blueHover,
      ...typo('typography', BODY, [18, 18, 17], 400, { lh: 1.55 }),
      _element_width: 'initial', _element_custom_width: px(600), _element_custom_width_tablet: px(100, '%'),
    }),
  ], {
    flex_align_items: 'center', flex_gap: gap(18),
    padding: box(80, 28, 72, 28), padding_tablet: box(72, 28, 64, 28), padding_mobile: box(56, 20, 52, 20),
  });

  const library = band({ background_background: 'classic', background_color: C.white }, [
    container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(0, 0, 0, 0),
      width: px(560), width_tablet: px(100, '%') }, [
      eyebrow('Video Library'),
      heading('Short walkthroughs, start to finish.', 'h2', [44, 36, 30], C.ink),
    ]),
    container({
      container_type: 'grid', content_width: 'full', padding: box(0, 0, 0, 0),
      grid_columns_grid: px(3, 'fr'), grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
      grid_rows_grid: px(3, 'fr'), grid_rows_grid_tablet: px(4, 'fr'), grid_rows_grid_mobile: px(8, 'fr'),
      grid_gaps: gap(28), grid_gaps_tablet: gap(22), grid_gaps_mobile: gap(18),
      grid_auto_flow: 'row',
    }, VIDEOS.map((t, i) => videoCard(m, i + 1, t))),
  ], {
    flex_gap: gap(40), flex_gap_mobile: gap(32),
    padding: box(96, 28, 96, 28), padding_tablet: box(80, 28, 80, 28), padding_mobile: box(64, 20, 64, 20),
  });

  const cta = band({ background_background: 'classic', background_color: C.ink, overflow: 'hidden' }, [
    decoMark(m.iconWhite, 420, { _offset_orientation_h: 'start', _offset_x: px(-60), _offset_orientation_v: 'end', _offset_y_end: px(-120) }, 0.04),
    eyebrow('Get Started Today', C.eyebrowLight, 'center'),
    heading('Ready to start your free trial?', 'h2', [44, 36, 30], C.white, 'center'),
    widget('text-editor', {
      paragraph_spacing: px(0),
      editor: '<p>Seven days, no card required, cancel anytime.</p>', align: 'center', text_color: C.mist,
      ...typo('typography', BODY, 17, 400, { lh: 1.6 }),
      _element_width: 'initial', _element_custom_width: px(520), _element_custom_width_tablet: px(100, '%'),
    }),
    button('Start Risk-Free 7-day Trial', 'https://app.myrecordflow.com', { align: 'center' }),
  ], {
    flex_align_items: 'center', flex_gap: gap(18),
    padding: box(80, 28, 80, 28), padding_tablet: box(72, 28, 72, 28), padding_mobile: box(60, 20, 60, 20),
  });

  return [hero, library, cta];
}

/* ------------------------------------------------------------------ FOOTER */
const linkList = (items, extra = {}) => widget('icon-list', {
  view: 'traditional',
  icon_list: items.map(([text, url]) => ({ _id: id(), text, selected_icon: { value: '', library: '' }, link: { url, is_external: /^https?:/.test(url) ? 'on' : '', nofollow: '' } })),
  space_between: px(10), icon_size: px(0), text_indent: px(0),
  text_color: C.mist, text_color_hover: C.white,
  ...typo('icon_typography', BODY, 14, 400, { lh: 1.4 }), ...extra,
});

function footer(m) {
  const col = (children) => container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(10), padding: box(0, 0, 0, 0) }, children);
  const fhead = (t) => eyebrow(t, C.eyebrowLight);
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0, 0, 0, 0), flex_gap: gap(0),
    background_background: 'classic', background_color: C.footer,
    border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: 'rgba(255,255,255,0.08)',
  }, [
    container({
      container_type: 'grid', content_width: 'boxed', boxed_width: px(1144),
      grid_columns_grid: px(4, 'fr'), grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
      grid_rows_grid: px(1, 'fr'), grid_rows_grid_tablet: px(2, 'fr'), grid_rows_grid_mobile: px(4, 'fr'),
      grid_gaps: gap(40), grid_gaps_mobile: gap(36),
      padding: box(56, 28, 28, 28), padding_mobile: box(48, 20, 24, 20),
    }, [
      container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(16), padding: box(0, 0, 0, 0) }, [
        widget('image', {
          image: m.logoWhite, image_size: 'full', width: px(182), align: 'left',
          link_to: 'custom', link: { url: '/', is_external: '', nofollow: '' },
          _element_width: 'initial', _element_custom_width: px(182),
        }),
        widget('text-editor', {
      paragraph_spacing: px(0),
          editor: '<p>Software and sensors for ditch and canal water delivery. American owned, based in Colorado, USA.</p>',
          text_color: C.mist, ...typo('typography', BODY, 14, 400, { lh: 1.6 }),
          _element_width: 'initial', _element_custom_width: px(300), _element_custom_width_tablet: px(100, '%'),
        }),
        linkList([
          ['YouTube', 'https://www.youtube.com/@myrecordflow'], ['X', 'https://x.com/myrecordflow'],
          ['Facebook', 'https://www.facebook.com/profile.php?id=61580314045608'], ['LinkedIn', 'https://www.linkedin.com/company/108422183'],
        ], { view: 'inline', space_between: px(14), text_color: C.white, text_color_hover: C.eyebrowLight, ...typo('icon_typography', BODY, 13, 600, { lh: 1.4 }) }),
      ]),
      col([fhead('Product'), linkList([
        ['Product Overview', '/product-overview/'], ['FlowSENSE', '/flowsense/'],
        ['How-To Videos', '/how-to-videos/'], ['Log-in', 'https://app.myrecordflow.com'],
      ])]),
      col([fhead('Company'), linkList([
        ['About Us', '/about-us/'], ['Contact Us', '/contact-us/'],
        ['Terms of Service', '/terms-of-service/'], ['Privacy Policy', '/privacy-policy/'],
      ])]),
      col([fhead('Newsletter'),
        widget('text-editor', {
      paragraph_spacing: px(0), editor: '<p>Water management notes, product updates, no spam.</p>', text_color: C.mist, ...typo('typography', BODY, 14, 400, { lh: 1.5 }) }),
        widget('form', {
          form_name: 'Newsletter',
          form_fields: [
            { _id: id(), custom_id: 'email', field_type: 'email', field_label: 'Email', placeholder: 'Email', required: 'true', width: '70', width_tablet: '70', width_mobile: '70' },
          ],
          show_labels: '', input_size: 'sm', button_text: 'Submit', button_size: 'sm', button_width: '30', button_width_tablet: '30', button_width_mobile: '30',
          submit_actions: ['email'], email_subject: 'New RecordFLOW newsletter sign-up',
          column_gap: px(8), row_gap: px(8),
          field_text_color: C.white, field_background_color: C.field, field_border_color: C.fieldBorder, field_border_width: box(1, 1, 1, 1), field_border_radius: box(6, 6, 6, 6),
          ...typo('field_typography', BODY, 14, 400),
          button_background_color: C.blue, button_text_color: C.white, button_background_hover_color: C.blueHover, button_hover_color: C.white,
          button_border_radius: box(6, 6, 6, 6), ...typo('button_typography', BODY, 14, 600),
          button_text_padding: box(10, 14, 10, 14),
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
      widget('text-editor', {
      paragraph_spacing: px(0), editor: '<p>© 2026 RecordFLOW. All Rights Reserved.</p>', text_color: C.muted, ...typo('typography', BODY, 12, 400, { lh: 1.5 }), _element_width: 'auto' }),
      container({ content_width: 'full', width: { unit: 'custom', size: 'auto' }, width_tablet: { unit: 'custom', size: 'auto' }, width_mobile: { unit: 'custom', size: 'auto' }, _flex_size: 'none', flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(8), padding: box(0, 0, 0, 0) }, [
        widget('image', { image: m.iconBlue, image_size: 'full', width: px(16), _element_width: 'initial', _element_custom_width: px(16) }),
        widget('text-editor', {
      paragraph_spacing: px(0), editor: '<p>Built by water managers, not tech insiders.</p>', text_color: C.muted, ...typo('typography', BODY, 12, 400, { lh: 1.5 }), _element_width: 'auto' }),
      ]),
    ]),
  ], false)];
}

// Page Settings > Advanced > Custom CSS. The site's older Additional CSS forces every boxed
// container to 1280px; this lets each container's own "Boxed Width" control work on this page.
const pageSettings = {
  custom_css: '/* Let Elementor\'s Boxed Width control work (older site CSS forces 1280px). */\nselector .e-con.e-con-boxed > .e-con-inner { max-width: var(--content-width); }\n',
};

module.exports = { header, page, footer, pageSettings };
