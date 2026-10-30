// Need A Website? (/need-a-website/) – Tax Pro Design. Copy supplied by the client (Oct 2026).
// Navy hero with laptop slideshow, six feature icons, portfolio grid (browser-frame cards), four steps, navy CTA card.
const L = require('../lib.cjs');
const { C, HEAD, BODY, px, box, gap, auto, typo, container, widget, cls, band, stack, row, grid, linkBox, eyebrow, heading, H2, text, image, pill } = L;

const TPD = 'http://taxprodesign.com/';

// Two-line button (big label + small note), gold or navy outline, as in the design.
function cta2(big, small, variant, o = {}) {
  const gold = variant === 'gold';
  return linkBox(TPD, {
    content_width: 'full', width: o.full ? px(100, '%') : auto, width_mobile: px(100, '%'), flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(2),
    padding: box(o.padY ?? 16, 32, o.padY ?? 16, 32), padding_mobile: box(o.padY ?? 16, 20, o.padY ?? 16, 20), border_radius: box(12),
    background_background: 'classic', background_color: gold ? C.gold : C.navy2,
    ...(gold ? {} : { border_border: 'solid', border_width: box(1), border_color: C.navyLine }),
    ...cls(`ctc-cta ${gold ? 'ctc-cta-gold' : 'ctc-cta-navy'}`),
  }, [
    widget('heading', { title: big, header_size: 'span', align: 'center', title_color: C.white, ...typo('typography', HEAD, [24, 23, 21], 700, { lh: 1.1, ls: 0 }) }),
    widget('heading', { title: small, header_size: 'span', align: 'center', title_color: C.white, ...typo('typography', HEAD, 15, 300, { lh: 1.2, ls: 0 }) }),
  ]);
}

// Laptop (Elementor containers + CSS in chrome.cjs) cycling through the portfolio screenshots.
function laptop(m) {
  const shots = ['ctc-tpd-northstar.jpg', 'ctc-tpd-tidewater-tax.jpg', 'ctc-tpd-harlow.jpg', 'ctc-tpd-ember-tax-advisory.jpg', 'ctc-tpd-keel-tax.jpg', 'ctc-tpd-meridian.jpg'];
  return stack([
    container({ content_width: 'full', padding: box(0), ...cls('ctc-lap-screen') },
      shots.map((f, i) => image(m.file(f), { alt: 'Tax Pro Design website example', cls: `ctc-lap-shot ctc-lap-shot-${i + 1}` }))),
    container({ content_width: 'full', padding: box(0), ...cls('ctc-lap-base') }),
  ], { cls: 'ctc-lap', settings: { min_width: px(0) } });
}

