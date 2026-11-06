// Site-wide pieces: header + footer (Theme Builder), the full-screen menu and "Let's Connect"
// drawer (Elementor Pro popups), and the small behaviour layer (scroll-aware header, switchers,
// read-more, Google Translate) that ships as one HTML widget inside the header.
const fs = require('fs');
const path = require('path');
const K = require('./core.cjs');
const { C, SERIF, SANS, GUT, LINKS, CONSENT, px, cu, box, cbox, gap, link, typo, container, widget, cls, stack, row, grid, label, text, textLink, button, image, fa, social } = K;

// Elementor popup action URL (works on any link control)
const popupUrl = (id) => `#elementor-action%3Aaction%3Dpopup%3Aopen%26settings%3D${Buffer.from(JSON.stringify({ id: String(id), toggle: false })).toString('base64')}`;

const behaviour = () => fs.readFileSync(path.join(__dirname, 'site.html'), 'utf8');

/* ------------------------------------------------------------------ header */
function header(ctx) {
  const { m, popups } = ctx;
  const nav = (t, url) => textLink(t, url, { size: 16, weight: 500, ls: 0.6, upper: true, lh: 1, color: C.white, hover: C.bronze, cls: 'sb-navlink', settings: { hide_tablet: 'hidden-tablet', hide_mobile: 'hidden-mobile' } });
  return [container({
    content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_justify_content: 'space-between', flex_align_items: 'center',
    flex_gap: gap(24), padding: cbox('10px', GUT, '10px', GUT), min_height: px(116), min_height_mobile: px(84),
    ...cls('sb-header'),
  }, [
    widget('html', { html: behaviour(), ...cls('sb-behaviour') }),
    image(m('sb-logo-white'), { width: 'auto', link: '/', cls: 'sb-logo sb-logo-light', settings: { height: px(95), height_mobile: px(64), _flex_size: 'none' } }),
    image(m('sb-logo-color'), { width: 'auto', link: '/', cls: 'sb-logo sb-logo-dark', settings: { height: px(95), height_mobile: px(64), _flex_size: 'none' } }),
    row([
      nav("What We're Looking For", '/what-were-looking-for/'),
      nav('Home Search', LINKS.search),
      nav('Home Valuation', LINKS.valuation),
      nav('Guides', '/guides/'),
      nav("Let's Connect", popupUrl(popups.connect)),
      nav(LINKS.phone, LINKS.tel),
      textLink('English', '#', { size: 16, weight: 500, ls: 0.6, upper: false, lh: 1, color: C.white, hover: C.bronze, cls: 'sb-navlink sb-lang', icon: fa('fas fa-caret-down'), iconGap: 6, settings: { hide_tablet: 'hidden-tablet', hide_mobile: 'hidden-mobile' } }),
      widget('button', {
        text: '', link: link(popupUrl(popups.menu)), selected_icon: fa('fas fa-bars'), icon_indent: px(0),
        button_text_color: C.espresso, background_background: 'classic', background_color: C.white,
        hover_color: C.white, button_background_hover_background: 'classic', button_background_hover_color: C.bronze,
        border_radius: box(999), text_padding: box(0), ...typo('typography', SANS, 16, 400, { lh: 1 }),
        _margin: box(0, 0, 0, 6), ...cls('sb-burger'),
      }),
    ], { gap: 22, nowrap: true, justify: 'flex-end', settings: { _element_width: 'auto' } }),
  ], false)];
}

