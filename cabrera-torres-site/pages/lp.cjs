// Meta (Facebook / Instagram) ad landing pages: one template, several variants whose headline and copy match the ad.
// Built on Elementor Canvas (no site header, menu or footer: nothing to click away to), noindex, mobile first.
// Brief: "The People's Champion" · hero + form above the fold · why us · meet Jennifer · how we help · reviews,
// credentials, FAQs · final CTA · sticky mobile CALL / FREE CASE REVIEW bar · dedicated thank-you page.
// Tracking (UTMs, Meta Pixel + Conversions API, GA4, Clio Grow) lives in perf/ct-lead-tracking.php.
// ALL CLAIMS AND DISCLOSURES ON THESE PAGES NEED ATTORNEY APPROVAL BEFORE ADS POINT AT THEM.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { reviews } = require('../content.json');
const { C, px, box, gap, container, widget, band, stack, row, grid, eyebrow, heading, text, button, image } = L;

const FORM_ID = 'case-review';
// Paste the YouTube / Vimeo / MP4 URL of Jen's 30-second intro here when it arrives; the Meet Jennifer section shows it.
const INTRO_VIDEO_URL = '';

/* ---------------------------------------------------------------- variants */
// Each variant matches one Meta video ad. Slug = the URL the ad points to.
const VARIANTS = [
  {
    key: 'car-accident', slug: 'case-review', title: 'Free Case Review: Car Accident',
    eyebrow: 'The People’s Champion · Gwinnett & Metro Atlanta',
    h1: 'Injured in a car accident?<br>We fight for you.',
    sub: 'At Cabrera Torres Law, we stand up for injured people throughout Gwinnett County and Metro Atlanta. Let us handle the insurance companies while you focus on recovery.',
  },
  {
    key: 'gwinnett', slug: 'case-review-gwinnett', title: 'Free Case Review: Gwinnett County',
    eyebrow: 'Raised in Gwinnett · Fighting for Gwinnett',
    h1: 'Hurt in Gwinnett County?<br>We fight for you.',
    sub: 'Jennifer Cabrera-Torres grew up in Gwinnett County and runs her firm in Norcross. If you were injured in an accident, she and her team will handle the insurance companies while you focus on recovery.',
  },
  {
    key: 'jennifer', slug: 'case-review-jennifer', title: 'Free Case Review: Jennifer Cabrera-Torres',
    eyebrow: 'The People’s Champion',
    h1: 'Meet Jennifer Cabrera-Torres.<br>Your champion after an accident.',
    sub: 'Raised in Gwinnett County and fluent in English and Spanish, Jennifer stands up for injured people across Metro Atlanta. Tell her what happened and get a free, confidential case review.',
  },
  {
    key: 'insurance', slug: 'case-review-insurance', title: 'Free Case Review: Insurance Companies',
    eyebrow: 'The People’s Champion · Gwinnett & Metro Atlanta',
    h1: 'The insurance company has a team.<br>Now you do too.',
    sub: 'Insurance companies have teams protecting their interests. Injured people deserve a champion protecting theirs. Let us handle the insurers while you focus on recovery.',
  },
];

const ACCIDENT_TYPES = ['Car accident', 'Truck / 18-wheeler accident', 'Motorcycle accident', 'Uber / Lyft accident', 'Pedestrian or bicycle accident', 'Slip and fall', 'Dog bite', 'Other injury'];

/* ---------------------------------------------------------------- form */
const fld = P.fld;
const hidden = (id) => ({ _id: L.id(), custom_id: id, field_type: 'hidden', field_label: id, field_value: '', width: '100' });
const DISCLOSURE = 'Free and confidential. Submitting this form does not create an attorney-client relationship. No attorney fees unless we recover compensation for you, subject to our written fee agreement. Attorney advertising.';

