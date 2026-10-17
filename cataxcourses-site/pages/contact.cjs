// Contact Us (/contact-us/, page 108) – Claude Design "Contact Us".
const L = require('../lib.cjs');
const { C, HEAD, BODY, PHONE, px, box, gap, typo, container, widget, cls, wcls, band, stack, grid, linkBox, eyebrow, text, button } = L;
const { faqSection, pageHero } = require('./faq.cjs');

const icon = (value) => widget('icon', { selected_icon: { value, library: 'fa-solid' }, primary_color: C.gold, size: px(30), align: 'left', _margin: box(0, 0, 6, 0) });
const label = (t, color) => eyebrow(t, color, 'left', { size: 15, ls: 0.12 });
const big = (t, size = [34, 32, 30], color = C.white, weight = 800) => widget('heading', { title: t, header_size: 'p', title_color: color, ...typo('typography', HEAD, size, weight, { lh: weight === 800 ? 1.1 : 1.2, ls: 0 }), ...wcls('ctc-break') });
const note = (t, color = C.muted) => text(t, { color, size: 17, lh: 1.5 });

// Navy card with gold top bar (same frame as home course cards).
const cardSettings = {
  content_width: 'full', flex_direction: 'column', flex_gap: gap(10), padding: box(36, 32, 36, 32),
  background_background: 'classic', background_color: C.navy, border_radius: box(16),
  border_border: 'solid', border_width: box(6, 0, 0, 0), border_color: C.gold,
  box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 60, spread: -30, color: 'rgba(0,0,0,0.6)' },
};

function cards() {
  return band(C.white, [
    grid([
      linkBox(PHONE.tel, { ...cardSettings, ...cls('ctc-cta ctc-cta-navy') }, [
        icon('fas fa-phone'), label('Phone', C.gold), big(PHONE.label), note('Our Number Has Changed Recently'),
      ]),
      linkBox('mailto:help@cataxcourses.com', { ...cardSettings, ...cls('ctc-cta ctc-cta-navy') }, [
        icon('fas fa-envelope'), label('Email', C.gold), big('help@cataxcourses.com', [22, 22, 20]), note('We reply during business hours'),
      ]),
      // Live chat: the "Start a chat" button carries .ctc-open-chat (wired to open the LiveChat widget).
      container(cardSettings, [
        icon('fas fa-comments'), label('Live Chat', C.gold), big('chat with us'),
        button('Start a chat →', '#chat', { size: 17, pad: box(0), cls: 'ctc-open-chat',
          settings: { typography_font_family: BODY, background_color: 'transparent', button_background_hover_color: 'transparent', button_text_color: C.gold, hover_color: C.goldHover, border_radius: box(0) } }),
      ]),
      container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(10), padding: box(36, 32, 36, 32), background_background: 'classic', background_color: C.sand, border_radius: box(16) }, [
        icon('fas fa-clock'), label('Hours of Operation', C.goldText),
        big('Monday - Friday:<br>9am - 2pm PST', [26, 25, 24], C.navy, 700), note('Saturday - Sunday: Closed', C.gray),
      ]),
    ], { cols: [4, 2, 1], gap: 20 }),
  ], { pad: [40, 88] });
}

module.exports = {
  slug: 'new-contact', title: 'Contact Us (new design preview)', liveId: 108, kind: 'page',
  build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    pageHero('Help', 'We are here to answer your questions!', 'Contact Us', true, true), cards(), faqSection(),
  ], false)],
};
