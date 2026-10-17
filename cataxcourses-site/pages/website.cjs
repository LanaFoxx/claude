// Need A Website? (new page, /need-a-website/) – Claude Design "Tax Pro Design". Text verbatim from the design.
// Navy hero, six feature icons, portfolio grid (browser-frame cards), four steps, navy student-offer card.
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

function hero() {
  return band(C.navy, [
    pill('Need A Website?', { color: C.gold, bg: C.navy2, settings: { _border_border: 'solid', _border_width: box(1), _border_color: C.navyLine } }),
    heading('<span class="ctc-thin ctc-block" style="font-size:.6em">The best websites for tax professionals, by</span>Tax Pro Design<span class="ctc-gold">.</span>', 'h1', [68, 56, 44], C.white, 'left',
      { lh: 1.05, settings: { _margin: box(18, 0, 0, 0), _element_width: 'initial', _element_custom_width: px(1000), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%') } }),
    text('You just earned your CTEC registration. Now clients need to find you. Tax Pro Design builds clean, mobile-ready websites made specifically for tax preparers, so you look established from day one.',
      { color: C.muted, size: [19, 19, 18], maxW: 720, settings: { _margin: box(24, 0, 0, 0) } }),
    row([cta2('Visit TaxProDesign.com →', 'See designs &amp; pricing', 'gold'), cta2('Get a Free Quote', 'No obligation', 'navy')], { gap: 16, settings: { margin: box(32, 0, 0, 0) } }),
  ], { pad: [96, 96], cls: 'ctc-dots-dark' });
}

const FEATURES = [
  ['far fa-star', 'Designed only for tax pros', 'Every site is built around what tax clients look for: credentials, services, pricing, and a fast way to reach you.'],
  ['fas fa-mobile-alt', 'Built for phones first', 'Most tax clients find you on a phone. Every site is responsive and fast on mobile, tablet, and desktop.'],
  ['far fa-calendar-alt', 'Appointments &amp; intake forms', 'Let clients request an appointment, upload documents, or send a question directly from your site.'],
  ['fas fa-search', 'Found on Google', 'Local SEO setup so "tax preparer near me" surfaces your business, not the franchise down the street.'],
  ['fas fa-shield-alt', 'Secure &amp; maintained', 'Hosting, SSL, backups, and updates handled for you. You focus on tax season, not plugins.'],
  ['fas fa-chart-line', 'Grow year after year', 'Add tax tips, a newsletter, or a client portal link as your practice grows. Your site grows with you.'],
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
      eyebrow('Why Tax Pro Design', C.goldText, 'center'),
      H2('<span class="ctc-thin">Your clients search</span> before they call.', C.navy, 'center', { lh: 1.05, settings: { _margin: box(12, 0, 16, 0) } }),
      text('A professional website is the first thing a new client checks. Tax Pro Design builds sites that answer their questions, collect their info, and book the appointment while you\'re busy preparing returns.',
        { align: 'center', size: [21, 20, 18] }),
    ], { align: 'center', maxW: 820, settings: { margin: box(0, 0, 56, 0), margin_mobile: box(0, 0, 40, 0) } }),
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
        H2('<span class="ctc-thin">Recent work for</span> tax professionals.', C.white, 'left', { lh: 1.05, settings: { _margin: box(12, 0, 0, 0) } }),
      ], { settings: { width: auto, width_mobile: px(100, '%') } }),
      heading('See more at TaxProDesign.com →', 'span', [22, 22, 20], C.gold, 'left', { weight: 700, lh: 1.2, ls: 0, link: TPD, cls: 'ctc-link-gold' }),
    ], { gap: 24, align: 'flex-end', justify: 'space-between', settings: { margin: box(0, 0, 44, 0), margin_mobile: box(0, 0, 32, 0) } }),
    grid(WORK.map(card), { cols: [3, 2, 1], gap: 24 }),
  ], { cls: 'ctc-dots-dark' });
}

const STEPS = [
  ['01', 'Tell us about your practice', 'Services, location, credentials, and the look you like. A 15-minute call or a short form.'],
  ['02', 'We build it', 'Copy, design, photos, and setup handled by people who know what tax clients look for.'],
  ['03', 'Review &amp; launch', 'One round of changes, then your site goes live on your own domain with hosting included.'],
  ['04', 'We keep it running', 'Updates, security, and small edits whenever you need them, all tax season long.'],
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
      H2('<span class="ctc-thin">Live before</span> tax season.', C.navy, 'left', { lh: 1.05, settings: { _margin: box(12, 0, 0, 0) } }),
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
        eyebrow('For California Tax Courses students', C.gold),
        heading('<span class="ctc-thin">Finished your course?</span> Launch your practice with a site that matches your new credentials.', 'h2', [46, 40, 34], C.white, 'left', { lh: 1.1, settings: { _margin: box(12, 0, 16, 0) } }),
        text('Mention California Tax Courses when you reach out and Tax Pro Design will walk you through what a new preparer\'s site should include: CTEC and PTIN display, services, pricing, and a simple way for clients to contact you.',
          { color: C.muted, size: [19, 19, 18] }),
      ], { settings: { min_width: px(0) } }),
      stack([
        cta2('Get Started at TaxProDesign.com →', 'Designs, pricing &amp; contact', 'gold', { full: true, padY: 18 }),
        cta2('Request a Free Quote', 'Tell us about your practice', 'navy', { full: true, padY: 18 }),
      ], { gap: 14, settings: { min_width: px(0) } }),
    ]),
  ]);
}

module.exports = {
  slug: 'need-a-website', title: 'Need A Website?', kind: 'newpage',
  build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    hero(), why(), work(m), how(), offer(),
  ], false)],
};