function leadForm(v, o = {}) {
  return widget('form', {
    form_name: `LP Lead (${v.key})`,
    form_fields: [
      fld('first_name', 'text', 'First name *', '50', { required: 'true', widthM: '50' }),
      fld('last_name', 'text', 'Last name *', '50', { required: 'true', widthM: '50' }),
      fld('phone', 'tel', 'Phone *', '100', { required: 'true' }),
      fld('email', 'email', 'Email *', '100', { required: 'true' }),
      { ...fld('accident_type', 'select', 'Type of accident *', '100', { required: 'true' }), field_options: ['Type of accident *|', ...ACCIDENT_TYPES].join('\n') },
      fld('message', 'textarea', 'Briefly, what happened? (optional)', '100', { rows: 3 }),
      { ...fld('sms_consent', 'acceptance', 'Text message consent (optional)', '100'), acceptance_text: 'Optional: Yes, I agree to receive text messages from Cabrera Torres Law Firm about my case, including case updates, appointment reminders, and document requests. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to hire us. See our <a href="/privacy-policy/" target="_blank" style="text-decoration:underline;color:#2B1D17;font-weight:600">Privacy Policy</a> and <a href="/sms-terms/" target="_blank" style="text-decoration:underline;color:#2B1D17;font-weight:600">SMS Terms</a>.' },
      // Filled by perf/ct-lead-tracking.php: which ad/campaign sent the lead, Meta click/browser IDs, dedup event ID.
      ...['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'fbp', 'fbc', 'event_id', 'landing_url'].map(hidden),
      { ...hidden('lp_variant'), field_value: v.key },
    ],
    show_labels: '', mark_required: '', input_size: 'md', button_text: 'Request my free case review', button_size: 'lg', button_width: '100',
    submit_actions: ['save-to-database', 'email', 'redirect'], // save-to-database: every lead is kept in WordPress even if an email fails
    email_subject: `New ad lead: [field id="accident_type"] (${v.key}) – Cabrera Torres Law Firm`,
    // Absolute URL: Elementor's redirect action silently ignores relative ones.
    redirect_to: 'https://cabreratorres.com/thank-you/?eid=[field id="event_id"]&lp=[field id="lp_variant"]',
    custom_messages: 'yes', success_message: 'Thank you, we received your request.',
    column_gap: px(12), row_gap: px(12),
    field_text_color: C.ink, field_background_color: '#FFFFFF', field_border_color: C.line, field_border_width: box(1), field_border_radius: box(0),
    ...L.typo('field_typography', 16, 400, { lh: 1.5 }),
    button_background_color: C.wood, button_text_color: C.ivory, button_background_hover_color: C.espMid, button_hover_color: C.ivory,
    button_border_radius: box(0), ...L.typo('button_typography', 15, 700, { lh: 1.2, ls: 0.12, transform: 'uppercase' }), button_text_padding: box(20, 24, 20, 24),
    success_message_color: C.roseDeep,
    custom_css: `selector .elementor-field-textual { padding: 14px 16px; min-height: 52px; font-size: 16px; }
selector select.elementor-field-textual { color: ${C.ink}; }
selector .elementor-field-textual::placeholder { color: #8C7B70; opacity: 1; }
selector .elementor-field-textual:focus { border-color: ${C.wood} !important; box-shadow: none; }
selector .elementor-field-type-acceptance .elementor-field-subgroup label { color: ${C.inkMuted}; font-size: 12px; line-height: 1.5; }
selector .elementor-field-type-acceptance input { accent-color: ${C.wood}; }
selector .elementor-button { min-height: 60px; }`,
    ...(o.settings || {}),
  });
}

// The white form card used in the hero and the final call to action.
const formCard = (v, title, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(32, 28, 28, 28), padding_mobile: box(24, 18, 22, 18),
  background_background: 'classic', background_color: C.ivory, border_border: 'solid', border_width: box(1), border_color: C.hair,
  box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 24, blur: 60, spread: 0, color: 'rgba(0,0,0,0.35)' },
  ...(o.anchor ? { _element_id: o.anchor } : {}),
}, [
  heading(title, 'h2', [26, 24, 22], C.ink, 'left', { lh: 1.2 }),
  text('Takes about 1 minute. Hablamos español.', { color: C.inkMuted, size: 14, lh: 1.4 }),
  leadForm(v),
  text(DISCLOSURE, { color: C.inkMuted, size: 12, lh: 1.5 }),
]);

