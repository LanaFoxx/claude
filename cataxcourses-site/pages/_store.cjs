// Shared pieces for the store pages (Claude Design "Store & Account Pages" export): dark hero + shortcode band.
const L = require('../lib.cjs');
const { C, HEAD, BODY, px, box, gap, auto, typo, container, widget, cls, band, stack, row, heading } = L;

// Dark dotted hero with an optional navy pill (pillText null = none) and the thin + bold H1 used on every store page.
function storeHero(pillText, thin, bold) {
  return band(C.navy, [
    ...(pillText ? [widget('heading', {
      title: pillText, header_size: 'span', title_color: C.gold,
      ...typo('typography', BODY, [16, 15, 13], 700, { lh: 1.3, ls: 0.08, transform: 'uppercase' }),
      _element_width: 'auto', _flex_align_self: 'flex-start', _background_background: 'classic', _background_color: C.navy2,
      _border_border: 'solid', _border_width: box(1), _border_color: C.navyLine, _border_radius: box(999), _padding: box(6, 12, 6, 12),
    })] : []),
    heading(`<span class="ctc-thin ctc-block" style="font-size:.6em">${thin}</span>${bold}<span class="ctc-gold">.</span>`, 'h1', [68, 56, 44], C.white, 'left',
      { lh: 1.05, settings: { _margin: box(pillText ? 18 : 0, 0, 0, 0) } }),
  ], { pad: [64, 56], cls: 'ctc-dots-dark' });
}

// Sand band holding a WooCommerce shortcode (styled by the .ctc-store CSS in chrome.cjs).
function storeBody(shortcode, extraCls, after = []) {
  return band(C.sand, [
    widget('shortcode', { shortcode, _css_classes: `ctc-store ${extraCls}` }),
    ...after,
  ], { pad: [64, 88] });
}

module.exports = { storeHero, storeBody };
