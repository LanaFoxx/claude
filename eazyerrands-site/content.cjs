// AHCA compliance updates for eazyerrands.com, expressed as Elementor editor operations.
let n = 0;
const id = () => (0x1000000 + (Date.now() % 0xffffff) + (n++ * 7919)).toString(16).slice(-7);
const px = (size) => ({ unit: 'px', size, sizes: [] });
const box = (t, r, b, l) => ({ unit: 'px', top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: false });
const gap = (g) => ({ column: String(g), row: String(g), isLinked: true, unit: 'px', size: g });
const GREEN = '#669401', NAVY = '#020E26', GREEN_GLOBAL = { __globals__: { title_color: 'globals/colors?id=eedc3fc' } };

const STATEMENT = 'Eazy Errands LLC is registered with the Florida Agency for Health Care Administration (AHCA), license No. 242370. We provide professional, reliable non-medical homemaker, companion, and everyday assistance services. Our services do not include hands-on personal care or medical care. Required background screenings have been completed.';
const NON_MEDICAL = 'Eazy Errands LLC provides non-medical homemaker and companion services only. We do not provide hands-on personal care, nursing care, medical treatment, or any other medical services.';

const C = (settings, elements = []) => ({ id: id(), elType: 'container', settings: { content_width: 'full', ...settings }, elements });
const W = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });
const heading = (title, o = {}) => W('heading', {
  title, header_size: 'h2', align: 'center', typography_typography: 'custom', typography_font_family: 'nexa',
  typography_font_size: px(52), typography_font_size_tablet: px(44), typography_font_size_mobile: px(34), typography_font_weight: '800',
  typography_line_height: { unit: 'em', size: 1.05, sizes: [] }, typography_letter_spacing: px(-1.6), typography_letter_spacing_mobile: px(-0.9),
  title_color: '#1E1E1E', _margin: box(0, 0, 0, 0), ...o,
});
// Two-tone heading row ("Registered &" dark + "Background Screened" green), like the site's existing titles.
const twoTone = (a, b, { color = '#1E1E1E', justify = 'center', size = 52 } = {}) => C({
  flex_direction: 'row', flex_wrap: 'wrap', flex_justify_content: justify, flex_justify_content_mobile: 'center', flex_align_items: 'center',
  flex_gap: gap(12), padding: box(0, 0, 0, 0),
}, [heading(a, { title_color: color, typography_font_size: px(size), align: 'left' }), heading(b, { title_color: GREEN, ...GREEN_GLOBAL, typography_font_size: px(size), align: 'left' })]);
const text = (html, o = {}) => W('text-editor', {
  editor: html, align: 'center', typography_typography: 'custom', typography_font_family: 'Poppins', typography_font_size: px(18),
  typography_font_size_mobile: px(16), typography_font_weight: '300', typography_line_height: { unit: 'em', size: 1.7, sizes: [] },
  text_color: '#535353', _margin: box(0, 0, 0, 0), ...o,
});
const eyebrow = (t, o = {}) => heading(t, {
  header_size: 'p', typography_font_family: 'Poppins', typography_font_size: px(14), typography_font_size_tablet: px(14), typography_font_size_mobile: px(12),
  typography_font_weight: '700', typography_letter_spacing: px(2.5), typography_letter_spacing_mobile: px(1.5), typography_text_transform: 'uppercase',
  typography_line_height: { unit: 'em', size: 1.4, sizes: [] }, title_color: GREEN, ...GREEN_GLOBAL, ...o,
});
const icon = (value, library, o = {}) => W('icon', { selected_icon: { value, library }, size: px(56), align: 'center', primary_color: GREEN, __globals__: { primary_color: 'globals/colors?id=eedc3fc' }, ...o });
const SHIELD = ['mdi mdi-shield-check-outline', 'skb_cife-materialdesign-icon'];
const iconList = (items, { color = '#3D3D3D', iconColor = GREEN, glyph = 'fas fa-check-circle', size = 17 } = {}) => W('icon-list', {
  icon_list: items.map((t) => ({ _id: id(), text: t, selected_icon: { value: glyph, library: 'fa-solid' } })),
  space_between: px(14), icon_color: iconColor, icon_size: px(20), text_indent: px(10), text_color: color,
  icon_typography_typography: 'custom', icon_typography_font_family: 'Poppins', icon_typography_font_size: px(size), icon_typography_font_size_mobile: px(15),
  icon_typography_font_weight: '400', icon_typography_line_height: { unit: 'em', size: 1.5, sizes: [] }, icon_self_vertical_align: 'flex-start', icon_vertical_offset: px(3),
});
const card = (settings, els) => C({
  flex_direction: 'column', background_background: 'classic', background_color: '#FFFFFF', border_radius: { unit: 'px', top: '20', right: '20', bottom: '20', left: '20', isLinked: true },
  box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 6, blur: 30, spread: 0, color: 'rgba(2, 14, 38, 0.08)' },
  padding: box(40, 36, 40, 36), padding_mobile: box(30, 24, 30, 24), flex_gap: gap(14), ...settings,
}, els);