/* ---------------------------------------------------------------- page pieces */
// Minimal header: logo (not a link, nothing to wander off to) and the phone number.
const lpHeader = (m) => container({
  content_width: 'boxed', boxed_width: px(1320), flex_direction: 'row', flex_wrap: 'nowrap', flex_justify_content: 'space-between', flex_align_items: 'center',
  padding: box(16, 32, 16, 32), padding_mobile: box(12, 16, 12, 16), background_background: 'classic', background_color: C.wood,
  border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: 'rgba(196,160,141,0.18)',
}, [
  image(m.logoLight482, { width: [220, 200, 160], align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(220), _element_custom_width_mobile: px(160), _flex_size: 'none' } }),
  button(`Call ${L.PHONE}`, L.TEL, 'gold', { size: 13, ls: 0.1, pad: box(14, 20, 14, 20), settings: { _flex_size: 'none', hide_mobile: 'hidden-mobile' } }),
  text(`<a href="${L.TEL}" aria-label="Call ${L.PHONE}">${L.PHONE}</a>`, { color: C.rose, size: 16, weight: 700, linkColor: C.rose, linkHover: C.ivory, settings: { _element_width: 'auto', hide_desktop: 'hidden-desktop', hide_tablet: 'hidden-tablet' } }),
]);

const check = (t) => `<span style="display:inline-flex;align-items:center;gap:8px;margin:0 18px 8px 0"><span style="color:${C.rose};font-weight:700">✓</span>${t}</span>`;

function hero(m, v) {
  const copy = stack([
    eyebrow(v.eyebrow, C.rose, 'left', { size: 12, weight: 700, ls: 0.22 }),
    heading(v.h1, 'h1', [52, 44, 34], C.ivory, 'left', { lh: 1.08 }),
    text(v.sub, { color: C.ivory, size: [18, 18, 17], lh: 1.65, maxW: 560 }),
    // Name chip: visitors who saw Jen in the ad recognise her straight away (the big photo is desktop only).
    row([
      image(m.jenHeadshot, { settings: { _element_width: 'auto', _flex_size: 'none', custom_css: `selector img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid ${C.rose}; display: block; }` } }),
      text(`<strong style="color:${C.ivory};font-weight:700">Jennifer Cabrera-Torres, Esq.</strong><br>Founder &amp; Managing Attorney`, { color: C.rose, size: 14, lh: 1.5, settings: { _element_width: 'auto' } }),
    ], { gap: 14, settings: { flex_wrap: 'nowrap' } }),
    text(`<p>${check('Free, confidential case review')}${check('No fee unless we recover')}${check('Hablamos español')}</p>`, { color: C.ivory, size: 14, weight: 600, lh: 1.4 }),
    row([
      button('Get my free case evaluation', `#${FORM_ID}`, 'gold', { size: 13, ls: 0.1, pad: box(18, 24, 18, 24), settings: { hide_desktop: 'hidden-desktop' } }),
      button(`Call ${L.PHONE}`, L.TEL, 'outlineDark', { size: 13, ls: 0.1, pad: box(18, 24, 18, 24) }),
    ], { gap: 12 }),
  ], { gap: 18, settings: { padding: box(56, 0, 56, 0), padding_tablet: box(48, 0, 24, 0), padding_mobile: box(32, 0, 8, 0) } });
  const photo = container({ content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', padding: box(0), hide_tablet: 'hidden-tablet', hide_mobile: 'hidden-mobile', css_classes: 'e-no-lazyload', custom_css: 'selector { align-self: end; }' }, [
    image(m.heroJenNatural, { size: 'large', settings: { custom_css: 'selector img { display: block; width: auto; max-width: 100%; height: 560px; object-fit: contain; object-position: bottom; filter: drop-shadow(0 30px 50px rgba(0,0,0,.55)); }' } }),
  ]);
  const form = container({ content_width: 'full', flex_direction: 'column', padding: box(40, 0, 40, 0), padding_tablet: box(24, 0, 48, 0), padding_mobile: box(16, 0, 40, 0) }, [
    formCard(v, 'Get your free case evaluation', { anchor: FORM_ID }),
  ]);
  return container({
    content_width: 'boxed', boxed_width: px(1320), container_type: 'grid',
    grid_columns_grid: { unit: 'custom', size: 'minmax(0,1.05fr) minmax(0,.7fr) minmax(0,1fr)' }, grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
    grid_rows_grid: L.auto, grid_rows_grid_tablet: L.auto, grid_rows_grid_mobile: L.auto, grid_gaps: gap(32, 0), grid_gaps_mobile: gap(0, 0), grid_align_items: 'center',
    padding: box(0, 32, 0, 32), padding_mobile: box(0, 16, 0, 16),
    background_background: 'gradient', background_color: C.heroBlack, background_color_b: C.wood, background_gradient_angle: { unit: 'deg', size: 160, sizes: [] },
  }, [copy, photo, form], false);
}

