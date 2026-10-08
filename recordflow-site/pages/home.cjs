const L = require('../lib.cjs');
const { C, HEAD, BODY, APP, URL, id, px, box, gap, auto, typo, container, widget, fa, band, stack, row, grid,
  eyebrow, H1, H2, H3, text, button, btnPrimary, textLink, image, decoMark, pos, iconList, checkList, pillLabel, tag } = L;

const dropShadow = '0 24px 40px rgba(16,24,40,0.22)';
const phoneShadow = '0 12px 24px rgba(0,0,0,0.5)';
const underlineSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 14' preserveAspectRatio='none'%3E%3Cpath d='M3 10 C 60 2, 120 4, 170 7 S 260 9, 297 4' fill='none' stroke='%230b57d0' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E";

// Small label/heading helpers local to this page
const label = (t, color, size, weight, o = {}) => widget('heading', {
  title: t, header_size: o.tag || 'p', title_color: color, align: o.align || 'left',
  ...typo('typography', o.family || BODY, size, weight, { lh: o.lh || 1.3, ls: o.ls, transform: o.transform }),
  ...(o.settings || {}),
});
const stat = (t, color, sizes = 48) => label(t, color, sizes, 700, { family: HEAD, lh: 1 });

/* 1. HERO ------------------------------------------------------------- */
const hero = (m) => band(C.cream, [
  decoMark(m.iconBlue, 520, pos.br(-120, -140), 0.06),
  grid([
    stack([
      pillLabel('Software + sensors for ditch & canal systems'),
      H1('Move the water.<br><span class="rf-underline">Keep the record.</span>', C.ink, 'left', {
        sizes: [62, 48, 40], lh: 1.02,
        settings: { custom_css: `selector .rf-underline { position: relative; display: inline-block; }\nselector .rf-underline::after { content: ""; position: absolute; left: 0; right: 0; bottom: -8px; height: 12px; background: url("${underlineSvg}") no-repeat center / 100% 100%; }` },
      }),
      text('RecordFLOW puts your maps, gauge readings, headgate changes and field notes in one place, online or off. Easy to use, affordable, and your data stays yours.', { size: 18, lh: 1.55, maxW: 500 }),
      row([
        btnPrimary('Start Risk-Free 7-day Trial', APP, { shadow: true }),
        textLink('See how it works →', '#product'),
      ], { settings: { margin: box(6, 0, 0, 0) } }),
      row([
        image(m.iconBlue, { width: 26, settings: { _element_width: 'initial', _element_custom_width: px(26) } }),
        label('Built by water managers, not tech insiders.', C.ink, 15, 600, { settings: { _element_width: 'auto' } }),
      ], { gap: 10, settings: { margin: box(8, 0, 0, 0), flex_wrap: 'nowrap' } }),
    ], { gap: 22, maxW: 560 }),
    container({ content_width: 'full', flex_direction: 'column', padding: box(14, 0, 0, 0), flex_gap: gap(0) }, [
      label('Offline ready · Syncs later', C.white, 11, 600, { ls: 0.88, transform: 'uppercase', settings: {
        _position: 'absolute', _offset_orientation_h: 'end', _offset_x_end: px(22), _offset_y: px(-14), _z_index: 2,
        _element_width: 'auto', _background_background: 'classic', _background_color: C.ink, _border_radius: box(999), _padding: box(7, 12, 7, 12),
      } }),
      image(m.heroComposite, { width: px(100, '%'), shadow: dropShadow }),
      row([
        iconList(['Interactive maps', 'Live river & sensor data', 'Field notes & photos'], { inline: true, space: 14, size: 12, weight: 400, settings: { _element_width: 'auto' } }),
        label('Phone · Tablet · Desktop', C.blue, 12, 600, { settings: { _element_width: 'auto' } }),
      ], { gap: 12, justify: 'space-between', settings: { padding: box(12, 4, 2, 4) } }),
    ]),
  ], { cols: [2, 2, 1], gap: 56, gapT: 36 }),
], { pad: [88, 96], dots: m.dots, gap: 0 });