/* ------------------------------------------------------------------ footer */
function footer(ctx) {
  const { m, popups } = ctx;
  const small = (t, o = {}) => label(t, { size: 13, weight: 400, ls: 0.5, upper: true, ...o });
  const flink = (t, url, o = {}) => textLink(t, url, { size: 15, weight: 300, ls: 0.5, underline: true, cls: 'sb-ul', ...o });
  const linkRow = (title, items) => row([
    small(title, { settings: { _element_width: 'initial', _element_custom_width: px(190), _element_custom_width_mobile: px(100, '%') } }),
    ...items.map(([t, u], i) => flink(t, u, { upper: true, ls: 0.3, lh: 1, cls: `sb-ul sb-sep${i ? '' : ' sb-sep-first'}` })),
  ], { gap: 0, rowGap: 8, settings: { _margin: box(0) } });
  return [container({
    content_width: 'full', flex_direction: 'column', flex_gap: gap(0), padding: cbox('clamp(56px, 5vw, 96px)', GUT, '40px', GUT),
    background_background: 'classic', background_color: C.cream, ...cls('sb-footer'),
  }, [
    image(m('sb-exp-commercial-logo'), { width: 'auto', settings: { height: px(70) } }),
    row([
      row([
        stack([
          heading('Snow Bentley', 'p', 26, 400, 1, { mb: 40 }),
          small('Contact Details', { settings: { _margin: box(0, 0, 20, 0) } }),
          flink(LINKS.phone, LINKS.tel), flink(LINKS.email, LINKS.mailto),
        ], { settings: { _element_width: 'auto' } }),
        stack([
          small('Address', { settings: { _margin: box(0, 0, 20, 0) } }),
          text('2603 Camino Ramon<br>San Ramon, CA 94583', { size: 15, lh: 1.4, ls: 0.5 }),
        ], { settings: { _element_width: 'auto', padding: box(66, 0, 0, 0), padding_mobile: box(0) } }),
        widget('divider', { style: 'solid', weight: px(1), color: C.espresso, width: px(100, '%'), gap: px(0), ...cls('sb-vrule'), hide_mobile: 'hidden-mobile' }),
      ], { gap: 32, align: 'stretch', settings: { flex_gap: { unit: 'custom', size: 'clamp(32px, 9vw, 180px)', column: 'clamp(32px, 9vw, 180px)', row: '32px', isLinked: false }, _flex_size: 'grow' } }),
      social({ size: 15 }),
    ], { justify: 'space-between', align: 'flex-start', gap: 40, settings: { _margin: box(50, 0, 0, 0), padding: box(0, 0, 40, 0), border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.espresso } }),
    stack([
      linkRow('Navigation', [['Residential', '/residential/'], ['Home Search', LINKS.search], ['Home Valuation', LINKS.valuation], ['Neighborhoods', '/neighborhoods/'], ["Let's Connect", popupUrl(popups.connect)]]),
      linkRow('Useful Items', [["What We're Looking For?", '/what-were-looking-for/'], ['Done Deals', '/done-deals/'], ['Testimonials', '/testimonials/']]),
    ], { gap: 34, settings: { _margin: box(40, 0, 0, 0) } }),
    text('Snow Bentley | CA DRE# 01911217<br>eXp Commercial of California, Inc. | CA DRE# 02134436', { size: 13, lh: 1.5, ls: 0.5, settings: { _margin: box(50, 0, 0, 0) } }),
    text('All information is deemed reliable but not guaranteed and should be independently reviewed and verified.', { size: 13, lh: 1.5, ls: 0.5, settings: { _margin: box(24, 0, 0, 0) } }),
    image(m('sb-realtor-eho-logos'), { width: 'auto', settings: { height: px(46), _margin: box(24, 0, 0, 0) } }),
    row([
      label('Copyright © 2026', { size: 15, weight: 300, ls: 0.3, upper: true, settings: { _element_width: 'auto', _padding: box(0, 24, 0, 0) } }),
      flink('Privacy Policy', '/terms-and-conditions/', { upper: true, ls: 0.3, lh: 1, cls: 'sb-ul sb-sep sb-sep-24' }),
    ], { gap: 0, justify: 'flex-end', settings: { _margin: box(80, 0, 0, 0) } }),
    // Floating "Let's Connect" pill, fixed bottom-left on every page
    button("Let's Connect", popupUrl(popups.connect), 'dark', {
      pad: box(19, 24, 19, 24), icon: fa('fas fa-chevron-up'), iconGap: 10, cls: 'sb-float',
      settings: { _position: 'fixed', _offset_orientation_h: 'start', _offset_x: px(20), _offset_orientation_v: 'end', _offset_y_end: px(20), _z_index: 50, _element_width: 'auto' },
    }),
  ], false)];
}
function heading(t, tag, size, weight, lh, o = {}) {
  return K.heading(t, { tag, size, weight, lh, ls: 1, ...o });
}