function hero(m) {
  return band(C.navy, [
    container({
      container_type: 'grid', content_width: 'full', padding: box(0),
      grid_columns_grid: { unit: 'custom', size: 'minmax(0,1.05fr) minmax(0,1fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
      grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(56), grid_gaps_mobile: gap(40), grid_align_items: 'center',
    }, [
      stack([
        pill('Websites for Tax Professionals', { color: C.gold, bg: C.navy2, settings: { _border_border: 'solid', _border_width: box(1), _border_color: C.navyLine } }),
        heading('<span class="ctc-thin ctc-block">Earn their trust.</span>Win their business<span class="ctc-gold">.</span>', 'h1', [64, 54, 42], C.white, 'left',
          { lh: 1.05, settings: { _margin: box(18, 0, 0, 0) } }),
        text('We build stunning websites that make people feel confident choosing your tax business. Outstanding design, clear information, and an easy way to contact you—all built to turn visitors into clients.',
          { color: C.muted, size: [19, 19, 18], settings: { _margin: box(24, 0, 0, 0) } }),
        row([cta2('Get a Free Quote →', 'No obligation', 'gold'), cta2('See Our Websites', 'Designs &amp; pricing', 'navy')], { gap: 16, settings: { margin: box(32, 0, 0, 0) } }),
      ], { align: 'flex-start', settings: { min_width: px(0) } }),
      laptop(m),
    ]),
  ], { pad: [88, 96], cls: 'ctc-dots-dark' });
}

const FEATURES = [
  ['far fa-star', 'Design that gets you noticed', 'A polished, custom website that makes your business stand out and gives people a reason to take a closer look.'],
  ['fas fa-handshake', 'A business people feel comfortable choosing', 'Show clients who you are, what you offer, and why they can trust you—with your credentials, experience, and reviews clearly presented.'],
  ['fas fa-phone-alt', 'More calls and appointment requests', 'Make it easy for interested visitors to contact you. Clear buttons and simple forms help turn that interest into new business.'],
  ['fas fa-mobile-alt', 'Looks great on every device', 'Your website should impress whether someone finds you on their phone, tablet, or computer.'],
  ['fas fa-search', 'Help local clients find you', 'Local SEO setup to help people searching for tax services in your area discover your business.'],
  ['fas fa-shield-alt', 'We handle the upkeep', 'Hosting, security updates, and backups handled for you, so your website stays off your to-do list.'],
];

function why() {
  const feature = ([ic, title, body]) => stack([
    widget('icon', { selected_icon: { value: ic, library: ic.startsWith('far') ? 'fa-regular' : 'fa-solid' }, view: 'framed', shape: 'circle', primary_color: C.gold,
      size: px(28), icon_padding: px(20), border_width: box(2), align: 'left' }),
    heading(title, 'h3', [26, 24, 23], C.navy, 'left', { weight: 700, lh: 1.15, ls: 0, settings: { _margin: box(4, 0, 0, 0) } }),
    text(body, { size: [18, 18, 17] }),
  ], { gap: 14 });
  return band(C.white, [
    stack([
      eyebrow('Why your website matters', C.goldText, 'center'),
      H2('<span class="ctc-thin ctc-block">Before they trust you with their taxes,</span><span class="ctc-block">they check you out.</span>', C.navy, 'center', { lh: 1.05, settings: { _margin: box(12, 0, 16, 0) } }),
      text('Your website is often a client’s first impression of your business. It should make them feel they’re in good hands. We design every detail to show your professionalism, answer their questions, and give them a reason to choose you.',
        { align: 'center', size: [21, 20, 18], maxW: 820 }),
    ], { align: 'center', maxW: 1120, settings: { margin: box(0, 0, 56, 0), margin_mobile: box(0, 0, 40, 0) } }),
    grid(FEATURES.map(feature), { cols: [3, 2, 1], gap: 40, rowGap: 48, gapM: 36 }),
  ], { align: 'center' });
}

const WORK = [
  ['Northstar', 'Seattle CPA firm', 'ctc-tpd-northstar.jpg'],
  ['Tidewater Tax', 'Tax prep &amp; advisory', 'ctc-tpd-tidewater-tax.jpg'],
  ['Harlow', 'Virtual tax prep', 'ctc-tpd-harlow.jpg'],
  ['Ember Tax Advisory', 'Enrolled agents', 'ctc-tpd-ember-tax-advisory.jpg'],
  ['Keel Tax', 'Boston CPAs', 'ctc-tpd-keel-tax.jpg'],
  ['Meridian', 'Certified public accountants', 'ctc-tpd-meridian.jpg'],
];

function work(m) {
  const dot = () => container({ content_width: 'full', width: px(10), height: px(10), min_height: px(10), padding: box(0), border_radius: box(50, 50, 50, 50, '%'), background_background: 'classic', background_color: C.navyLine });
  const card = ([name, tag, img]) => linkBox(TPD, {
    content_width: 'full', flex_direction: 'column', flex_gap: gap(0), padding: box(0), min_width: px(0), overflow: 'hidden',
    background_background: 'classic', background_color: C.navy2, border_radius: box(16),
    border_border: 'solid', border_width: box(1), border_color: C.navyLine, border_hover_border: 'solid', border_hover_color: C.gold,
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 60, spread: -30, color: 'rgba(0,0,0,0.6)' },
  }, [
    row([dot(), dot(), dot()], { gap: 6, settings: { flex_wrap: 'nowrap', padding: box(10, 14, 10, 14), background_background: 'classic', background_color: C.footer, border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.navyLine } }),
    image(m.file(img), { alt: `${name.replace('&amp;', '&')} website design`, settings: { width: px(100, '%'), width_tablet: px(100, '%'), width_mobile: px(100, '%') } }),
    row([
      widget('heading', { title: name, header_size: 'span', title_color: C.white, ...typo('typography', HEAD, 19, 700, { lh: 1.2, ls: 0 }) }),
      eyebrow(tag, C.gold, 'right', { size: 13, ls: 0.1 }),
    ], { gap: 12, justify: 'space-between', settings: { flex_wrap: 'nowrap', padding: box(18, 22, 18, 22) } }),
  ]);
  return band(C.navy, [
    row([
      stack([
        eyebrow('Our Work', C.gold),
        H2('<span class="ctc-thin">See the quality</span> for yourself.', C.white, 'left', { lh: 1.05, settings: { _margin: box(12, 0, 0, 0) } }),
        text('Explore our website designs for tax professionals.', { color: C.muted, size: [19, 19, 18], settings: { _margin: box(14, 0, 0, 0) } }),
      ], { settings: { width: auto, width_mobile: px(100, '%') } }),
      heading('See More Websites →', 'span', [22, 22, 20], C.gold, 'left', { weight: 700, lh: 1.2, ls: 0, link: TPD, cls: 'ctc-link-gold' }),
    ], { gap: 24, align: 'flex-end', justify: 'space-between', settings: { margin: box(0, 0, 44, 0), margin_mobile: box(0, 0, 32, 0) } }),
    grid(WORK.map(card), { cols: [3, 2, 1], gap: 24 }),
  ], { cls: 'ctc-dots-dark' });
}