/* 2. PARTNER LOGOS ----------------------------------------------------- */
const logos = (m) => band(C.white, [
  eyebrow('Trusted by ditch companies, districts and water professionals', C.muted, 'center'),
  widget('image-carousel', {
    carousel_name: 'Partner logos',
    carousel: m.partnerLogos,
    thumbnail_size: 'full', slides_to_show: '6', slides_to_show_tablet: '4', slides_to_show_mobile: '2',
    slides_to_scroll: '1', navigation: 'none', link_to: 'none', image_stretch: 'no',
    autoplay: 'yes', autoplay_speed: 1, speed: 4500, infinite: 'yes', pause_on_hover: 'yes', pause_on_interaction: 'no',
    image_spacing: 'custom', image_spacing_custom: px(56), image_spacing_custom_mobile: px(28),
    custom_css: `/* Continuous marquee: linear easing, faded edges, grayscale logos */
selector .swiper-wrapper { transition-timing-function: linear !important; }
selector .swiper { -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
selector .swiper-slide-image { width: 150px; height: 52px; object-fit: contain; filter: grayscale(1); opacity: .75; margin: 0 auto; }`,
  }),
], { pad: [34, 34], gap: 22, border: box(1, 0, 1, 0) });

/* 3. PRINCIPLES STRIP -------------------------------------------------- */
const principles = () => band(C.ink, [
  row([
    eyebrow('Three principles, every feature', C.eyebrowLight, 'left', { weight: 600 }),
    iconList(['Easy to use', 'Affordable', 'Secure'], {
      inline: true, icon: 'fas fa-circle', iconSize: 8, iconColor: C.bright, indent: 10, space: 40, color: C.white, family: HEAD, size: 20, weight: 600,
      settings: { _element_width: 'auto' },
    }),
    text('Works offline · No special hardware required', { color: C.mist, size: 14, inline: true }),
  ], { gap: 36, rowGap: 14, justify: 'space-between' }),
], { pad: [22, 22], gap: 0 });

/* 4. PROBLEM ----------------------------------------------------------- */
const problem = (m) => band(C.paleBlue, [
  grid([
    stack([
      eyebrow('The problem we remove'),
      H2('Nobody likes recordkeeping. Most of us do it anyway, badly.'),
      text("Readings on a notepad, photos on a phone, flow data in a spreadsheet, and the reasons behind each decision in one person's head. When the water changes, the answers are scattered. RecordFLOW puts them in one place, where the next manager can find them too."),
    ], { maxW: 480 }),
    grid([
      container({ content_width: 'full', flex_direction: 'column', flex_justify_content: 'space-between', flex_gap: gap(14), padding: box(24),
        background_background: 'classic', background_color: C.white, border_radius: box(12) }, [
        stack([
          eyebrow('Today', C.muted, 'left', { ls: 1.32 }),
          iconList(['Readings in a notepad', "Photos on someone's phone", 'Flows in a spreadsheet', 'Chalk notes on the headgate', 'The "why" in one person\'s head'],
            { icon: 'fas fa-minus', iconSize: 10, iconColor: C.borderDark, size: 15, weight: 400, space: 10 }),
        ], { gap: 14 }),
        text('When that person retires, the system goes with them.', { size: 13, lh: 1.5, settings: {
          _border_border: 'solid', _border_width: box(1, 0, 0, 0), _border_color: C.border, _padding: box(14, 0, 0, 0) } }),
      ]),
      container({ content_width: 'full', flex_direction: 'column', flex_justify_content: 'space-between', flex_gap: gap(14), padding: box(24),
        min_height: px(340), overflow: 'hidden', background_background: 'classic', background_color: C.ink, border_radius: box(12) }, [
        decoMark(m.iconWhite, 260, pos.br(-60, -60), 0.05),
        stack([
          eyebrow('With RecordFLOW', C.eyebrowLight, 'left', { ls: 1.32 }),
          label('One record. Every device. Everyone who needs it.', C.white, 22, 700, { family: HEAD, lh: 1.2 }),
        ], { gap: 14 }),
        row([
          image(m.phoneMap, { width: px(100, '%'), shadow: phoneShadow, settings: { _element_width: 'initial', _element_custom_width: px(30, '%') } }),
          image(m.phoneReadings, { width: px(100, '%'), shadow: phoneShadow, settings: { _element_width: 'initial', _element_custom_width: px(34, '%'), _margin: box(0, 0, 14, 0) } }),
          image(m.phoneDashboard, { width: px(100, '%'), shadow: phoneShadow, settings: { _element_width: 'initial', _element_custom_width: px(30, '%') } }),
        ], { gap: 14, align: 'flex-end', justify: 'center', settings: { flex_wrap: 'nowrap' } }),
      ]),
    ], { cols: ['minmax(0,1fr) minmax(0,1.4fr)', 'minmax(0,1fr) minmax(0,1.4fr)', '1fr'], gap: 18, align: 'stretch' }),
  ], { cols: [2, 1, 1], gap: 56, gapT: 40 }),
], { gap: 0 });

