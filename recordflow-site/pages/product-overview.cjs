const L = require('../lib.cjs');
const { C, HEAD, APP, URL, px, box, gap, typo, fa, container, widget, band, stack, row, eyebrow, H2, text, btnPrimary, textLink, image, subHero, ctaBand, sectionHead, checkList } = L;

/* Interactive "app tour" (client request, modeled on onxmaps.com/offroad/app):
   feature boxes either side of a phone; clicking a box shows its screen on the phone.
   Boxes (class rf-feature) and screens (class rf-screen) are matched by order, 1–6.
   The click behaviour comes from the "RecordFLOW feature switcher" snippet in Elementor > Custom Code. */
const FEATURES = [
  ['Create', 'far fa-map', 'Draw ditches, laterals, headgates, flumes and measuring points on an interactive map.', 'phoneMap'],
  ['Collect', 'fas fa-pencil-alt', 'Log gauge readings, gate changes, photos and notes from the truck, with or without signal.', 'phoneReadings'],
  ['Dashboards', 'fas fa-chart-line', 'River levels, sensor data and recent field entries on one screen for the board.', 'phoneDashboard'],
  ['Asset records', 'fas fa-clipboard-list', 'Every headgate keeps its details, photos, documents and notes in one place.', 'phoneProps'],
  ['FlowSENSE sensors', 'fas fa-broadcast-tower', 'Add a sensor as a digital asset and its readings post to your map automatically.', 'phoneAddAsset'],
  ['Sharing & control', 'fas fa-shield-alt', 'Riders edit, board members view, shareholders see their own water. Your data is never sold.', 'phoneLogin'],
];

const featureBox = (n, [title, icon, body]) => container({
  _title: `Feature ${n} – ${title}`, css_classes: 'rf-feature',
  content_width: 'full', flex_direction: 'column', flex_gap: gap(8), padding: box(22, 24, 22, 24), padding_mobile: box(16, 18, 16, 18),
  border_radius: box(12),
}, [
  row([
    widget('heading', { title, header_size: 'h3', title_color: C.ink, _element_width: 'auto', ...typo('typography', HEAD, [22, 21, 19], 700, { lh: 1.2 }) }),
    widget('icon', { selected_icon: fa(icon), primary_color: C.blue, size: px(24), size_mobile: px(20), align: 'right', _element_width: 'auto' }),
  ], { justify: 'space-between', align: 'center', settings: { flex_wrap: 'nowrap' } }),
  text(body, { size: 15, lh: 1.55, settings: { _css_classes: 'rf-feature-desc' } }),
]);

const featureCol = (items, offset) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(14), flex_gap_mobile: gap(8), flex_justify_content: 'center', padding: box(0),
  width: px(32, '%'), width_tablet: px(100, '%'), width_mobile: px(100, '%'),
}, items.map((f, i) => featureBox(offset + i + 1, f)));

const SWITCHER_CSS = `/* Feature switcher styling. Order matters: box 1 shows screen 1, and so on. */
selector .rf-feature { cursor: pointer; transition: background-color .25s, box-shadow .25s, opacity .25s; }
selector.rf-ready .rf-feature { opacity: .55; }
selector.rf-ready .rf-feature:hover { opacity: .85; }
selector.rf-ready .rf-feature.is-active { opacity: 1; background: #fff; box-shadow: 0 18px 40px rgba(16,24,40,.12); }
selector .rf-feature:focus-visible { outline: 2px solid ${C.blue}; outline-offset: 2px; }
selector .rf-phone { display: grid !important; }
selector .rf-phone > .elementor-element { grid-area: 1 / 1; }
selector.rf-ready .rf-screen { opacity: 0; transform: translateY(8px); transition: opacity .35s, transform .35s; pointer-events: none; }
selector.rf-ready .rf-screen.is-active { opacity: 1; transform: none; }
selector .rf-screen img { filter: drop-shadow(0 24px 40px rgba(16,24,40,.25)); }
/* Tablet + mobile: phone on top, compact list; only the selected feature shows its description. */
@media (max-width: 1024px) { selector.rf-ready .rf-feature:not(.is-active) .rf-feature-desc { display: none; } }`;

const appSwitcher = (m) => band(C.paleBlue, [
  sectionHead('Inside the app', 'Tap a feature to see it on the screen.', { align: 'center', maxW: 640 }),
  container({
    content_width: 'full', width: px(100, '%'), flex_direction: 'row', flex_direction_tablet: 'column', flex_direction_mobile: 'column',
    flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(28), flex_gap_tablet: gap(14), flex_gap_mobile: gap(8), padding: box(0),
  }, [
    featureCol(FEATURES.slice(0, 3), 0),
    container({
      _title: 'Phone screens (order = feature order)', css_classes: 'rf-phone',
      content_width: 'full', width: px(30, '%'), width_tablet: px(260), width_mobile: px(220), padding: box(0),
      _flex_order_tablet: 'start', _flex_order_mobile: 'start', margin_tablet: box(0, 0, 14, 0), margin_mobile: box(0, 0, 12, 0),
    }, FEATURES.map(([title, , , key], i) => image(m[key], { width: px(100, '%'), settings: { _title: `Screen ${i + 1} – ${title}`, _css_classes: 'rf-screen' } }))),
    featureCol(FEATURES.slice(3), 3),
  ]),
], { anchor: 'app-tour', gap: 48, gapM: 32, align: 'center', settings: { css_classes: 'rf-switcher', custom_css: SWITCHER_CSS } });


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
    appSwitcher(m),
    band(C.cream, [
      sectionHead('Everything included', 'Feature checklist', { maxW: 0 }),
      checkList(['Interactive maps', 'Offline data collection', 'Photo & note capture', 'Gauge reading log', 'Headgate change history', 'Custom dashboards',
        'Real-time Colorado river data', 'FlowSENSE sensor integration', 'Role-based sharing', 'Data export', 'US-based hosting & support', 'Works on phone, tablet, desktop'],
      [4, 2, 1], { rowGap: 12, colGap: 32 }),
    ]),
    ctaBand(m),
  ],
};
