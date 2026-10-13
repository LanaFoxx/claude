// Contact: details, office photo, map, case evaluation form.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { contact: ct, heroes } = require('../content.json');
const { C, px, box, band, stack, grid, text, widget, image } = L;

module.exports = {
  slug: 'contact', title: 'Contact',
  seo: {
    title: 'Contact Us | Free Case Evaluation | Cabrera-Torres Law Firm',
    description: 'Injured? Call Jen at 678.490.0000 or request a free, confidential case evaluation. 1770 Indian Trail Lilburn Rd NW, Norcross, GA 30093.',
    focus: 'free case evaluation Norcross',
  },
  build: (m) => [
    P.pageHero(m, heroes.contact),
    band(C.white, [
      grid([
        stack([
          P.phoneDetail(32), P.emailDetail(),
          P.detail('Norcross office', text(`<p>${L.ADDRESS}<br><a href="${L.URL.maps}" target="_blank" rel="noopener" style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;font-weight:500">${ct.directions}</a></p>`, { color: C.inkSoft, size: 16 })),
          P.detail(ct.hoursLbl, text(`<p>${ct.hours}<br><span style="color:${C.inkMuted}">${ct.hours2}</span></p>`, { color: C.inkSoft, size: 16 })),
          image(m.jenDesk, {
            settings: {
              _border_border: 'solid', _border_width: box(1), _border_color: C.line,
              custom_css: 'selector img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; object-position: center 30%; display: block; }',
            },
          }),
        ], { gap: 26 }),
        // Map sits under the form so both columns end at a similar height.
        stack([
          P.contactForm(5),
          widget('google_maps', {
            address: '1770 Indian Trail Lilburn Rd NW, Norcross, GA 30093', zoom: { unit: 'px', size: 14, sizes: [] },
            height: px(300), height_mobile: px(240),
            _border_border: 'solid', _border_width: box(1), _border_color: C.line,
            custom_css: 'selector iframe { filter: grayscale(1) invert(.92) contrast(.9); }',
          }),
        ], { gap: 28 }),
      ], { cols: ['minmax(0,1fr) minmax(0,1.2fr)', 1, 1], gap: 60, rowGap: 48, align: 'start' }),
    ], { pad: [90, 110], pattern: m.pattern }),
  ],
};