// ---------- Homepage: AHCA trust band (between the feature strip and "About Us") ----------
const licenseBadge = () => C({
  flex_direction: 'column', flex_justify_content: 'center', flex_align_items: 'center', width: { unit: '%', size: 36 }, width_tablet: { unit: '%', size: 100 },
  background_background: 'gradient', background_color: NAVY, background_color_b: '#05183F', background_gradient_angle: { unit: 'deg', size: 160, sizes: [] },
  border_radius: { unit: 'px', top: '18', right: '18', bottom: '18', left: '18', isLinked: true }, padding: box(44, 30, 44, 30), flex_gap: gap(8),
}, [
  icon(...SHIELD, { size: px(64) }),
  eyebrow('Florida AHCA License No.', { title_color: '#FFFFFF', __globals__: {}, typography_font_size: px(13), _margin: box(10, 0, 0, 0) }),
  heading('242370', { header_size: 'p', title_color: GREEN, ...GREEN_GLOBAL, typography_font_size: px(64), typography_font_size_tablet: px(58), typography_font_size_mobile: px(50), typography_letter_spacing: px(1) }),
  text('Registered with the Florida Agency for Health Care Administration', { text_color: '#FFFFFFCC', typography_font_size: px(15), typography_font_size_mobile: px(14), typography_line_height: { unit: 'em', size: 1.5, sizes: [] } }),
]);
const homeTrustBand = () => C({
  content_width: 'boxed', boxed_width: px(1150), flex_direction: 'column', background_background: 'classic', background_color: '#FFFFFF',
  padding: box(10, 40, 80, 40), padding_mobile: box(10, 20, 60, 20), _title: 'AHCA Registration',
}, [
  C({
    flex_direction: 'row', flex_direction_tablet: 'column', flex_align_items: 'stretch', flex_gap: gap(50), flex_gap_mobile: gap(30),
    background_background: 'classic', background_color: '#F3F7EA', border_border: 'solid', border_width: { unit: 'px', top: '1', right: '1', bottom: '1', left: '1', isLinked: true },
    border_color: '#DDE8C4', border_radius: { unit: 'px', top: '24', right: '24', bottom: '24', left: '24', isLinked: true },
    padding: box(50, 50, 50, 56), padding_mobile: box(30, 22, 30, 22), animation: 'fadeInUp', animation_duration: 'fast',
  }, [
    C({ flex_direction: 'column', flex_justify_content: 'center', width: { unit: '%', size: 64 }, width_tablet: { unit: '%', size: 100 }, flex_gap: gap(18) }, [
      eyebrow('State Registered • Background Screened • Non-Medical', { align: 'left', align_mobile: 'center' }),
      twoTone('Registered With', 'Florida AHCA', { justify: 'flex-start', size: 46 }),
      text(`<p>${STATEMENT}</p>`, { align: 'left', align_mobile: 'center', typography_font_size: px(17) }),
      iconList(['AHCA License No. 242370', 'Required background screenings completed', 'Non-medical homemaker &amp; companion services only']),
    ]),
    licenseBadge(),
  ]),
]);

