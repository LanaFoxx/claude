const L = require('../lib.cjs');
const { C, HEAD, BODY, URL, px, box, gap, auto, typo, container, widget, band, stack, row, grid, eyebrow, H2, H3, text, btnPrimary, textLink, image, decoMark, pos, subHero, ctaBand, darkCard, sectionHead } = L;

const step = (n, title, body, last = false) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_gap: gap(22), padding: box(0), flex_align_items: 'stretch',
}, [
  container({ content_width: 'full', width: px(56), width_tablet: px(56), width_mobile: px(48), _flex_size: 'none', flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(8), padding: box(0) }, [
    widget('heading', {
      title: n, header_size: 'span', title_color: C.white, align: 'center', ...typo('typography', HEAD, [20, 20, 18], 700, { lh: 1 }),
      _element_width: 'initial', _element_custom_width: px(56), _element_custom_width_mobile: px(48),
      _padding: box(18, 0, 18, 0), _padding_mobile: box(15, 0, 15, 0), _background_background: 'classic', _background_color: C.blue, _border_radius: box(999),
      _box_shadow_box_shadow_type: 'yes', _box_shadow_box_shadow: { horizontal: 0, vertical: 8, blur: 20, spread: 0, color: 'rgba(11,87,208,0.25)' },
    }),
    ...(last ? [] : [container({ content_width: 'full', width: px(2), width_tablet: px(2), width_mobile: px(2), min_height: px(36), _flex_size: 'grow', padding: box(0),
      border_border: 'dashed', border_width: box(0, 0, 0, 2), border_color: 'rgba(11,87,208,0.5)' })]),
  ]),
  stack([H3(title, C.ink, { sizes: [24, 24, 21] }), text(body, { size: 16, maxW: 420 })], { gap: 8, settings: { padding: box(12, 0, last ? 0 : 40, 0) } }),
]);

const spec = (k, v) => [text(k, { size: 15, color: C.slate }), text(v, { size: 15, weight: 600, color: C.ink })];

module.exports = {
  slug: 'flowsense', title: 'FlowSENSE',
  build: (m) => [
    subHero(m, 'Hardware · FlowSENSE', 'Readings that show up before you do.',
      'Placeholder: FlowSENSE is a solar-powered field sensor for ditches and canals. Install it at a flume or headgate and levels and flows post straight to your RecordFLOW map.', [
        row([btnPrimary('Request a quote', URL.contact, { shadow: true }), textLink('Installation video →', URL.videos)], { justify: 'center' }),
        image(m.flowsenseDevice, { width: px(100, '%'), maxW: 720, shadow: '0 24px 40px rgba(16,24,40,0.22)', settings: { _margin: box(32, 0, 0, 0), _element_width: 'inherit' } }),
      ]),
    band(C.cream, [
      decoMark(m.iconBlue, 460, pos.bl(-140, -140), 0.05),
      grid([
        stack([
          sectionHead('How it works', 'Install. Pair.<br>Forget about it.', { maxW: 0 }),
          stack([
            step('01', 'Mount at the flume', 'Placeholder: bolt the bracket, point the sensor at the water, and connect the solar panel. Most sites are done in under an hour.'),
            step('02', 'Pair in the app', 'Placeholder: open RecordFLOW on your phone, add the sensor as a digital asset on your map, and it starts reporting.'),
            step('03', 'Readings arrive', 'Placeholder: level and flow post on the schedule you set. Alerts go out when something changes.', true),
          ], { gap: 0 }),
        ], { gap: 36 }),
        container({ content_width: 'full', flex_direction: 'column', padding: box(0, 0, 56, 0) }, [
          image(m.fieldHeadgate, { width: px(100, '%'), height: [560, 480, 380], radius: 12 }),
          container({
            content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto, flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'center', flex_gap: gap(18),
            padding: box(20, 24, 20, 24), padding_mobile: box(16, 18, 16, 18), background_background: 'classic', background_color: C.ink, border_radius: box(12),
            box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 20, blur: 50, spread: 0, color: 'rgba(16,24,40,0.3)' },
            position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(28), _offset_x_mobile: px(16), _offset_orientation_v: 'end', _offset_y_end: px(0), z_index: 2,
            custom_css: 'selector { max-width: calc(100% - 56px); }',
          }, [
            image(m.phoneAddAsset, { width: [72, 72, 52], settings: { _element_width: 'initial', _element_custom_width: px(72), _element_custom_width_mobile: px(52), _flex_size: 'none' } }),
            stack([
              eyebrow('Live on your map', C.eyebrowLight, 'left', { ls: 1.32 }),
              widget('heading', { title: 'Cross Creek Flume · 2.3 ft · 44.2 cfs', header_size: 'p', title_color: C.white, ...typo('typography', HEAD, [20, 20, 16], 600, { lh: 1.2 }) }),
              text('Placeholder reading · updated 10 min ago', { size: 13, color: C.mist, lh: 1.4 }),
            ], { gap: 4 }),
          ]),
        ]),
      ], { cols: [2, 1, 1], gap: 64, gapT: 48 }),
    ], { gap: 0 }),
    band(C.paleBlue, [grid([
      stack([
        eyebrow('Specifications'), H2('Built for the ditch bank.'),
        grid([
          ...spec('Power', 'Solar + battery (placeholder)'), ...spec('Connectivity', 'Cellular / LoRa (placeholder)'),
          ...spec('Measures', 'Water level, flow, temperature (placeholder)'), ...spec('Range', '0–X ft (placeholder)'),
          ...spec('Enclosure', 'Weatherproof, rated for freeze (placeholder)'), ...spec('Warranty', 'X years (placeholder)'),
        ], { cols: ['auto 1fr', 'auto 1fr', 'auto 1fr'], gap: 24, rowGap: 12, gapM: 16, align: 'start' }),
      ], { maxW: 520 }),
      image(m.phoneAddAsset, { width: [px(60, '%'), px(60, '%'), px(70, '%')], maxW: 280, shadow: '0 20px 40px rgba(16,24,40,0.25)' }),
    ], { cols: [2, 2, 1] })], { gap: 0 }),
    band(C.ink, [
      sectionHead('Pricing', 'Simple hardware pricing.', { dark: true }),
      grid([
        darkCard('Device', '$X,XXX', 'Placeholder: one-time cost per sensor, bracket and install kit included.'),
        darkCard('Data plan', '$XX / month', 'Placeholder: cellular data and RecordFLOW integration per sensor.'),
        darkCard('Install', 'Optional', 'Placeholder: we install, or you do with the how-to video.'),
      ].map((c) => { c.elements[0].settings.typography_text_transform = 'uppercase'; return c; }), { cols: [3, 2, 1], gap: 18, align: 'stretch' }),
    ]),
    ctaBand(m),
  ],
};