const STEPS = [
  ['01', 'Tell us about your business', 'Share your services, background, and what you want your website to accomplish.'],
  ['02', 'We design and build it', 'We handle the design, content, and setup, with your business and future clients in mind.'],
  ['03', 'Review and launch', 'Review your website with us, finalize the details, and go live.'],
  ['04', 'We keep it running', 'We take care of hosting and ongoing maintenance while you focus on your clients.'],
];

function how() {
  const step = ([n, title, body]) => container({
    content_width: 'full', flex_direction: 'column', flex_gap: gap(12), padding: box(36, 32, 36, 32), padding_mobile: box(28, 24, 28, 24), min_width: px(0),
    background_background: 'classic', background_color: C.white, border_radius: box(16),
  }, [
    widget('heading', { title: n, header_size: 'span', title_color: C.gold, ...typo('typography', HEAD, [56, 52, 48], 800, { lh: 1, ls: 0 }) }),
    heading(title, 'h3', [25, 24, 23], C.navy, 'left', { weight: 700, lh: 1.15, ls: 0 }),
    text(body, { size: 17, lh: 1.6 }),
  ]);
  return band(C.sand, [
    stack([
      eyebrow('How it works', C.goldText),
      H2('<span class="ctc-thin">We make getting a</span> great website easy.', C.navy, 'left', { lh: 1.05, settings: { _margin: box(12, 0, 0, 0) } }),
    ], { maxW: 820, settings: { margin: box(0, 0, 44, 0), margin_mobile: box(0, 0, 32, 0) } }),
    grid(STEPS.map(step), { cols: [4, 2, 1], gap: 20 }),
  ]);
}

function offer() {
  return band(C.white, [
    container({
      container_type: 'grid', content_width: 'full', padding: box(56, 48, 56, 48), padding_mobile: box(36, 24, 36, 24),
      grid_columns_grid: { unit: 'custom', size: 'minmax(0,1.3fr) minmax(0,1fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
      grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(40), grid_gaps_mobile: gap(28), grid_align_items: 'center',
      background_background: 'classic', background_color: C.navy, border_radius: box(20), ...cls('ctc-dots-dark'),
    }, [
      stack([
        eyebrow('Get started', C.gold),
        heading('<span class="ctc-thin">Give clients confidence</span> before the first conversation.', 'h2', [46, 40, 34], C.white, 'left', { lh: 1.1, settings: { _margin: box(12, 0, 16, 0) } }),
        text('Starting your practice or improving an established business? Let’s build a website that makes you proud to send people to it—and gives them a reason to hire you.',
          { color: C.muted, size: [19, 19, 18] }),
      ], { settings: { min_width: px(0) } }),
      stack([
        cta2('Get a Free Quote →', 'Tell us about your practice', 'gold', { full: true, padY: 18 }),
        cta2('Visit TaxProDesign.com', 'Designs, pricing &amp; contact', 'navy', { full: true, padY: 18 }),
      ], { gap: 14, settings: { min_width: px(0) } }),
    ]),
  ]);
}

module.exports = {
  slug: 'need-a-website', title: 'Need A Website?', kind: 'newpage',
  build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    hero(m), why(), work(m), how(), offer(),
  ], false)],
};
