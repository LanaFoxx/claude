const L = require('../lib.cjs');
const { C, BODY, URL, id, px, box, gap, typo, container, widget, band, stack, grid, eyebrow, H2, H3, text, iconList, subHero, ctaBand } = L;

const detail = (label, valueHtml, color = C.ink, weight = 600) => stack([
  eyebrow(label, C.muted, 'left', { ls: 1.32 }),
  text(valueHtml, { size: 16, color, weight, lh: 1.5 }),
], { gap: 4 });

const fld = (custom_id, field_type, placeholder, width, extra = {}) => ({
  _id: id(), custom_id, field_type, field_label: placeholder, placeholder, width, width_tablet: width, width_mobile: extra.widthM || width, ...extra,
});

module.exports = {
  slug: 'contact-us', title: 'Contact Us',
  build: (m) => [
    subHero(m, 'Contact Us', 'Talk to a water manager.',
      'Placeholder: questions about plans, FlowSENSE, or getting your district set up. We reply within one business day.'),
    band(C.white, [grid([
      stack([
        eyebrow('Reach us'), H2('Colorado, USA'),
        stack([
          detail('Email', '<p><a href="mailto:info@myrecordflow.com">info@myrecordflow.com</a></p>'),
          detail('Phone', '(XXX) XXX-XXXX'),
          detail('Mail', '<p>Placeholder Street<br>City, CO 80XXX</p>', C.slate, 400),
          detail('Hours', 'Mon–Fri, 8am–5pm MT', C.slate, 400),
        ], { gap: 18 }),
        iconList([['YouTube', URL.youtube], ['X', URL.x], ['Facebook', URL.facebook], ['LinkedIn', URL.linkedin]],
          { inline: true, space: 14, color: C.blue, hover: C.blueHover, size: 13, weight: 600 }),
      ], { maxW: 520 }),
      container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(30), padding_mobile: box(24),
        background_background: 'classic', background_color: C.cream, border_radius: box(14) }, [
        H3('Send us a message', C.ink),
        widget('form', {
          form_name: 'Contact',
          form_fields: [
            fld('name', 'text', 'Name', '50', { widthM: '100', required: 'true' }), fld('organization', 'text', 'Organization', '50', { widthM: '100' }),
            fld('email', 'email', 'Email', '100', { required: 'true' }), fld('phone', 'tel', 'Phone (optional)', '100'),
            fld('topic', 'select', "I'm asking about…", '100', { field_options: "I'm asking about…|\nPlans & pricing\nFlowSENSE hardware\nSetting up a district\nSupport\nOther" }),
            fld('message', 'textarea', "Tell us about your system and what you're keeping track of today", '100', { rows: 4 }),
          ],
          show_labels: '', input_size: 'sm', button_text: 'Send message', button_width: '100', button_size: 'sm',
          submit_actions: ['email'], email_subject: 'New RecordFLOW contact form message',
          success_message: 'Thanks! A water manager will reply within one business day.',
          field_text_color: C.ink, field_background_color: C.white, field_border_color: C.borderDark, field_border_width: box(1), field_border_radius: box(6),
          ...typo('field_typography', BODY, 14, 400), column_gap: px(10), row_gap: px(10),
          button_background_color: C.blue, button_text_color: C.white, button_background_hover_color: C.blueHover, button_hover_color: C.white,
          button_border_radius: box(6), ...typo('button_typography', BODY, 15, 600), button_text_padding: box(15, 20, 15, 20),
        }),
      ]),
    ], { cols: [2, 1, 1], gap: 56, gapT: 48 })], { gap: 0 }),
    ctaBand(m),
  ],
};
