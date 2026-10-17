// Shared builder for the legal pages (Terms, Privacy, Refund) – Claude Design "Legal" layout:
// cream hero (pill + two-part H1), then a split band: sticky "Questions?" aside + policy sections.
// Each section = optional H2 heading widget + one text-editor widget (long text stays editable).
const L = require('../lib.cjs');
const { C, HEAD, BODY, PHONE, URL, px, box, gap, link, typo, container, widget, cls, band, stack, row, grid, eyebrow, heading, text, pill } = L;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Plain design strings -> <p>, with bare http(s) URLs and e-mail addresses made clickable (text unchanged).
const linkify = (s) => esc(s)
  .replace(/https?:\/\/[^\s,<]+[^\s,.<;:)]/g, (u) => `<a href="${u}">${u}</a>`)
  .replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.]+[\w])/g, (_, p, e) => `${p}<a href="mailto:${e}">${e}</a>`);
const paras = (ps) => ps.map((p) => `<p>${linkify(p)}</p>`).join('');

function hero(thin, bold) {
  return band(C.cream, [
    pill('Legal'),
    heading(`<span class="ctc-thin ctc-block" style="font-size:.6em">${thin}</span>${bold}<span class="ctc-gold">.</span>`, 'h1', [68, 56, 44], C.navy, 'left',
      { lh: 1.05, settings: { _margin: box(18, 0, 0, 0), _element_width: 'initial', _element_custom_width: px(1000), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%') } }),
  ], { pad: [88, 80], cls: 'ctc-dots-cream' });
}

const navPill = (t, url) => widget('heading', {
  title: t, header_size: 'span', link: link(url), title_color: C.navy,
  ...typo('typography', BODY, [15, 15, 14], 700, { lh: 1.3, ls: 0 }),
  _element_width: 'auto', _background_background: 'classic', _background_color: C.sand,
  _border_radius: box(999), _padding: box(8, 14, 8, 14),
});

function aside() {
  return stack([
    eyebrow('Questions?', C.goldText, 'left', { size: 15 }),
    text(`help@cataxcourses.com<br><a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>`, { size: [18, 18, 17], lh: 1.6, linkColor: C.goldText, linkHover: C.goldHover }),
    row([navPill('Terms &amp; Conditions', URL.terms), navPill('Privacy Policy', URL.privacy), navPill('Refund Policy', URL.refund)],
      { gap: 10, justify: 'flex-start', settings: { margin: box(8, 0, 0, 0) } }),
  ], { gap: 14, cls: 'ctc-legal-aside' });
}

// sections: [{ title, html }] (html = ready text-editor HTML) or [{ title, ps: [strings] }]
function section(s) {
  const body = s.html || paras(s.ps);
  return stack([
    ...(s.title ? [heading(s.title, 'h2', [24, 23, 22], C.navy, 'left', { weight: 700, lh: 1.2, ls: 0.02, settings: { _margin: box(0, 0, 12, 0) } })] : []),
    text(body, { size: [17, 17, 16], lh: 1.7, pSpace: 12, cls: 'ctc-legal-text' }),
  ]);
}

function policy(sections) {
  return band(C.white, [
    grid([aside(), stack(sections.map(section), { gap: 36 })],
      { cols: ['minmax(0,1fr) minmax(0,2.2fr)', 'minmax(0,1fr)', 'minmax(0,1fr)'], gap: 64, gapT: 32, gapM: 32, align: 'start' }),
  ], { settings: { overflow: '' } }); // no overflow:hidden, so the aside can be sticky
}

const legalPage = ({ thin, bold, sections }) => (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
  hero(thin, bold), policy(sections),
], false)];

module.exports = { legalPage, linkify, paras };
