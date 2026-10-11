const L = require('../lib.cjs');
const { C, HEAD, px, box, gap, typo, container, widget, band, stack, eyebrow, H2, decoMark, subHero, ctaBand, URL } = L;

const VIDEOS = [
  'Create your account', 'Draw your first ditch on the map', 'Log a gauge reading offline',
  'Add photos and notes to a headgate', 'Build a dashboard for the board', 'Share access with ditch riders',
  'Install FlowSENSE at a flume', 'Export your records',
];

// Each card: navy container (gradient overlay, faint mark, "VIDEO 0X" label, title) with an Elementor
// Video widget stretched over it. Paste the YouTube link into that Video widget ("Video n") and clicking
// the card opens the video in a pop-up (lightbox). With no link the card simply isn't clickable.
const VIDEO_URLS = process.env.RF_TEST_VIDEO ? VIDEOS.map(() => process.env.RF_TEST_VIDEO) : VIDEOS.map(() => '');

const videoPopup = (m, n, url) => widget('video', {
  _title: `Video ${n} – paste YouTube link here`,
  video_type: 'youtube', youtube_url: url, show_image_overlay: 'yes', image_overlay: m.transparent, image_overlay_size: 'full',
  lightbox: 'yes', show_play_icon: 'yes', play_icon_color: 'rgba(255,255,255,0.92)', play_icon_size: px(54),
  aspect_ratio: '169', modestbranding: 'yes', rel: 'no', controls: 'yes',
  _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(0), _offset_orientation_v: 'start', _offset_y: px(0),
  _element_width: 'initial', _element_custom_width: px(100, '%'), _z_index: 1,
  custom_css: `selector { inset: 0; height: 100%; }
selector .elementor-wrapper, selector .elementor-custom-embed-image-overlay { height: 100%; aspect-ratio: auto; background-color: transparent !important; }
selector .elementor-custom-embed-play { transition: transform .2s; }
selector:hover .elementor-custom-embed-play { transform: translate(-50%, -50%) scale(1.08); }`,
});

const videoCard = (m, n, title) => container({
  content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_gap: gap(6),
  min_height: px(206), min_height_tablet: px(200), min_height_mobile: px(190),
  padding: box(22), overflow: 'hidden',
  background_background: 'classic', background_color: C.ink,
  background_overlay_background: 'gradient', background_overlay_color: 'rgba(16,24,40,0)', background_overlay_color_stop: px(40, '%'),
  background_overlay_color_b: 'rgba(16,24,40,0.85)', background_overlay_color_b_stop: px(100, '%'),
  background_overlay_gradient_type: 'linear', background_overlay_gradient_angle: px(180, 'deg'),
  border_radius: box(12), css_classes: 'rf-video-card',
  custom_css: 'selector > .elementor-widget-heading { position: relative; z-index: 2; pointer-events: none; }',
}, [
  decoMark(m.iconWhite, 160, L.pos.tr(-30, -30), 0.06),
  videoPopup(m, n, VIDEO_URLS[n - 1]),
  eyebrow(`Video ${String(n).padStart(2, '0')}`, C.eyebrowLight),
  widget('heading', { title, header_size: 'h3', title_color: C.white, ...typo('typography', HEAD, [20, 20, 19], 600, { lh: 1.2 }) }),
]);

module.exports = {
  slug: 'how-to-videos', title: 'How-To Videos',
  build: (m) => [
    subHero(m, 'How-To Videos', 'Learn RecordFLOW in a few short videos.',
      `<p>Placeholder: step-by-step walkthroughs from setting up your map to installing FlowSENSE. Also on <a href="${URL.youtube}" target="_blank" rel="noopener">YouTube</a>.</p>`),
    band(C.white, [
      stack([eyebrow('Video Library'), H2('Short walkthroughs, start to finish.')], { gap: 14, maxW: 560 }),
      L.grid(VIDEOS.map((t, i) => videoCard(m, i + 1, t)), { cols: [3, 2, 1], gap: 28, gapT: 22, gapM: 18, align: 'stretch' }),
    ], { gapM: 32 }),
    ctaBand(m),
  ],
};