// ---------- About Us: registration + "what we provide / do not provide" ----------
const pillar = (glyph, lib, title, body) => card({ flex_align_items: 'center', width: { unit: '%', size: 32 }, width_tablet: { unit: '%', size: 100 } }, [
  icon(glyph, lib, { size: px(52) }),
  heading(title, { header_size: 'h3', typography_font_size: px(22), typography_font_size_tablet: px(22), typography_font_size_mobile: px(21), typography_letter_spacing: px(-0.5), title_color: '#1E1E1E', _margin: box(6, 0, 0, 0) }),
  text(`<p>${body}</p>`, { typography_font_size: px(16), typography_font_size_mobile: px(15) }),
]);
const listCard = (title, items, ok) => card({ width: { unit: '%', size: 50 }, width_tablet: { unit: '%', size: 100 }, flex_gap: gap(20),
  border_border: 'solid', border_width: { unit: 'px', top: '4', right: '0', bottom: '0', left: '0', isLinked: false }, border_color: ok ? GREEN : '#8A94A6' }, [
  heading(title, { header_size: 'h3', align: 'left', typography_font_size: px(28), typography_font_size_tablet: px(28), typography_font_size_mobile: px(24), typography_letter_spacing: px(-0.8) }),
  iconList(items, ok ? {} : { glyph: 'fas fa-times-circle', iconColor: '#8A94A6' }),
]);
const aboutRegistration = () => C({
  flex_direction: 'column', flex_align_items: 'center', background_background: 'classic', background_color: '#F4F6F9',
  padding: box(90, 80, 90, 80), padding_tablet: box(80, 40, 80, 40), padding_mobile: box(60, 20, 60, 20), flex_gap: gap(28), _title: 'AHCA Registration',
}, [
  eyebrow('Florida AHCA License No. 242370'),
  twoTone('Registered &', 'Background Screened'),
  text(`<p>${STATEMENT}</p>`, { _element_width: 'initial', _element_custom_width: px(900), _element_width_tablet: 'inherit', typography_font_size: px(19) }),
  C({ content_width: 'boxed', boxed_width: px(1150), flex_direction: 'row', flex_direction_tablet: 'column', flex_gap: gap(28), padding: box(22, 0, 0, 0) }, [
    pillar(...SHIELD, 'AHCA License No. 242370', 'Registered with the Florida Agency for Health Care Administration (AHCA).'),
    pillar('fas fa-user-check', 'fa-solid', 'Background Screened', 'Required background screenings have been completed, so you can welcome us into your home with confidence.'),
    pillar('fas fa-hands-helping', 'fa-solid', 'Non-Medical Services', 'Professional homemaker, companion, and everyday assistance services.'),
  ]),
  C({ content_width: 'boxed', boxed_width: px(1150), flex_direction: 'row', flex_direction_tablet: 'column', flex_gap: gap(28), padding: box(12, 0, 0, 0) }, [
    listCard('What We Provide', [
      'Companion visits and friendly check-ins', 'Homemaker services: light housekeeping, tidying &amp; home resets',
      'Grocery shopping, errands &amp; prescription pickup', 'Non-medical transportation and wait &amp; return service',
      'Home watch, vacation home &amp; property checks', 'Pet assistance and everyday tasks',
    ], true),
    listCard('What We Do Not Provide', [
      'Hands-on personal care (such as bathing, dressing, toileting or transfers)', 'Nursing or skilled care',
      'Medical treatment or medical advice', 'Administering or managing medications', 'Any other medical services',
    ], false),
  ]),
]);