const statement = () => band(C.espMid, [
  heading('Insurance companies have teams protecting their interests. Injured people deserve a champion protecting theirs.', 'h2', [36, 30, 24], C.ivory, 'center', { lh: 1.3, maxW: 960 }),
], { pad: [64, 64], width: 1100, align: 'center' });

const WHY = [
  ['pin', 'Rooted in Gwinnett County', 'Jennifer was raised in Gwinnett County and runs her firm in Norcross, close to the people she represents.'],
  ['chat', 'Personal attention', 'You will know who is handling your case and how to reach her. We keep you informed at every step.'],
  ['integrity', 'Experienced advocacy', 'Two decades in personal injury law, with every case prepared as if it could go to trial.'],
  ['shield', 'We handle the insurers', 'We deal with the adjusters, the paperwork and the negotiations so you can focus on getting better.'],
  ['fee', 'No fee unless we recover', 'You pay no attorney fees unless we recover compensation for you, subject to our written fee agreement.'],
  ['lang', 'Hablamos español', 'Bilingual help in English and Spanish, from your first call to the end of your case.'],
];
const why = () => band(C.ivory, [
  eyebrow('Why Cabrera Torres Law', C.wood, 'center', { weight: 700, ls: 0.3, settings: { _margin: box(0, 0, 14, 0) } }),
  heading('A champion in your corner', 'h2', [42, 36, 30], C.ink, 'center', { lh: 1.15 }),
  grid(WHY.map(([ic, t, d]) => container({
    content_width: 'full', flex_direction: 'column', flex_gap: gap(12), padding: box(28, 26, 28, 26), padding_mobile: box(22, 20, 22, 20),
    background_background: 'classic', background_color: C.light, border_border: 'solid', border_width: box(1), border_color: C.hair,
  }, [P.svg(P.ICON[ic], 40), heading(t, 'h3', [20, 19, 18], C.ink, 'left', { lh: 1.25 }), text(d, { size: 15, lh: 1.6, color: C.inkSoft })])),
  { cols: [3, 2, 1], gap: 20, settings: { margin: box(44, 0, 0, 0), margin_mobile: box(28, 0, 0, 0) } }),
], { pad: [88, 88], width: 1240, align: 'center', settings: { padding_mobile: box(56, 16, 56, 16) } });