/* ------------------------------------------------------------ menu popup */
function menuPopup(ctx) {
  const { popups } = ctx;
  const num = (n) => label(n, { family: SERIF, size: 11, weight: 400, ls: 0, color: C.bronze, upper: false, settings: { _element_width: 'initial', _element_custom_width: px(14), _margin: box(3, 0, 0, 0), _flex_size: 'none' } });
  const item = (n, t, url) => row([num(n), K.heading(t, { tag: 'p', size: 'clamp(24px, 1.6vw, 30px)', weight: 300, lh: 1, ls: 1, link: url, cls: 'sb-menu-item', settings: { _element_width: 'auto' } })], { gap: 10, nowrap: true, align: 'flex-start' });
  const sub = (items) => stack(items.map(([t, u]) => textLink(t, u, { size: 15, weight: 300, ls: 0.3, upper: true, lh: 1, underline: true, cls: 'sb-ul' })), { gap: 16, settings: { padding: box(4, 0, 0, 24) } });
  const col = (children) => stack(children, { gap: 32 });
  return [container({
    content_width: 'full', flex_direction: 'column', flex_gap: gap(0), min_height: cu('100vh'),
    padding: cbox('130px', 'clamp(24px, 11vw, 212px)', '80px', 'clamp(24px, 6vw, 113px)'), padding_mobile: box(90, 24, 60, 24),
  }, [
    grid([
      col([item('01', 'Home', '/'), item('02', 'About Snow', '/about/'), stack([item('03', 'Properties', ''), sub([['Residential', '/residential/'], ['Commercial', '/commercial/'], ['Done Deals', '/done-deals/'], ["What We're Looking For?", '/what-were-looking-for/']])], { gap: 16 })]),
      col([item('04', 'Home Search', LINKS.search), item('05', 'Home Valuation', LINKS.valuation), item('06', 'Neighborhoods', '/neighborhoods/')]),
      col([item('07', 'Testimonials', '/testimonials/'), item('08', 'Blog', '/blog/'), stack([item('09', 'Resources', ''), sub([["Buyer's Guide", '/buyers/'], ["Seller's Guide", '/sellers/'], ['Guides', '/guides/']])], { gap: 16 })]),
      col([item('10', "Let's Connect", '/contact/'), item('11', 'My Search Portal', LINKS.portal)]),
    ], { cols: [4, 2, 1], gap: 20, rowGap: 40, align: 'start' }),
    widget('divider', { weight: px(1), color: C.espresso, gap: px(0), width: px(100, '%'), _margin: cbox('clamp(80px, 22vh, 280px)', '0', '0', '0') }),
    grid([
      stack([
        label('Contact Details', { size: 12, weight: 400, ls: 0.5, upper: true, settings: { _margin: box(0, 0, 20, 0) } }),
        text('Snow Bentley | CA DRE# 01911217<br>eXp Commercial of California, Inc', { size: 15, lh: 1.4, ls: 0.5 }),
        textLink(LINKS.phone, LINKS.tel, { size: 15, underline: true, cls: 'sb-ul' }),
        textLink(LINKS.email, LINKS.mailto, { size: 15, underline: true, upper: true, cls: 'sb-ul' }),
      ]),
      stack([label('Address', { size: 12, weight: 400, ls: 0.5, upper: true, settings: { _margin: box(0, 0, 20, 0) } }), text('2603 Camino Ramon<br>San Ramon, CA 94583', { size: 15, lh: 1.4, ls: 0.5 })]),
      stack([label('Follow', { size: 12, weight: 400, ls: 0.5, upper: true, settings: { _margin: box(0, 0, 20, 0) } }), social({ gap: 6 })]),
      stack([label('Language', { size: 12, weight: 400, ls: 0.5, upper: true, settings: { _margin: box(0, 0, 20, 0) } }), textLink('English', '#', { size: 15, weight: 400, ls: 0.3, icon: fa('fas fa-caret-down'), iconGap: 6, cls: 'sb-lang' })]),
    ], { cols: [4, 2, 1], gap: 32, settings: { _margin: box(70, 0, 0, 0) } }),
  ], false)];
}
const menuPopupSettings = {
  width: px(80, 'vw'), width_mobile: px(100, 'vw'), height_type: 'fit_to_screen', content_position: 'top',
  horizontal_position: 'right', vertical_position: 'top', overlay: 'yes',
  overlay_background_background: 'classic', overlay_background_color: 'rgba(0,0,0,0.1)',
  entrance_animation: 'slideInRight', exit_animation: 'slideInRight', entrance_animation_duration: { unit: 'px', size: 0.45, sizes: [] },
  background_background: 'classic', background_color: C.cream,
  close_button: 'yes', close_button_position: 'inside', close_button_vertical: px(26), close_button_horizontal: px(40),
  close_button_color: C.white, close_button_background_color: C.espresso, close_button_hover_color: C.white, close_button_hover_background_color: C.bronze, icon_size: px(14),
  prevent_scroll: 'yes', classes: 'sb-menu-popup',
  custom_css: 'selector .dialog-widget-content { max-width: 1500px; }\nselector .dialog-close-button { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }\nselector .dialog-message { overflow-y: auto; }',
};