// ---------- Services page: intro line + non-medical notice ----------
const servicesNotice = () => C({
  content_width: 'boxed', boxed_width: px(1120), flex_direction: 'row', flex_direction_mobile: 'column', flex_align_items: 'center', flex_gap: gap(28),
  background_background: 'classic', background_color: '#0B1F44', border_border: 'solid', border_width: { unit: 'px', top: '1', right: '1', bottom: '1', left: '1', isLinked: true },
  border_color: '#669401', border_radius: { unit: 'px', top: '18', right: '18', bottom: '18', left: '18', isLinked: true },
  padding: box(36, 40, 36, 40), padding_mobile: box(28, 22, 28, 22), _margin: box(40, 0, 0, 0), _title: 'Non-Medical Notice',
}, [
  icon(...SHIELD, { size: px(70), _flex_size: 'none' }),
  C({ flex_direction: 'column', flex_gap: gap(8) }, [
    heading('Non-Medical Services Only', { header_size: 'h3', align: 'left', align_mobile: 'center', title_color: '#FFFFFF', typography_font_size: px(28), typography_font_size_tablet: px(28), typography_font_size_mobile: px(24), typography_letter_spacing: px(-0.6) }),
    text(`<p>${STATEMENT}</p>`, { align: 'left', align_mobile: 'center', text_color: '#FFFFFFD9', typography_font_size: px(16), typography_font_size_mobile: px(15) }),
  ]),
]);

// ---------- Footer: license line under the three columns ----------
const footerLicense = () => C({
  flex_direction: 'row', flex_justify_content: 'center', border_border: 'solid', border_width: { unit: 'px', top: '1', right: '0', bottom: '0', left: '0', isLinked: false },
  border_color: '#FFFFFF26', padding: box(18, 0, 0, 0), padding_tablet: box(18, 0, 30, 0), _margin: box(10, 0, 0, 0), _title: 'AHCA License',
}, [
  text('<p><strong>Florida AHCA License No. 242370</strong>  •  Eazy Errands LLC is registered with the Florida Agency for Health Care Administration  •  Background screenings completed  •  Non-medical homemaker &amp; companion services only</p>', {
    text_color: '#FFFFFFB3', typography_font_size: px(13), typography_font_size_mobile: px(12), typography_line_height: { unit: 'em', size: 1.7, sizes: [] },
  }),
]);