/* 5. PRODUCT: CREATE / COLLECT / CONNECT / CONTROL --------------------- */
const productCard = (n, icon, title, body) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(12), padding: box(28), min_height: px(220), overflow: 'hidden',
  background_background: 'classic', background_color: C.card, border_radius: box(12),
}, [
  row([
    label(n, C.eyebrowLight, 12, 600, { settings: { _element_width: 'auto' } }),
    widget('icon', { selected_icon: fa(icon), primary_color: C.bright, size: px(30), align: 'right', _element_width: 'auto' }),
  ], { justify: 'space-between', align: 'flex-start', settings: { flex_wrap: 'nowrap' } }),
  H3(title, C.white, { sizes: [22, 22, 21] }),
  text(body, { color: C.mist, size: 15 }),
]);

const product = (m) => band(C.ink, [
  decoMark(m.iconWhite, 420, pos.tr(-80, -60), 0.04),
  row([
    stack([eyebrow('What RecordFLOW does', C.eyebrowLight), H2('Your whole water system,<br>on a map you can write on.', C.white)], { gap: 14, maxW: 560 }),
    textLink('Product overview →', URL.product, { color: C.white, hover: C.eyebrowLight }),
  ], { justify: 'space-between', align: 'flex-end', gap: 24 }),
  grid([
    productCard('01', 'far fa-map', 'Create', 'Draw your ditches, laterals, headgates and measuring points on an interactive map. Build dashboards and custom workflows that match how your system actually runs.'),
    productCard('02', 'fas fa-pencil-alt', 'Collect', 'Log gauge readings, gate changes, photos and notes from the field, with or without cell service. Add FlowSENSE sensors for readings that arrive on their own.'),
    productCard('03', 'fas fa-wifi', 'Connect', 'Your data is always a click away for the people who need it: ditch riders in the truck, the board at the meeting, shareholders asking about their water.'),
    productCard('04', 'fas fa-shield-alt', 'Control', 'It is your data. You decide who can see it, edit it, or export it. US-based hosting and support, and no one sells your water information.'),
  ], { cols: [4, 2, 1], gap: 18, align: 'stretch' }),
], { gap: 44, anchor: 'product' });

/* 6. WHY / FOUNDER ----------------------------------------------------- */
const quote = (t) => label(t, C.ink, 19, 600, { family: HEAD, lh: 1.4, settings: {
  typography_font_style: 'italic', _border_border: 'solid', _border_width: box(0, 0, 0, 3), _border_color: C.blue,
  _padding: box(4, 0, 4, 20), _margin: box(6, 0, 0, 0) } });

