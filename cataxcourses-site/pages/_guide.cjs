// Shared builder for the step-by-step guide pages (How to Become / How to Renew) – Claude Design "Step by Step Guide":
// cream hero (pill + two-part H1), numbered step cards (sand), call band (white dots).
const L = require('../lib.cjs');
const { C, HEAD, BODY, PHONE, px, box, gap, auto, typo, container, widget, cls, wcls, band, stack, grid, eyebrow, heading, H2, text, button, pill } = L;

// o.label (pill text), o.dark (navy hero, "Next Steps" pages), o.intro (paragraph under the H1).
function hero(thin, bold, o = {}) {
  const dark = !!o.dark;
  return band(dark ? C.navy : C.cream, [
    pill(o.label || 'Step by Step Guide', dark ? { color: C.gold, bg: C.navy2, settings: { _border_border: 'solid', _border_width: box(1), _border_color: C.navyLine } } : {}),
    heading(`<span class="ctc-thin ctc-block" style="font-size:.6em">${thin}</span>${bold}<span class="ctc-gold">.</span>`, 'h1', [68, 56, 44], dark ? C.white : C.navy, 'left',
      { lh: 1.05, settings: { _margin: box(18, 0, 0, 0), _element_width: 'initial', _element_custom_width: px(1000), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%') } }),
    ...(o.intro ? [text(o.intro, { color: C.muted, size: [19, 19, 18], lh: 1.65, maxW: 820, settings: { _margin: box(24, 0, 0, 0) } })] : []),
  ], { pad: [88, 80], cls: dark ? 'ctc-dots-dark' : 'ctc-dots-cream' });
}

// White sub-step row with the gold check circle.
const subStep = (t) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'flex-start', flex_gap: gap(14),
  padding: box(16, 20, 16, 20), background_background: 'classic', background_color: C.white, border_radius: box(12),
}, [
  widget('icon', { selected_icon: { value: 'fas fa-check', library: 'fa-solid' }, view: 'stacked', shape: 'circle', primary_color: C.gold, secondary_color: C.white,
    size: px(12), icon_padding: px(7), _flex_size: 'none', _margin: box(3, 0, 0, 0), _element_width: 'auto' }),
  text(`<strong style="font-family:${HEAD},sans-serif">${t.label}</strong> ${t.text} <a href="${t.href}"><strong>${t.linkText}</strong></a>`,
    { color: C.navy, linkColor: C.goldText, linkHover: C.goldHover, size: [18, 18, 17], lh: 1.55, settings: { _flex_size: 'grow' } }),
]);

const note = (t) => container({
  content_width: 'full', padding: box(20, 24, 20, 24), background_background: 'classic', background_color: C.navy, border_radius: box(12),
  border_border: 'solid', border_width: box(4, 0, 0, 0), border_color: C.gold, margin: box(18, 0, 0, 0),
}, [text(`<strong style="color:${C.gold}">NOTE:</strong> ${t}`, { color: C.light, size: [17, 17, 16], lh: 1.6 })]);

function step(s) {
  return container({
    container_type: 'grid', content_width: 'full',
    grid_columns_grid: { unit: 'custom', size: 'auto minmax(0,1fr)' }, grid_columns_grid_tablet: { unit: 'custom', size: 'auto minmax(0,1fr)' }, grid_columns_grid_mobile: { unit: 'custom', size: 'minmax(0,1fr)' },
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(32), grid_gaps_mobile: gap(12), grid_align_items: 'start',
    padding: box(40, 44, 40, 44), padding_mobile: box(28, 24, 28, 24), background_background: 'classic', background_color: C.sand, border_radius: box(16),
  }, [
    widget('heading', { title: s.num, header_size: 'span', title_color: C.gold, ...typo('typography', HEAD, [64, 64, 44], 800, { lh: 1, ls: 0 }),
      _element_width: 'initial', _element_custom_width: px(90), _element_custom_width_mobile: px(100, '%') }),
    stack([
      heading(s.title, 'h2', [32, 30, 26], C.navy, 'left', { weight: 700, lh: 1.15, ls: 0, settings: { _margin: box(0, 0, 14, 0) } }),
      text(s.paragraphs.map((p) => `<p>${p}</p>`).join(''), { size: [19, 19, 18], lh: 1.65, pSpace: 12, maxW: 900 }),
      ...(s.sub ? [stack(s.sub.map(subStep), { gap: 10, settings: { margin: box(18, 0, 6, 0) } })] : []),
      ...(s.note ? [note(s.note)] : []),
      ...(s.ctaHref ? [button(`${s.ctaLabel} →`, s.ctaHref, { size: [20, 20, 18], pad: box(14, 24, 14, 24), settings: { _margin: box(16, 0, 0, 0) } })] : []),
    ], { settings: { min_width: px(0) } }),
  ]);
}

function steps(list) {
  return band(C.white, [stack(list.map(step), { gap: 20 })]);
}

// o.callThin (light first line of the H2), o.callPlain (no dots, small top padding – "Next Steps" pages).
function callBand(o = {}) {
  return band(C.white, [
    eyebrow('Questions?', C.goldText, 'center'),
    H2(`<span class="ctc-thin">${o.callThin || 'Have Questions Before Enrolling?'}</span><br>Call Us Today`, C.navy, 'center', { sizes: [52, 44, 36], lh: 1.1, settings: { _margin: box(14, 0, 24, 0) } }),
    button(`${PHONE.label} →`, PHONE.tel, { align: 'center', size: [24, 23, 21], pad: box(18, 32, 18, 32) }),
  ], o.callPlain ? { pad: [8, 96], align: 'center' } : { pad: [96, 96], align: 'center', cls: 'ctc-dots-white' });
}

const guidePage = ({ thin, bold, steps: list, ...o }) => (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
  hero(thin, bold, o), steps(list), callBand(o),
], false)];

module.exports = { guidePage };