// Operation types: set (widget settings), item (repeater item settings: [widgetId, repeaterName, index, settings]),
// create (insert model into parent container id, or document root when null), addItem (nested accordion item + answer).
module.exports = {
  55: [
    { set: '08ad6c9', s: { editor: 'AHCA Registered • Insured • Background Screened' } },
    { set: '0087f0b', s: { editor: '<p>Life gets busy—Eazy Errands is here to help with trusted non-medical homemaker, companion, errand, transportation, and everyday assistance services throughout Florida’s Treasure Coast.</p>' } },
    { set: '812f10a', s: { title: 'AHCA Registered & Background Screened' } },
    { set: 'a358bad', s: { editor: 'Florida AHCA License No. 242370. Required background screenings completed.' } },
    { set: 'f434e0a', s: { editor: '<p>Eazy Errands LLC is a local, AHCA-registered provider of non-medical homemaker, companion, and errand services, helping busy individuals, families, and seniors across the Treasure Coast. From shopping and pickups to transportation and everyday tasks, we make life easier with reliable, convenient support.</p>' } },
    { set: '5ec67dc', s: { editor: '<p>• Doctor Appointments<br />• Multi-Stop Appointments<br />• Non-Medical Transportation<br />• Pharmacy Stop After Appointment<br />• Therapy &amp; Wellness Appointments<br />• Wait &amp; Return Service</p>' } },
    { set: 'bf968d2', s: { editor: '<p>• Appointment Reminders<br />• Friendly Check-In Visits<br />• Family Updates After Visits<br />• Companion &amp; Homemaker Visits<br />• Transportation Assistance<br />• Technology Assistance</p>' } },
    { create: '95ae1f2', at: 1, model: text(`<p>${NON_MEDICAL}</p>`, { text_color: '#FFFFFFD9', _element_width: 'initial', _element_custom_width: px(860), _element_width_tablet: 'inherit', _margin: box(-10, 0, 0, 0) }) },
    { create: null, at: 2, model: homeTrustBand() },
  ],
  682: [
    { set: 'f434e0a', s: { editor: [
      '<p>At Eazy Errands LLC, we believe life should be easier, less stressful, and more manageable. Our mission is to provide trusted non-medical homemaker and companion services, errand services, non-medical transportation, grocery delivery, home watch services, and everyday assistance that help busy individuals, seniors, families, seasonal residents, and local businesses save time and focus on what matters most.</p>',
      '<p>Based on Florida’s Treasure Coast, Eazy Errands proudly serves Port St. Lucie, Stuart, Jensen Beach, Palm City, Hobe Sound, Jupiter, Vero Beach, and surrounding communities with reliable, professional, and personalized assistance tailored to each client’s unique needs.</p>',
      '<p>We understand that everyday responsibilities can quickly become overwhelming. Whether it’s grocery shopping and delivery, prescription pickup, transportation to appointments, companion visits, light housekeeping, home watch services, vacation property checks, pet assistance, personal assistant tasks, or managing multiple errands in a single trip, Eazy Errands is here to simplify your routine and provide peace of mind.</p>',
      '<p><strong>Eazy Errands LLC is registered with the Florida Agency for Health Care Administration (AHCA), License No. 242370, and our required background screenings have been completed.</strong> Our services are strictly non-medical: we do not provide hands-on personal care, nursing care, medical treatment, or any other medical services.</p>',
    ].join('') } },
    { create: null, at: 1, model: aboutRegistration() },
  ],
  976: [
    { create: '6388ab7', at: 1, model: text(`<p>${NON_MEDICAL}</p>`, { text_color: '#FFFFFFD9', _element_width: 'initial', _element_custom_width: px(860), _element_width_tablet: 'inherit', _flex_align_self: 'center', _margin: box(-10, 0, 10, 0) }) },
    { item: ['8b0b720', 'items', 4, { item_title: 'Therapy & Wellness Appointments — Starting at $40' }] },
    { set: '0858ad1', s: { editor: '<p>Reliable non-medical transportation to and from doctor appointments, designed to help clients travel safely, comfortably, and stress-free. We provide transportation and companionship only—no medical or hands-on care.</p>' } },
    { set: '85ef9e5', s: { editor: '<p>Non-medical transportation to and from therapy sessions, wellness appointments, rehabilitation visits, and other non-emergency appointments. We provide transportation and companionship only—no medical or hands-on care.</p>' } },
    { set: '0103779', s: { editor: '<p>Safe and dependable prescription pickup and delivery services throughout the Treasure Coast. We pick up and deliver only and do not administer or manage medications.</p>' } },
    { set: '428da54', s: { editor: '<p>Optional updates provided to family members following scheduled companion visits.</p>' } },
    { item: ['a25f907', 'items', 5, { item_title: 'Companion & Homemaker Visits — Starting at $45' }] },
    { set: '99f10ad', s: { editor: '<p>Dependable non-medical companion and homemaker visits for seniors who would like a little extra help with everyday tasks, conversation, and light household support. Does not include hands-on personal care.</p>' } },
    { create: '6388ab7', at: 3, model: servicesNotice() },
  ],
  645: [
    { set: '02f2800', s: { editor: `<p>Yes. ${NON_MEDICAL}</p>` } },
    { addItem: '8b0b720', at: 3, title: 'Is Eazy Errands registered and background screened?', answer: '<p>Yes. Eazy Errands LLC is registered with the Florida Agency for Health Care Administration (AHCA), License No. 242370, and required background screenings have been completed.</p>' },
    { set: '216a90c', s: { editor: '<p>Yes. We provide non-medical transportation to and from doctor appointments, therapy visits, and pharmacy pickups, along with related errands. We provide transportation and companionship only and do not provide medical or hands-on personal care.</p>' } },
    { set: '15f716b', s: { editor: '<p>Yes. Family updates may be provided upon request following companion visits.</p>' } },
  ],
  60: [{ create: '62b3cdb0', at: 1, model: footerLicense() }],
};