const founder = (m) => band(C.cream, [
  grid([
    container({ content_width: 'full', flex_direction: 'column', padding: box(0), width: px(460), width_tablet: px(100, '%'), width_mobile: px(100, '%') }, [
      decoMark(m.iconBlue, 220, pos.tr(-70, -80), 0.18),
      image(m.blake, { width: px(100, '%'), height: [460, 460, 400], radius: 12, objPos: 'top center' }),
      label('Blake Osborn · Founder & Water Manager', C.white, 13, 600, { settings: {
        _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(24), _offset_orientation_v: 'end', _offset_y_end: px(-16), _z_index: 2,
        _element_width: 'auto', _background_background: 'classic', _background_color: C.ink, _border_radius: box(6), _padding: box(10, 16, 10, 16),
        _box_shadow_box_shadow_type: 'yes', _box_shadow_box_shadow: { horizontal: 0, vertical: 8, blur: 20, spread: 0, color: 'rgba(16,24,40,0.25)' } } }),
    ]),
    stack([
      eyebrow('Why RecordFLOW'),
      H2('Built by water managers.<br>Not tech insiders.'),
      text('RecordFLOW started with a notepad and pencil. Our founder is a working water manager in Colorado who could not find a single tool that answered four questions: Do we have enough information to act? Do we have the right tool to do the job efficiently? Can we reach our data in the field? Can we capture every kind of data, from photos to flow measurements? So we built one.'),
      quote('"We are not a technology company. We are a water management platform that happens to run on software."'),
      eyebrow('Blake Osborn · Founder', C.slate, 'left', { ls: 1.32 }),
      textLink('Read our story →', URL.about, { color: C.blue, hover: C.blueHover }),
    ], { maxW: 520 }),
  ], { cols: [2, 2, 1], gap: 56, gapT: 40, gapM: 48 }),
], { gap: 0, anchor: 'about' });

/* 7. LEGACY BAND ------------------------------------------------------- */
const legacy = (m) => band(C.ink, [
  decoMark(m.iconWhite, 420, pos.bl(-80, -100), 0.04),
  grid([
    image(m.phoneProps, { width: px(100, '%'), maxW: 260, shadow: '0 20px 40px rgba(0,0,0,0.5)' }),
    stack([
      image(m.iconBlue, { width: 64 }),
      text('Every gate turn is a decision. RecordFLOW keeps the reading, the photo, and the reason, so the next water manager understands why the system runs the way it does.',
        { family: HEAD, size: [30, 26, 22], weight: 500, lh: 1.3, color: C.white, align: 'center' }),
      text('"1 turn will raise water 1 inch." Notes like these used to live on the headgate. Now they live in the record.', { size: 14, color: C.eyebrowLight, align: 'center' }),
    ], { gap: 22, align: 'center' }),
    image(m.geospatial, { width: px(100, '%'), maxW: 340, radius: 10, settings: {
      image_box_shadow_box_shadow_type: 'yes', image_box_shadow_box_shadow: { horizontal: 0, vertical: 20, blur: 40, spread: 0, color: 'rgba(0,0,0,0.5)' } } }),
  ], { cols: [3, 1, 1], gap: 40 }),
], { pad: [88, 88], gap: 0 });

/* 8. WHO USES ---------------------------------------------------------- */
const whoUses = (m) => band(C.white, [
  grid([
    stack([
      eyebrow('Who uses RecordFLOW'),
      H2('From one headgate to an entire district.'),
      checkList(['Individual water rights owners', 'Irrigation districts', 'Shareholders', 'Drainage districts', 'Mutual ditch companies', 'Irrigation laterals'], [2, 2, 1]),
      widget('divider', { color: C.border, weight: px(1), gap: px(6) }),
      row(['Ditch riders', 'Board members', 'Farmers', 'Ranchers', 'District managers', 'Engineers'].map(tag), { gap: 8 }),
      text('Large organizations cut duplicate data entry and get field information in minutes, not hours. Individuals get an affordable plan that needs no expertise and no special hardware.', { size: 16 }),
    ], { gap: 22, maxW: 520 }),
    container({ content_width: 'full', flex_direction: 'column', padding: box(0, 0, 60, 60), padding_mobile: box(0, 0, 40, 28) }, [
      image(m.fieldHeadgate, { width: px(100, '%'), height: [520, 460, 380], radius: 12 }),
      image(m.canalPhone, { width: px(100, '%'), settings: {
        _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(0), _offset_orientation_v: 'end', _offset_y_end: px(0), _z_index: 2,
        _element_width: 'initial', _element_custom_width: px(46, '%'),
        space: px(260), image_border_border: 'solid', image_border_width: box(6), image_border_color: C.white, image_border_radius: box(12),
        image_box_shadow_box_shadow_type: 'yes', image_box_shadow_box_shadow: { horizontal: 0, vertical: 20, blur: 50, spread: 0, color: 'rgba(16,24,40,0.3)' } } }),
    ]),
  ], { cols: [2, 1, 1], gap: 56, gapT: 48 }),
], { gap: 0 });

