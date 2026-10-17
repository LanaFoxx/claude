// Tax News article template (Elementor Pro Theme Builder "Single Post", all posts). No separate design: the Tax News /
// guide pages' cream hero (pill, date, title), the article text in a centered column, then "All Tax News" + course CTA.
// Title, date and content are Pro dynamic widgets, so every post fills it in.
const L = require('../lib.cjs');
const { C, HEAD, BODY, URL, px, box, gap, typo, container, widget, cls, band, stack, row, heading, button, pill, id } = L;

// Elementor dynamic-tag markup: [elementor-tag id=".." name=".." settings="<urlencoded json>"]
const tag = (name, settings = {}) => `[elementor-tag id="${id()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(settings))}"]`;

module.exports = {
  slug: 'ctc-single-post', title: 'CTC Tax News Article (Theme Builder)', kind: 'single-post',
  build: () => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    band(C.cream, [
      pill('Tax News'),
      widget('heading', {
        title: 'Post date', header_size: 'p', title_color: C.goldText, __dynamic__: { title: tag('post-date', { type: 'post_date_gmt', format: 'F j, Y' }) },
        ...typo('typography', BODY, [16, 15, 14], 700, { lh: 1.3, ls: 0.14, transform: 'uppercase' }), _margin: box(22, 0, 0, 0),
      }),
      widget('theme-post-title', {
        header_size: 'h1', title_color: C.navy, ...typo('typography', HEAD, [60, 50, 38], 800, { lh: 1.08, ls: -0.02 }),
        _margin: box(10, 0, 0, 0), _element_width: 'initial', _element_custom_width: px(1000), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%'),
      }),
    ], { pad: [88, 56], cls: 'ctc-dots-cream' }),
    band(C.white, [
      stack([
        widget('theme-post-content', { text_color: C.gray, ...typo('typography', BODY, [20, 19, 18], 400, { lh: 1.7 }), _css_classes: 'ctc-post-body' }),
      ], { maxW: 820 }),
    ], { pad: [48, 72], align: 'center' }),
    band(C.sand, [stack([
      heading('<span class="ctc-thin">Ready to</span> get started?', 'h2', [44, 38, 32], C.navy, 'center', { lh: 1.1 }),
      row([
        button('CTEC 60 Hour Course →', URL.c60, { size: [20, 20, 18], pad: box(14, 24, 14, 24) }),
        button('CTEC 20 Hour Course →', URL.c20, { variant: 'navy', size: [20, 20, 18], pad: box(14, 24, 14, 24) }),
      ], { gap: 16, justify: 'center', settings: { margin: box(28, 0, 0, 0) } }),
      heading('← All Tax News', 'span', [19, 19, 18], C.goldText, 'center', { weight: 700, lh: 1.3, ls: 0, link: URL.news, settings: { _margin: box(28, 0, 0, 0) } }),
    ], { align: 'center' })], { pad: [80, 88], align: 'center', cls: 'ctc-dots-white' }),
  ], false)],
};