function meetJen(m) {
  const media = INTRO_VIDEO_URL
    ? widget('video', { video_type: /youtu/.test(INTRO_VIDEO_URL) ? 'youtube' : /vimeo/.test(INTRO_VIDEO_URL) ? 'vimeo' : 'hosted', youtube_url: INTRO_VIDEO_URL, vimeo_url: INTRO_VIDEO_URL, hosted_url: { url: INTRO_VIDEO_URL }, lazy_load: 'yes', aspect_ratio: '169' })
    : image(m.jenDeskWide, { size: 'large', settings: { custom_css: 'selector img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; object-position: center 30%; }' } });
  return band(C.nearBlack, [grid([
    media,
    stack([
      eyebrow('Meet your attorney', C.rose, 'left', { weight: 700, ls: 0.3 }),
      heading('Jennifer Cabrera-Torres, Esq.', 'h2', [40, 34, 30], C.ivory, 'left', { lh: 1.15 }),
      text('“Treat every case like it’s personal, because for me, it is.”', { color: C.rose, size: [21, 20, 19], lh: 1.45, family: L.HFONT, style: 'italic' }),
      text('Born in Atlanta and raised in Gwinnett County by immigrant parents, Jennifer is proud to serve the community she has long called home. Before becoming an attorney, she spent more than 15 years as a personal injury trial paralegal, learning the preparation, persistence and personal attention injury cases require.', { color: C.ivory, size: 16, lh: 1.75 }),
      text('Fluent in English and Spanish, she wants every client to feel heard, understand the process and know who is standing beside them.', { color: C.ivory, size: 16, lh: 1.75 }),
      button(`Talk to Jennifer: ${L.PHONE}`, L.TEL, 'gold', { size: 13, ls: 0.1, pad: box(18, 24, 18, 24), settings: { _margin: box(8, 0, 0, 0) } }),
    ], { gap: 16 }),
  ], { cols: ['minmax(0,1fr) minmax(0,1fr)', 1, 1], gap: 56, rowGap: 32, align: 'center' })], { pad: [88, 88], width: 1240, settings: { padding_mobile: box(56, 16, 56, 16) } });
}

const STEPS = [
  ['01', 'Free consultation', 'Tell us what happened. We review your case at no cost and explain your options.'],
  ['02', 'Accident investigation', 'We gather police reports, photos, video and witness statements to establish fault.'],
  ['03', 'Insurance communication', 'We handle the calls and the paperwork with the insurance companies so you do not have to.'],
  ['04', 'Medical documentation', 'We collect your medical records and bills to document the full impact of your injuries.'],
  ['05', 'Negotiation or litigation', 'We negotiate for a fair settlement and, when it is necessary, take your case to court.'],
];
const howWeHelp = () => band(C.wood, [
  eyebrow('How we help', C.rose, 'center', { weight: 700, ls: 0.3, settings: { _margin: box(0, 0, 14, 0) } }),
  heading('From your first call to your recovery', 'h2', [42, 36, 30], C.ivory, 'center', { lh: 1.15 }),
  grid(STEPS.map(([n, h, p]) => P.numberCard(n, h, p, { dark: true, pad: box(28, 22, 28, 22), nGap: 14, pSize: 15 })), { cols: [5, 2, 1], gap: 16, settings: { margin: box(44, 0, 0, 0), margin_mobile: box(28, 0, 0, 0) } }),
], { pad: [88, 88], width: 1320, align: 'center', settings: { padding_mobile: box(56, 16, 56, 16) } });

const proof = () => band(C.ivory, [
  eyebrow('What our clients say', C.wood, 'center', { weight: 700, ls: 0.3, settings: { _margin: box(0, 0, 14, 0) } }),
  heading('Real reviews from real clients', 'h2', [40, 34, 28], C.ink, 'center', { lh: 1.15 }),
  grid(reviews.slice(0, 3).map((r) => L.glass([
    text('★★★★★', { color: C.wood, size: 22, ls: 0.12, lh: 1 }),
    text(r.text, { color: C.ink, size: 16, lh: 1.7, settings: { _flex_size: 'grow' } }),
    text(`${r.name} · Google review`, { color: C.inkMuted, size: 13, weight: 700, ls: 0.08, lh: 1.4 }),
  ], { gap: 16, pad: box(30, 26, 30, 26) })), { cols: [3, 1, 1], gap: 20, settings: { margin: box(40, 0, 0, 0), margin_mobile: box(28, 0, 0, 0) } }),
], { pad: [88, 40], width: 1240, align: 'center', settings: { padding_mobile: box(56, 16, 32, 16) } });

