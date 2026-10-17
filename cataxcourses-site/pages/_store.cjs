// Shared pieces for the store pages (Claude Design "Store & Account Pages" export): dark hero + steps bar.
const L = require('../lib.cjs');
const { C, HEAD, BODY, px, box, gap, auto, typo, container, widget, cls, band, stack, row, heading } = L;

// Dark dotted hero with a navy pill and the thin + bold H1 used on every store page.
function storeHero(pillText, thin, bold) {
  return band(C.navy, [
    widget('heading', {
      title: pillText, header_size: 'span', title_color: C.gold,
      ...typo('typography', BODY, [16, 15, 13], 700, { lh: 1.3, ls: 0.08, transform: 'uppercase' }),
      _element_width: 'auto', _flex_align_self: 'flex-start', _background_background: 'classic', _background_color: C.navy2,
      _border_border: 'solid', _border_width: box(1), _border_color: C.navyLine, _border_radius: box(999), _padding: box(6, 12, 6, 12),
    }),
    heading(`<span class="ctc-thin ctc-block" style="font-size:.6em">${thin}</span>${bold}<span class="ctc-gold">.</span>`, 'h1', [68, 56, 44], C.white, 'left',
      { lh: 1.05, settings: { _margin: box(18, 0, 0, 0) } }),
  ], { pad: [64, 56], cls: 'ctc-dots-dark' });
}

// Cart → Checkout → Confirmation. state per step: 'done' | 'current' | 'todo'.
function stepsBar(states) {
  const labels = ['Cart', 'Checkout', 'Confirmation'];
  return row(labels.map((label, i) => {
    const st = states[i];
    const circle = st === 'done' ? { t: '✓', bg: C.gold, fg: C.white, bd: C.gold } : st === 'current' ? { t: String(i + 1), bg: C.navy, fg: C.white, bd: C.navy } : { t: String(i + 1), bg: C.white, fg: '#8A8F99', bd: C.light };
    return container({ content_width: 'full', width: auto, flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(12), padding: box(0, 18, 0, 18), padding_mobile: box(0, 6, 0, 6), flex_wrap: 'nowrap', ...cls('ctc-step') }, [
      widget('heading', {
        title: circle.t, header_size: 'span', title_color: circle.fg, align: 'center', ...typo('typography', HEAD, 16, 800, { lh: 1, ls: 0 }),
        _element_width: 'initial', _element_custom_width: px(34), _background_background: 'classic', _background_color: circle.bg,
        _border_border: 'solid', _border_width: box(2), _border_color: circle.bd, _border_radius: box(999), _padding: box(7, 0, 7, 0), _flex_size: 'none',
      }),
      widget('heading', { title: label, header_size: 'span', title_color: st === 'todo' ? '#8A8F99' : C.navy, ...typo('typography', BODY, [17, 17, 14], 700, { lh: 1.2, ls: 0 }) }),
      ...(i < 2 ? [widget('divider', { width: px(48), weight: px(2), color: st === 'done' ? C.gold : C.light, gap: px(0), _flex_size: 'none', _margin: box(0, 0, 0, 18), _margin_mobile: box(0, 0, 0, 6), hide_mobile: 'hidden-mobile' })] : []),
    ]);
  }), { gap: 0, rowGap: 12, justify: 'center', settings: { margin: box(0, 0, 40, 0), _margin: box(0, 0, 40, 0) } });
}

// Sand band holding the steps bar and a WooCommerce shortcode (styled by the .ctc-store CSS in chrome.cjs).
function storeBody(states, shortcode, extraCls, after = []) {
  return band(C.sand, [
    stepsBar(states),
    widget('shortcode', { shortcode, _css_classes: `ctc-store ${extraCls}` }),
    ...after,
  ], { pad: [64, 88] });
}

module.exports = { storeHero, stepsBar, storeBody };
