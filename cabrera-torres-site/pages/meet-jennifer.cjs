// Meet Jennifer: quote, bio, bar admissions, education, specialties card.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { jennifer: jen, heroes, quote } = require('../content.json');
const { C, px, box, gap, container, band, stack, row, grid, eyebrow, heading, text, button } = L;
const JEN_EMAIL = 'jennifer@cabreratorres.com';

module.exports = {
  slug: 'meet-jennifer', title: 'Meet Jennifer',
  seo: {
    title: 'Jennifer Cabrera-Torres, Esq. | Norcross Injury Attorney',
    description: 'Meet Jennifer Cabrera-Torres, Founder and Managing Attorney: nearly two decades in personal injury law and millions recovered for clients.',
    focus: 'Jennifer Cabrera-Torres',
  },
  build: (m) => [
    P.pageHero(m, heroes.jennifer),
    band(C.light, [
      grid([
        stack([
          text(quote, {
            color: C.ink, size: [24, 22, 20], weight: 300, lh: 1.35,
            settings: { _padding: box(0, 0, 0, 22), _border_border: 'solid', _border_width: box(0, 0, 0, 3), _border_color: C.rose, _margin: box(0, 0, 14, 0) },
          }),
          ...jen.bio.map((p) => text(p, { size: 17 })),
          grid([
            stack([eyebrow(jen.barLbl, C.roseDeep, 'left', { tag: 'h2' }), P.plusList(jen.bar, { cols: 1, size: 16, rowGap: 8 })], { gap: 14 }),
            stack([eyebrow(jen.eduLbl, C.roseDeep, 'left', { tag: 'h2' }), P.plusList(jen.edu, { cols: 1, size: 16, rowGap: 8 })], { gap: 14 }),
          ], { cols: [2, 2, 1], gap: 32, align: 'start', settings: { margin: box(30, 0, 0, 0) } }),
          // CTA box filling the space under the credentials, beside the specialties card.
          container({
            content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(40, 40, 40, 40), padding_mobile: box(30, 24, 30, 24),
            margin: box(30, 0, 0, 0), background_background: 'classic', background_color: C.ivory,
            border_border: 'solid', border_width: box(0, 0, 0, 3), border_color: C.rose,
            custom_css: 'selector { box-shadow: 0 24px 50px -24px rgba(42,27,22,.25); }',
          }, [
            eyebrow('Free case evaluation', C.roseDeep),
            heading(`Talk to Jennifer ${L.accent('about your case', C.roseDeep)}`, 'h2', [34, 30, 26], C.ink, 'left', { lh: 1.15 }),
            text('Jennifer reviews every case herself. Tell her what happened and she will explain your options, in English or Spanish, at no cost and with no obligation. You pay nothing unless we win.', { size: 17, maxW: 620 }),
            row([
              button('Free Case Evaluation', L.URL.contact, 'gold'),
              button(`Call ${L.PHONE}`, L.TEL, 'outline', { settings: { button_text_color: C.ink, hover_color: C.roseDeep, border_color: C.rose, button_hover_border_color: C.roseDeep } }),
            ], { gap: 14, settings: { margin: box(8, 0, 0, 0) } }),
          ]),
        ], { gap: 18 }),
        stack([
          P.framedPhoto(m.jenDress, { tilt: 2 }),
          container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(32, 28, 32, 28), background_background: 'classic', background_color: C.white, border_border: 'solid', border_width: box(1), border_color: C.line, custom_css: 'selector { box-shadow: 0 10px 30px rgba(42,27,22,0.05); }' }, [
            eyebrow(jen.specLbl, C.roseDeep, 'left', { tag: 'h2' }),
            P.plusList(jen.spec, { cols: 1, size: 15, rowGap: 8, color: C.inkSoft }),
            text(`<p><a href="${L.TEL}" style="color:${C.roseDeep};font-weight:500">${L.PHONE}</a><br><a href="mailto:${JEN_EMAIL}">${JEN_EMAIL}</a></p>`, {
              color: C.inkSoft, size: 15, linkColor: C.ink, linkHover: C.roseDeep,
              settings: { _margin: box(10, 0, 0, 0), _padding: box(20, 0, 0, 0), _border_border: 'solid', _border_width: box(1, 0, 0, 0), _border_color: C.line },
            }),
          ]),
        ], { gap: 28 }),
      ], { cols: ['minmax(0,2fr) minmax(0,1fr)', 1, 1], gap: 60, rowGap: 56, align: 'start' }),
    ], { pad: [100, 110] }),
    P.ctaBand(),
  ],
};