const FAQS = [
  { q: 'How much does it cost to talk to you?', a: 'Nothing. Your case review is free and confidential. We work on a contingency fee: you pay no attorney fees unless we recover compensation for you, as set out in our written fee agreement.' },
  { q: 'Should I talk to the other driver’s insurance company?', a: 'You are not required to give the other driver’s insurer a recorded statement. Adjusters work for the insurance company, and what you say can be used to lower the value of your claim. Let us handle those conversations.' },
  { q: 'Who pays my medical bills while my case is open?', a: 'In Georgia, the at-fault driver’s insurer usually pays at the end of the claim, not as bills arrive. In the meantime, your own health insurance or medical payments (MedPay) coverage may help, and some providers will wait for payment until the case resolves. We help you understand your options.' },
  { q: 'How does the claims process work?', a: 'We investigate the accident, document your injuries and losses, present a demand to the insurance company and negotiate. Most cases resolve by settlement. If the insurer will not be fair, we are prepared to file a lawsuit.' },
  { q: 'How long do I have to file a claim?', a: 'In Georgia, generally two years from the date of the injury for most personal injury cases. Exceptions can shorten or extend that deadline, so it is important to call early.' },
  { q: '¿Hablan español?', a: 'Sí. Jennifer and our team work in English and Spanish, so you understand every step of your case.' },
];
const faq = () => band(C.ivory, [
  eyebrow('Questions', C.wood, 'center', { weight: 700, ls: 0.3, settings: { _margin: box(0, 0, 14, 0) } }),
  heading('Common questions after an accident', 'h2', [40, 34, 28], C.ink, 'center', { lh: 1.15, settings: { _margin: box(0, 0, 32, 0) } }),
  P.faqAccordion(FAQS, { aSize: 16 }),
], { pad: [72, 88], width: 860, align: 'stretch', settings: { padding_mobile: box(48, 16, 56, 16) } });

const finalCta = (v) => band(C.heroBlack, [grid([
  stack([
    eyebrow('Free case evaluation', C.rose, 'left', { weight: 700, ls: 0.3 }),
    heading('Don’t face the insurance company alone.', 'h2', [46, 38, 32], C.ivory, 'left', { lh: 1.1 }),
    text('Tell us what happened. We will review your case for free and explain your options, in English or Spanish.', { color: C.ivory, size: 17, lh: 1.7, maxW: 520 }),
    button(`Call ${L.PHONE}`, L.TEL, 'gold', { size: 14, ls: 0.1, pad: box(20, 28, 20, 28) }),
  ], { gap: 18 }),
  formCard(v, 'Request your free case review'),
], { cols: ['minmax(0,1fr) minmax(0,1fr)', 1, 1], gap: 56, rowGap: 32, align: 'center' })], { pad: [88, 88], width: 1240, settings: { padding_mobile: box(56, 16, 56, 16) } });

const lpFooter = () => container({
  content_width: 'boxed', boxed_width: px(1240), flex_direction: 'column', flex_gap: gap(10), padding: box(40, 32, 40, 32), padding_mobile: box(32, 16, 96, 16),
  background_background: 'classic', background_color: C.black,
}, [
  text(`<p><strong style="color:${C.ivory}">Cabrera Torres Law Firm</strong> · 1770 Indian Trail Lilburn Rd NW, Suite 350, Norcross, GA 30093 · <a href="${L.TEL}">${L.PHONE}</a></p>`, { color: C.sand, size: 14, lh: 1.7, linkColor: C.rose, linkHover: C.ivory }),
  text('Attorney advertising. Prior results do not guarantee a similar outcome. Contacting us or submitting a form does not create an attorney-client relationship. Responsible attorney: Jennifer Cabrera-Torres, Esq.', { color: C.smoke, size: 12, lh: 1.6 }),
  text(`<p>© 2026 Cabrera Torres Law Firm · <a href="/privacy-policy/" style="text-decoration:underline">Privacy Policy</a> · <a href="/sms-terms/" style="text-decoration:underline">SMS Terms</a></p>`, { color: C.smoke, size: 12, lh: 1.6, linkColor: C.sand, linkHover: C.rose }),
]);