/* 9. ROI --------------------------------------------------------------- */
const roiCard = (big, lbl, body, dark = false) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(8), padding: box(28),
  background_background: 'classic', background_color: dark ? C.ink : C.white, border_radius: box(12),
  ...(dark ? {} : { border_border: 'solid', border_width: box(3, 0, 0, 0), border_color: C.blue }),
}, [
  stat(big, dark ? C.white : C.ink),
  label(lbl, dark ? C.white : C.ink, 15, 600, { lh: 1.4 }),
  text(body, { size: 14, lh: 1.55, color: dark ? C.mist : C.slate }),
]);

const roi = (m) => band(C.cream, [
  decoMark(m.iconBlue, 480, pos.tr(-140, -120), 0.05),
  grid([
    stack([eyebrow('Return on investment'), H2('Pays for itself the first time someone asks "what did we do last year?"')], { gap: 14, maxW: 520 }),
    text('Hours spent re-entering notes, hunting for photos and rebuilding spreadsheets add up fast. RecordFLOW replaces that work with one record that is already organized, searchable and shareable.', { maxW: 460 }),
  ], { cols: [2, 1, 1], gap: 40, gapT: 24, align: 'end' }),
  grid([
    roiCard('XX hrs', 'saved per week on data entry', 'Field readings go straight into the record. No evening at the desk copying them over.'),
    roiCard('XX sec', 'to log a reading from the truck', 'Tap the asset on the map, enter the number, add a photo. Done, even without signal.'),
    roiCard(`$49<span style="font-size:20px;color:${C.slate};font-weight:500">/yr</span>`, 'starting price, no hardware required', 'Enterprise SCADA and telemetry systems start at $X,XXX plus installation and contracts.'),
    roiCard('0', 'records lost when a manager retires', 'The reading, the photo and the reason stay with the ditch, not with the person.', true),
  ], { cols: [4, 2, 1], gap: 18, align: 'stretch' }),
  text('Figures shown are placeholders pending real customer data.', { size: 13, color: C.muted }),
], { gap: 48, gapM: 36, anchor: 'roi' });

/* 10. FLOWSENSE -------------------------------------------------------- */
const flowsense = (m) => band(C.paleBlue, [
  grid([
    container({ content_width: 'full', flex_direction: 'column', padding: box(0, 70, 0, 0), padding_mobile: box(0, 40, 30, 0) }, [
      image(m.flowsenseDevice, { width: px(100, '%'), shadow: dropShadow }),
      image(m.phoneAddAsset, { width: px(100, '%'), shadow: '0 16px 32px rgba(16,24,40,0.3)', settings: {
        _position: 'absolute', _offset_orientation_h: 'end', _offset_x_end: px(0), _offset_orientation_v: 'end', _offset_y_end: px(-40), _z_index: 2,
        _element_width: 'initial', _element_custom_width: px(34, '%'), space: px(200) } }),
    ]),
    stack([
      eyebrow('Hardware · FlowSENSE'),
      H2('Readings that show up before you do.'),
      text('FlowSENSE is our field sensor for ditches and canals. Install it at a flume or headgate and water levels and flows post straight to your RecordFLOW map. Pair it with real-time river levels in Colorado and you have the whole picture on one screen.'),
      row([
        button('FlowSENSE product page', URL.flowsense, 'navy', { size: 15, pad: box(13, 20, 13, 20) }),
        textLink('Watch how-to videos →', URL.videos, { padY: 13 }),
      ], { gap: 14, settings: { margin: box(4, 0, 0, 0) } }),
    ], { maxW: 520 }),
  ], { cols: [2, 1, 1], gap: 56, gapT: 56 }),
], { gap: 0, anchor: 'flowsense' });

