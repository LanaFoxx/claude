// Contact: details, office photo, map, case evaluation form.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { contact: ct, heroes } = require('../content.json');
const { C, px, box, gap, container, band, stack, grid, text, widget, image } = L;

module.exports = {
  slug: 'contact', title: 'Contact',
  seo: {
    title: 'Contact Us | Free Case Evaluation | Cabrera Torres Law Firm',
    description: 'Injured? Call Jen at 770-777-HURT or request a free, confidential case evaluation. 1770 Indian Trail Lilburn Rd NW, Suite 350, Norcross, GA 30093.',
    focus: 'free case evaluation Norcross',
  },
  build: (m) => [
    P.pageHero(m, heroes.contact),
    band(C.ivory, [
      grid([
        // Jen: "is there a way to blend this pic better?" Her photo is shot on black, so the column becomes a black panel
        // the same tone as the backdrop and the photo's edges feather into it. Labels are sentence case ("not caps").
        container({
          content_width: 'full', flex_direction: 'column', flex_gap: gap(26), padding: box(0, 40, 44, 40), padding_mobile: box(0, 24, 32, 24),
          background_background: 'classic', background_color: '#020202',
        }, [
          image(m.jenContact, { size: 'large', settings: { _margin: box(0, -40, 0, -40), _margin_mobile: box(0, -24, 0, -24), custom_css: 'selector img { width: 100%; aspect-ratio: 16 / 11; object-fit: cover; object-position: center 30%; display: block; -webkit-mask-image: linear-gradient(to bottom, #000 70%, transparent 100%), linear-gradient(to right, transparent 0, #000 12%, #000 88%, transparent 100%); -webkit-mask-composite: source-in; mask-image: linear-gradient(to bottom, #000 70%, transparent 100%), linear-gradient(to right, transparent 0, #000 12%, #000 88%, transparent 100%); mask-composite: intersect; }' } }),
          P.phoneDetail(32, { dark: true }), P.emailDetail({ dark: true }),
          P.detail('Norcross office', text(`<p>${L.ADDRESS}<br><a href="${L.URL.maps}" target="_blank" rel="noopener" style="font-size:15px;font-weight:600;text-decoration:underline;text-underline-offset:4px">${ct.directions}</a></p>`, { color: C.ivory, size: 16, linkColor: C.rose, linkHover: C.ivory }), { dark: true }),
          P.detail(ct.hoursLbl, text(`<p>${ct.hours}<br>${ct.hours2}</p>`, { color: C.ivory, size: 16 }), { dark: true }),
        ]),
        // Map sits under the form so both columns end at a similar height.
        stack([
          P.contactForm(5),
          widget('google_maps', {
            address: '1770 Indian Trail Lilburn Rd NW, Suite 350, Norcross, GA 30093', zoom: { unit: 'px', size: 14, sizes: [] },
            height: px(300), height_mobile: px(240),
            _border_border: 'solid', _border_width: box(1), _border_color: C.line,
            custom_css: 'selector iframe { filter: grayscale(1) invert(.92) contrast(.9); }',
          }),
        ], { gap: 28 }),
      ], { cols: ['minmax(0,1fr) minmax(0,1.2fr)', 1, 1], gap: 60, rowGap: 48, align: 'start' }),
    ], { pad: [96, 104], width: 1320 }),
    P.ctaBand(),
  ],
};