/* ------------------------------------------------------- connect drawer */
function formStyle(o = {}) {
  return {
    show_labels: '', input_size: 'md', mark_required: '', column_gap: px(0), row_gap: px(o.rowGap ?? 14),
    field_text_color: C.espresso, field_background_color: 'rgba(0,0,0,0)', field_border_color: o.border || C.espresso,
    field_border_width: box(1), field_border_radius: box(999),
    ...typo('field_typography', SANS, o.fieldSize ?? 15, 300, { lh: 1.5 }),
    html_color: C.muted, ...typo('html_typography', SANS, 11, 300, { lh: 1.5 }),
    button_background_color: C.espresso, button_text_color: C.white, button_background_hover_color: C.bronze, button_hover_color: C.white,
    button_border_radius: box(999), ...typo('button_typography', SANS, 12, 600, { lh: 1, ls: 0.5, upper: true }), button_text_padding: o.btnPad || box(22, 36, 22, 36),
    label_color: C.muted, ...typo('label_typography', SANS, 11, 300, { lh: 1.5 }),
    ...typo('message_typography', SERIF, 22, 400, { lh: 1.3 }), success_message_color: C.espresso,
  };
}
const field = (custom_id, field_type, placeholder, o = {}) => ({ _id: K.id(), custom_id, field_type, field_label: o.label || placeholder.replace('*', '').trim(), placeholder, required: o.required ? 'true' : '', width: o.width || '100', width_tablet: o.width || '100', width_mobile: '100', ...o.extra });
const consentField = () => field('consent', 'acceptance', '', { label: 'Consent', extra: { acceptance_text: CONSENT, checked_by_default: '' } });
const formActions = (subject) => ({ submit_actions: ['save-to-database', 'email'], email_subject: subject, email_content: '[all-fields]' });

function connectPopup() {
  return [container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(0), padding: box(40), padding_mobile: box(28, 24, 28, 24), min_height: cu('100vh') }, [
    label("Let's Connect", { size: 13, weight: 600, ls: 1, color: C.bronze, upper: true, settings: { _margin: box(12, 0, 36, 0) } }),
    K.heading('Leave a Message', { tag: 'h3', size: 36, weight: 300, lh: 1.1, mb: 28 }),
    widget('form', {
      form_name: "Let's Connect", ...formActions("New Let's Connect message - Snow Bentley Realty"),
      form_fields: [
        field('name', 'text', 'Full Name*', { required: true }),
        field('email', 'email', 'Email*', { required: true }),
        field('phone', 'tel', 'Phone*', { required: true }),
        field('interest', 'select', '', { label: 'Interested in', extra: { field_options: 'Interested in...|\nSelling & Buying\nSelling\nBuying\nRenting\nOther' } }),
        field('message', 'textarea', 'Message', { extra: { rows: 4 } }),
        consentField(),
      ],
      button_text: 'Submit', button_width: '100', success_message: 'Thank you for your message. I will be in touch with you shortly.',
      ...formStyle({ btnPad: box(22, 36, 22, 36) }), ...cls('sb-form'),
    }),
    container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(0), padding: box(32, 0, 0, 0), _margin: box(48, 0, 0, 0), border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.espresso }, [
      label('Contact Details', { size: 13, weight: 400, ls: 0.5, upper: true, settings: { _margin: box(0, 0, 14, 0) } }),
      text('Snow Bentley | CA DRE# 01911217', { size: 15, lh: 1.5, ls: 0, mb: 6 }),
      text(`<a href="${LINKS.tel}">${LINKS.phone}</a> · <a href="${LINKS.mailto}">${LINKS.email}</a>`, { size: 15, lh: 1.5, ls: 0, mb: 24, cls: 'sb-ul-links' }),
      label('Address', { size: 13, weight: 400, ls: 0.5, upper: true, settings: { _margin: box(0, 0, 14, 0) } }),
      text('2603 Camino Ramon<br>San Ramon, CA 94583', { size: 15, lh: 1.5, ls: 0 }),
    ], true),
  ], false)];
}
const connectPopupSettings = {
  width: px(460), width_mobile: px(100, 'vw'), height_type: 'fit_to_screen', content_position: 'top',
  horizontal_position: 'right', vertical_position: 'top', overlay: 'yes',
  overlay_background_background: 'classic', overlay_background_color: 'rgba(0,0,0,0.45)',
  entrance_animation: 'slideInRight', exit_animation: 'slideInRight', entrance_animation_duration: { unit: 'px', size: 0.35, sizes: [] },
  background_background: 'classic', background_color: C.cream, border_border: 'solid', border_width: box(0, 0, 0, 1), border_color: C.sand,
  close_button: 'yes', close_button_position: 'inside', close_button_vertical: px(40), close_button_horizontal: px(40),
  close_button_color: C.espresso, close_button_background_color: 'rgba(0,0,0,0)', close_button_hover_color: C.white, close_button_hover_background_color: C.espresso, icon_size: px(14),
  prevent_scroll: 'yes', classes: 'sb-connect-popup',
  custom_css: 'selector .dialog-close-button { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #3A2C26; display: flex; align-items: center; justify-content: center; }\nselector .dialog-message { overflow-y: auto; }',
};

module.exports = { popupUrl, header, footer, menuPopup, menuPopupSettings, connectPopup, connectPopupSettings, formStyle, field, consentField, formActions };