/* 11. TRIAL CTA + FORM ------------------------------------------------- */
const trialStat = (big, small) => stack([
  label(big, C.white, 30, 700, { family: HEAD, lh: 1.2 }),
  label(small, C.mist, 13, 400, { lh: 1.4 }),
], { gap: 2, settings: { width: auto, width_tablet: auto, width_mobile: auto } });

const fieldStyle = {
  field_text_color: C.ink, field_background_color: C.white, field_border_color: C.borderDark, field_border_width: box(1), field_border_radius: box(6),
  ...typo('field_typography', BODY, 14, 400),
  column_gap: px(10), row_gap: px(10),
};
const formButton = (bg, hover) => ({
  button_background_color: bg, button_text_color: C.white, button_background_hover_color: hover, button_hover_color: C.white,
  button_border_radius: box(6), ...typo('button_typography', BODY, 15, 600), button_text_padding: box(13, 20, 13, 20),
});
const fld = (custom_id, field_type, placeholder, width, extra = {}) => ({
  _id: id(), custom_id, field_type, field_label: placeholder, placeholder, width, width_tablet: width, width_mobile: extra.widthM || width, ...extra,
});

const trial = (m) => band(C.ink, [
  decoMark(m.iconWhite, 420, pos.bl(-60, -120), 0.04),
  grid([
    stack([
      eyebrow('Get started today', C.eyebrowLight),
      H2('Ready to start your free trial?', C.white, 'left', { sizes: [50, 40, 32], lh: 1.05 }),
      text('Keep your water information private, improve your operations, and protect your water rights. Seven days, no card required, cancel anytime.', { color: C.mist }),
      row([
        trialStat(`$49<span style="font-size:15px;color:${C.eyebrowLight};font-weight:500">/year</span>`, 'Plans start here'),
        trialStat('7 days', 'Risk-free trial'),
        trialStat('US', 'Based support, Colorado'),
      ], { gap: 28, align: 'flex-start', settings: { margin: box(6, 0, 0, 0) } }),
    ], { maxW: 520 }),
    container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(30), padding_mobile: box(24),
      background_background: 'classic', background_color: C.white, border_radius: box(14),
      box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 24, blur: 60, spread: 0, color: 'rgba(0,0,0,0.3)' } }, [
      H3('Start your risk-free trial', C.ink),
      text('Create your account at app.myrecordflow.com. Have a question first? Send us a note and a water manager will reply.', { size: 14, lh: 1.5 }),
      btnPrimary('Start Risk-Free 7-day Trial', APP, { align: 'justify' }),
      widget('divider', { look: 'line_text', text: 'or ask a question', color: C.border, weight: px(1), text_color: C.muted, gap: px(2),
        ...typo('typography', BODY, 12, 400), text_spacing: px(12), html_tag: 'span' }),
      widget('form', {
        form_name: 'Homepage question',
        form_fields: [
          fld('name', 'text', 'Name', '50', { widthM: '100' }), fld('organization', 'text', 'Organization', '50', { widthM: '100' }),
          fld('email', 'email', 'Email', '100', { required: 'true' }),
          fld('message', 'textarea', "Tell us about your system and what you're keeping track of today", '100', { rows: 3 }),
        ],
        show_labels: '', input_size: 'sm', button_text: 'Send message', button_width: '100', button_size: 'sm',
        submit_actions: ['email'], email_subject: 'New question from the RecordFLOW homepage',
        success_message: 'Thanks! A water manager will reply soon.',
        ...fieldStyle, ...formButton(C.ink, C.blue),
      }),
    ]),
  ], { cols: [2, 1, 1], gap: 56, gapT: 48 }),
], { gap: 0, anchor: 'contact' });

