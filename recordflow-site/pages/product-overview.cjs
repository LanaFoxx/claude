const L = require('../lib.cjs');
const { C, APP, URL, px, band, stack, row, grid, eyebrow, H2, text, btnPrimary, textLink, image, subHero, ctaBand, darkCard, sectionHead, checkList } = L;

const phone = (media) => image(media, { width: [px(60, '%'), px(60, '%'), px(70, '%')], maxW: 280, shadow: '0 20px 40px rgba(16,24,40,0.25)' });
const copy = (eb, title, body) => stack([eyebrow(eb), H2(title), text(body)], { maxW: 520 });

module.exports = {
  slug: 'product-overview', title: 'Product Overview',
  build: (m) => [
    subHero(m, 'Product Overview', 'Your whole water system, on a map you can write on.',
      'Placeholder: RecordFLOW combines interactive maps, field data collection, dashboards and sharing in one tool that works on any device, online or off.', [
        row([btnPrimary('Start Risk-Free 7-day Trial', APP, { shadow: true }), textLink('Watch the videos →', URL.videos)], { justify: 'center' }),
        image(m.heroComposite, { width: px(100, '%'), maxW: 900, shadow: '0 24px 40px rgba(16,24,40,0.22)', settings: { _margin: L.box(32, 0, 0, 0), _element_width: 'inherit' } }),
      ]),
    band(C.white, [grid([
      copy('01 · Create', 'Map it the way it really runs.', 'Placeholder: draw ditches, laterals, headgates, flumes and measuring points. Attach documents, photos and notes to any asset. Build dashboards that answer the questions your board asks.'),
      phone(m.phoneMap),
    ], { cols: [2, 2, 1] })], { gap: 0 }),
    band(C.paleBlue, [grid([
      phone(m.phoneReadings),
      copy('02 · Collect', 'Log it from the truck, not the desk.', 'Placeholder: gauge readings, gate changes, photos and notes save on your device and sync when you have signal. FlowSENSE sensors post readings automatically.'),
    ], { cols: [2, 2, 1] })], { gap: 0 }),
    band(C.ink, [
      sectionHead('03 · Connect    04 · Control', "Share what matters. Keep what's yours.", { dark: true }),
      grid([
        darkCard('Dashboards', 'Live view for the board', 'Placeholder: river levels, sensor data and recent field entries on one screen.'),
        darkCard('Sharing', 'Role-based access', 'Placeholder: riders edit, board members view, shareholders see their own water.'),
        darkCard('Export', 'Your data, any time', 'Placeholder: export spreadsheets, maps and photos whenever you want.'),
        darkCard('Hosting', 'US-based, private', 'Placeholder: hosted in the US, never sold, never shared without your say.'),
      ], { cols: [4, 2, 1], gap: 18, align: 'stretch' }),
    ]),
    band(C.cream, [
      sectionHead('Everything included', 'Feature checklist', { maxW: 0 }),
      checkList(['Interactive maps', 'Offline data collection', 'Photo & note capture', 'Gauge reading log', 'Headgate change history', 'Custom dashboards',
        'Real-time Colorado river data', 'FlowSENSE sensor integration', 'Role-based sharing', 'Data export', 'US-based hosting & support', 'Works on phone, tablet, desktop'],
      [4, 2, 1], { rowGap: 12, colGap: 32 }),
    ]),
    ctaBand(m),
  ],
};
