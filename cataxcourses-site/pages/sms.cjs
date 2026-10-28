// Text Message Alerts (new page, /text-alerts/) – single-page SMS opt-in form for carrier (10DLC / toll-free)
// registration of the business texting number (conversational use case: no marketing wording). No separate design: inner-page hero + a white form card. The form is
// Elementor Pro's Form widget (submissions saved in Elementor > Submissions and emailed to the site admin); the
// consent checkbox is unchecked and required, and its label is the full carrier disclosure.
const L = require('../lib.cjs');
const { C, HEAD, BODY, URL, PHONE, px, box, gap, typo, container, widget, cls, band, stack, text, id } = L;
const { pageHero } = require('./faq.cjs');

const BRAND = 'California Tax Courses';
const DISCLOSURE = `By checking this box, I agree to receive text messages from ${BRAND} at the mobile number provided, `
  + 'including replies to my questions, course and enrollment support, and CTEC deadline reminders. '
  + 'Message frequency varies. Message and Data Rates May Apply. Reply STOP to opt out. Reply HELP for more information. '
  + `Consent is not a condition of purchase. `
  + `See our <a href="${URL.privacy}" target="_blank">Privacy Policy</a> and <a href="${URL.terms}" target="_blank">Terms &amp; Conditions</a>.`;

const field = (o) => ({ _id: id().slice(0, 7), width: '100', ...o });

function form() {
  return widget('form', {
    form_name: 'SMS Opt-In',
    form_fields: [
      field({ custom_id: 'first_name', field_type: 'text', field_label: 'First Name', placeholder: 'First name', required: 'true', width: '50' }),
      field({ custom_id: 'last_name', field_type: 'text', field_label: 'Last Name', placeholder: 'Last name', width: '50' }),
      field({ custom_id: 'phone', field_type: 'tel', field_label: 'Mobile Phone Number', placeholder: '(555) 555-5555', required: 'true' }),
      field({ custom_id: 'email', field_type: 'email', field_label: 'Email (optional)', placeholder: 'you@example.com' }),
      field({ custom_id: 'sms_consent', field_type: 'acceptance', field_label: 'Text Message Consent', acceptance_text: DISCLOSURE, checked_by_default: '', required: 'true' }),
    ],
    show_labels: 'yes', mark_required: 'yes', label_position: 'above', input_size: 'md', column_gap: px(16), row_gap: px(18),
    button_text: 'Sign Up For Text Alerts', button_size: 'md', button_width: '100',
    submit_actions: ['save-to-database', 'email'],
    email_subject: `New SMS opt-in – ${BRAND}`, email_content: '[all-fields]', email_from_name: BRAND,
    success_message: `Thanks! You're subscribed to text messages from ${BRAND}. Reply STOP at any time to opt out.`,
    error_message: 'Something went wrong. Please try again or call us at (888) 229-1994.',
    required_field_message: 'This field is required.',
    label_color: C.navy, ...typo('label_typography', BODY, 16, 700, { lh: 1.4 }),
    field_text_color: C.navy, field_background_color: C.white, field_border_color: C.line, field_border_width: box(1), field_border_radius: box(10),
    ...typo('field_typography', BODY, 17, 400, { lh: 1.5 }),
    button_background_color: C.gold, button_hover_background_color: C.goldHover, button_text_color: C.white, button_hover_color: C.white,
    button_border_radius: box(12), button_text_padding: box(16, 28, 16, 28), ...typo('button_typography', HEAD, [21, 20, 19], 700, { lh: 1.2, ls: 0 }),
    message_color: C.navy, ...wc('ctc-sms-form'),
  });
}
const wc = (c) => ({ _css_classes: c });

module.exports = {
  slug: 'text-alerts', title: 'Text Message Alerts', kind: 'newpage',
  build: () => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    pageHero('Text Alerts', `Course support and reminders from ${BRAND}.`, 'Text Message Alerts'),
    band(C.sand, [
      container({
        content_width: 'full', width: px(760), width_tablet: px(100, '%'), width_mobile: px(100, '%'), flex_gap: gap(18),
        padding: box(40, 40, 40, 40), padding_mobile: box(24, 20, 24, 20), background_background: 'classic', background_color: C.white,
        border_radius: box(16), border_border: 'solid', border_width: box(6, 0, 0, 0), border_color: C.gold,
      }, [
        widget('heading', { title: 'Sign up for text messages', header_size: 'h2', title_color: C.navy, ...typo('typography', HEAD, [34, 30, 26], 800, { lh: 1.15, ls: -0.01 }) }),
        text(`Text with ${BRAND}: get replies to your questions, help with your course and enrollment, and CTEC deadline reminders. Enter your mobile number and check the box below to give permission.`, { size: [18, 17, 16], lh: 1.6 }),
        form(),
        text(`<strong>${BRAND}</strong> text messages: Message frequency varies. Message and Data Rates May Apply. Reply <strong>STOP</strong> to opt out. Reply <strong>HELP</strong> for more information, or call <a href="${PHONE.tel}">${PHONE.label}</a>. Mobile numbers and SMS opt-in consent are never sold or shared with third parties or affiliates. <a href="${URL.privacy}">Privacy Policy</a> · <a href="${URL.terms}">Terms &amp; Conditions</a>.`,
          { size: 14, lh: 1.6, linkColor: C.goldText }),
      ]),
    ], { pad: [40, 88], align: 'center' }),
  ], false)],
};