/* 12. FAQ -------------------------------------------------------------- */
const FAQ = [
  ['Does RecordFLOW work without cell service?', 'Yes. Placeholder answer: readings, photos and notes are saved on your phone or tablet and sync automatically the next time you have a connection.'],
  ['What does it cost?', 'Placeholder answer: plans start at $49 per year for individuals. District and company plans are priced by the number of users and assets.'],
  ['Who owns my data?', 'Placeholder answer: you do. You control who can view, edit or export it, and you can export everything at any time.'],
  ['Do I need FlowSENSE hardware to use RecordFLOW?', 'Placeholder answer: no. RecordFLOW runs on the phone, tablet or computer you already have. FlowSENSE is optional for sites where you want readings to arrive automatically.'],
  ['Can I bring in records I already have?', 'Placeholder answer: yes. Spreadsheets, photos and map files can be imported so your history starts on day one.'],
  ['What happens after the 7-day trial?', 'Placeholder answer: pick a plan to keep going, or walk away. No card is required for the trial and nothing is charged automatically.'],
];

const faqAccordion = () => ({
  id: id(), elType: 'widget', widgetType: 'nested-accordion',
  settings: {
    items: FAQ.map(([q]) => ({ _id: id(), item_title: q })),
    default_state: 'expanded', max_items_expended: 'one', title_tag: 'h3', faq_schema: 'yes',
    accordion_item_title_icon: fa('fas fa-plus'), accordion_item_title_icon_active: fa('fas fa-times'),
    accordion_item_title_position_horizontal: 'stretch', accordion_item_title_icon_position: 'end',
    accordion_item_title_space_between: px(0), accordion_item_title_distance_from_content: px(0),
    accordion_border_normal_border: 'solid', accordion_border_normal_width: box(0, 0, 1, 0), accordion_border_normal_color: C.border,
    accordion_border_hover_border: 'solid', accordion_border_hover_width: box(0, 0, 1, 0), accordion_border_hover_color: C.border,
    accordion_border_active_border: 'solid', accordion_border_active_width: box(0, 0, 1, 0), accordion_border_active_color: C.border,
    accordion_border_radius: box(0), accordion_padding: box(20, 0, 20, 0),
    ...typo('title_typography', HEAD, [19, 19, 17], 600, { lh: 1.3 }),
    normal_title_color: C.ink, hover_title_color: C.blue, active_title_color: C.ink,
    icon_size: px(12), icon_spacing: px(20), normal_icon_color: C.blue, hover_icon_color: C.blue, active_icon_color: C.blue,
    content_border_border: 'solid', content_border_width: box(0, 0, 1, 0), content_border_color: C.border, content_border_radius: box(0),
    content_padding: box(0, 48, 22, 0), content_padding_mobile: box(0, 0, 20, 0),
    custom_css: `selector { border-top: 1px solid ${C.border}; }
selector .e-n-accordion-item-title-icon { flex: none; width: 28px; height: 28px; border-radius: 50%; background: ${C.pill}; display: inline-flex; align-items: center; justify-content: center; }
selector .e-n-accordion-item[open] > .e-n-accordion-item-title { border-bottom: 0; }`,
  },
  elements: FAQ.map(([, a]) => container({ content_width: 'full', flex_direction: 'column', padding: box(0) }, [text(a, { size: 15 })])),
});

const faq = () => band(C.white, [
  grid([
    stack([
      eyebrow('Frequently asked'),
      H2('Questions we hear at the headgate.'),
      text('<p>Don\'t see yours? <a href="#contact"><strong>Send us a note</strong></a> and a water manager will answer.</p>', { size: 16 }),
    ], { gap: 14, maxW: 420 }),
    faqAccordion(),
  ], { cols: ['minmax(0,420px) minmax(0,1fr)', '1fr', '1fr'], gap: 56, gapT: 40, align: 'start' }),
], { gap: 0, anchor: 'faq' });

module.exports = {
  slug: 'home', title: 'Home',
  build: (m) => [hero(m), logos(m), principles(), problem(m), product(m), founder(m), legacy(m), whoUses(m), roi(m), flowsense(m), trial(m), faq()],
};