// Sticky phone bar: always one tap from calling or from the form. (Wrapped in a container: Elementor drops widgets
// placed directly at the top level of a container-based page.)
const stickyBar = () => container({ content_width: 'full', padding: box(0), min_height: px(0), css_classes: 'ct-lp-bar-wrap' }, [widget('html', {
  html: `<div class="ct-lp-bar" role="navigation" aria-label="Contact"><a class="call" href="${L.TEL}">Call now</a><a class="form" href="#${FORM_ID}">Free case review</a></div>
<style>.ct-lp-bar{display:none}@media (max-width:767px){.ct-lp-bar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:9999;box-shadow:0 -6px 24px rgba(0,0,0,.3)}
.ct-lp-bar a{flex:1;display:flex;align-items:center;justify-content:center;min-height:60px;padding-bottom:env(safe-area-inset-bottom);font:700 14px/1.2 Montserrat,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-decoration:none}
.ct-lp-bar .call{background:${C.rose};color:${C.wood}}.ct-lp-bar .form{background:${C.wood};color:${C.ivory}}}</style>`,
})]);

const pageSettings = {
  ...L.pageSettings, template: 'elementor_canvas', background_color: C.ivory,
  custom_css: `${L.pageSettings.custom_css}\nselector [id] { scroll-margin-top: 16px; }`,
};
const SEO = (v) => ({ title: `${v.title.replace('Free Case Review: ', '')} | Free Case Review | Cabrera Torres Law`, description: v.sub.slice(0, 155), focus: 'personal injury lawyer Gwinnett', noindex: true });

const variantPage = (v) => ({
  slug: v.slug, title: v.title, seo: SEO(v), template: 'elementor_canvas', pageSettings,
  build: (m) => [lpHeader(m), hero(m, v), statement(), why(), meetJen(m), howWeHelp(), proof(), P.awardsStrip(m, { bg: C.light, border: true }), faq(), finalCta(v), lpFooter(), stickyBar()],
});

// Thank-you page: the conversion page (Meta "Lead" / GA4 "generate_lead" fire here, see perf/ct-lead-tracking.php).
const thankYou = {
  slug: 'thank-you', title: 'Thank You', template: 'elementor_canvas', pageSettings,
  seo: { title: 'Thank You | Cabrera Torres Law', description: 'We received your request for a free case review.', focus: 'thank you', noindex: true },
  build: (m) => [
    lpHeader(m),
    band(C.heroBlack, [stack([
      image(m.jenHeadshot, { settings: { custom_css: `selector img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 2px solid ${C.rose}; }` } }),
      eyebrow('Request received', C.rose, 'center', { weight: 700, ls: 0.3 }),
      heading('Thank you. We’re on your side.', 'h1', [48, 40, 32], C.ivory, 'center', { lh: 1.1 }),
      text('We received your request for a free case review. A member of our team will contact you shortly. If you need to talk now, call us.', { color: C.ivory, size: 18, lh: 1.7, align: 'center', maxW: 620 }),
      button(`Call ${L.PHONE}`, L.TEL, 'gold', { size: 14, ls: 0.1, pad: box(20, 28, 20, 28) }),
      text('Hablamos español.', { color: C.rose, size: 15, weight: 600, align: 'center' }),
    ], { gap: 18, align: 'center' })], { pad: [96, 120], width: 900, align: 'center', settings: { padding_mobile: box(64, 16, 80, 16) } }),
    band(C.ivory, [
      eyebrow('What happens next', C.wood, 'center', { weight: 700, ls: 0.3, settings: { _margin: box(0, 0, 28, 0) } }),
      grid([
        ['01', 'We review your information', 'Our team reads what you sent us and gets ready for your call.'],
        ['02', 'We call you', 'We will reach out to talk through what happened and answer your questions.'],
        ['03', 'You decide', 'There is no cost and no obligation. You choose whether to move forward.'],
      ].map(([n, h, p]) => P.numberCard(n, h, p, { pad: box(28, 24, 28, 24), nGap: 14, pSize: 15 })), { cols: [3, 1, 1], gap: 20 }),
    ], { pad: [72, 88], width: 1100, align: 'center', settings: { padding_mobile: box(48, 16, 56, 16) } }),
    lpFooter(),
  ],
};

module.exports = { VARIANTS, pages: [...VARIANTS.map(variantPage), thankYou] };
