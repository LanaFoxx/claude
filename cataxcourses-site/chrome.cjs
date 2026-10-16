// Header + footer library templates and the shared style block.
const L = require('./lib.cjs');
const { C, HEAD, BODY, PHONE, URL, px, box, gap, auto, link, typo, container, widget, cls, wcls, stack, row, grid, eyebrow, text, image, linkList } = L;

// Everything Elementor's free controls can't express. Scoped to .ctc-* classes only.
const STYLE = `<style id="ctc-design">
body:has(.ctc-header){background:#fff;margin:0;color:${C.navy};font-family:${BODY},system-ui,sans-serif}
.elementor:has(> .ctc-header){position:sticky;top:calc(var(--wp-admin--admin-bar--height,0px) - 41px);z-index:100}
.ctc-thin{font-weight:300}.ctc-gold{color:${C.gold}}.ctc-block{display:block}
.ctc-header a,.ctc-page a,.ctc-footer a{text-decoration:none}
.ctc-header .elementor-widget-text-editor p:last-child,.ctc-page .elementor-widget-text-editor p:last-child,.ctc-footer .elementor-widget-text-editor p:last-child{margin-bottom:0}
.ctc-header .elementor-widget-text-editor p,.ctc-page .elementor-widget-text-editor p,.ctc-footer .elementor-widget-text-editor p{margin-top:0}
.ctc-dots-cream{background-image:radial-gradient(#e6e1d2 1px,transparent 1px)!important;background-size:22px 22px!important}
.ctc-dots-dark{background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px)!important;background-size:22px 22px!important}
.ctc-dots-white{background-image:radial-gradient(#d6d0bd 1.3px,transparent 1.3px)!important;background-size:22px 22px!important}
.ctc-topbar .elementor-widget-text-editor p{white-space:nowrap}
/* nav */
.ctc-navlink .elementor-heading-title a{color:${C.navy}}.ctc-navlink .elementor-heading-title a:hover{color:${C.goldText}}
.ctc-caret{font-size:12px;color:${C.goldText};margin-left:6px}
.ctc-dd{position:relative}
.ctc-dd-menu{position:absolute!important;top:100%;left:-16px;padding-top:12px!important;display:none!important;z-index:30;min-width:270px}
.ctc-dd:hover>.ctc-dd-menu,.ctc-dd:focus-within>.ctc-dd-menu{display:flex!important}
.ctc-dd-card{border-top-color:${C.gold}!important}
.ctc-dd-list .elementor-icon-list-item>a{display:block!important;padding:12px 14px;border-radius:8px}
.ctc-dd-list .elementor-icon-list-item>a:hover{background:${C.sand}}
.ctc-burger{display:none!important}
.ctc-burger .elementor-icon{cursor:pointer}
@media (max-width:1024px){
 .ctc-burger{display:block!important}
 .ctc-navlinks{display:none!important}
 .ctc-nav{position:relative}.ctc-nav .e-con:not(.ctc-nav){position:static}
 body.ctc-menu-open .ctc-navlinks{display:flex!important;position:absolute!important;top:100%;left:0;right:0;flex-direction:column!important;align-items:stretch!important;gap:4px!important;background:#fff;padding:12px 20px 20px!important;border-bottom:1px solid ${C.light};box-shadow:0 20px 40px -20px rgba(28,35,51,.35)}
 body.ctc-menu-open .ctc-navlinks .ctc-navlink{padding:10px 0;border-bottom:1px solid ${C.sand}}
 .ctc-dd-menu{position:static!important;display:flex!important;padding-top:0!important;min-width:0}
 .ctc-dd-menu>.e-con-inner,.ctc-dd-card{border:0!important;box-shadow:none!important;padding:0 0 6px 12px!important}
}
/* course cards, articles, CTAs */
.ctc-checks .elementor-icon-list-item{align-items:flex-start!important}
.ctc-checks .elementor-icon-list-icon{flex:none;width:20px;height:20px;border-radius:50%;background:${C.gold};display:inline-flex!important;align-items:center;justify-content:center;margin-top:4px}
.ctc-checks .elementor-icon-list-icon svg{width:11px!important;height:11px!important;fill:#fff!important}
.ctc-pricebar,.ctc-article,.ctc-cta{transition:background-color .2s}
.ctc-pricebar:hover,.ctc-article:hover{background-color:${C.sandHover}!important}
.ctc-cta-gold:hover{background-color:${C.goldHover}!important}.ctc-cta-navy:hover{background-color:${C.navy2}!important}
.ctc-deco{pointer-events:none}.ctc-o18{opacity:.18}
.ctc-laptop .elementor-wrapper{--video-aspect-ratio:1.5357!important;aspect-ratio:860/560}
.ctc-laptop video{object-fit:cover}
.ctc-article-arrow .elementor-icon{display:inline-flex}
@media (max-width:767px){.ctc-article-arrow{display:none}.ctc-nowrap-d p{white-space:normal!important}}
.ctc-nowrap-d p{white-space:nowrap}
@media (max-width:1024px){.ctc-nowrap-d p{white-space:normal}}
/* FAQ accordion */
.ctc-faq .elementor-accordion-item{background:${C.navy2};border:1px solid ${C.navyLine}!important;border-radius:10px;overflow:hidden;margin-bottom:10px}
.ctc-faq .elementor-accordion-item+.elementor-accordion-item{border-top:1px solid ${C.navyLine}!important}
.ctc-faq .elementor-tab-title{display:flex!important;flex-direction:row-reverse;justify-content:space-between;align-items:center;gap:16px}
.ctc-faq .elementor-accordion-icon{flex:none;width:26px!important;height:26px;border-radius:50%;background:${C.gold};display:inline-flex!important;align-items:center;justify-content:center;float:none!important;font-size:12px!important;line-height:1!important}
.ctc-faq .elementor-accordion-icon span{display:inline-flex!important;width:auto!important}
.ctc-faq .elementor-tab-title:not(.elementor-active) .elementor-accordion-icon-opened,.ctc-faq .elementor-tab-title.elementor-active .elementor-accordion-icon-closed{display:none!important}
.ctc-faq .elementor-accordion-icon svg{width:12px!important;height:12px!important;fill:${C.navy}!important}
.ctc-faq .elementor-tab-content p{margin:0 0 12px}.ctc-faq .elementor-tab-content p:last-child{margin:0}
.ctc-faq .elementor-tab-content a{color:${C.gold};word-break:break-word}
</style>
<script>document.addEventListener('click',function(e){var b=e.target.closest('.ctc-burger');if(!b)return;e.preventDefault();document.body.classList.toggle('ctc-menu-open');});</script>`;

const navLink = (label, url) => widget('heading', {
  title: label, header_size: 'span', link: link(url), title_color: C.navy,
  ...typo('typography', BODY, [18, 18, 17], 600, { lh: 1.3, ls: 0 }), ...wcls('ctc-navlink'),
});
function dropdown(label, url, items) {
  return container({ content_width: 'full', width: auto, padding: box(0), flex_direction: 'column', ...cls('ctc-dd') }, [
    widget('heading', {
      title: `${label}<span class="ctc-caret">▾</span>`, header_size: 'span', link: link(url), title_color: C.navy,
      ...typo('typography', BODY, [18, 18, 17], 600, { lh: 1.3, ls: 0 }), ...wcls('ctc-navlink'),
    }),
    container({ content_width: 'full', padding: box(12, 0, 0, 0), flex_direction: 'column', ...cls('ctc-dd-menu') }, [
      container({
        content_width: 'full', flex_direction: 'column', padding: box(8),
        background_background: 'classic', background_color: C.white, border_radius: box(12),
        border_border: 'solid', border_width: box(4, 1, 1, 1), border_color: C.line,
        box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 20, blur: 40, spread: -20, color: 'rgba(28,35,51,0.35)' },
        ...cls('ctc-dd-card'),
      },[linkList(items, { color: C.navy, hover: C.navy, size: 17, weight: 500, space: 0, cls: 'ctc-dd-list' })]),
    ]),
  ]);
}

function header(m) {
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0), ...cls('ctc-header'),
  }, [
    widget('html', { html: STYLE }),
    // top bar
    container({
      content_width: 'boxed', boxed_width: px(1392), flex_direction: 'row', flex_wrap: 'nowrap',
      flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(16),
      padding: box(8, 24, 8, 24), padding_mobile: box(8, 16, 8, 16), min_height: px(41),
      background_background: 'classic', background_color: C.navy, ...cls('ctc-topbar'),
    }, [
      text(`Call Us Today <a href="${PHONE.tel}">888-229-1994</a>`, { color: C.light, linkColor: C.gold, linkHover: C.goldHover, size: [17, 16, 14], weight: 600, lh: 1.45, settings: { _element_width: 'auto' } }),
      widget('heading', { title: 'View Cart', header_size: 'span', link: link(URL.cart), title_color: C.light, ...typo('typography', BODY, [17, 16, 14], 600, { lh: 1.45, ls: 0.02 }) }),
    ]),
    // nav
    container({
      content_width: 'boxed', boxed_width: px(1392), flex_direction: 'row', flex_wrap: 'nowrap',
      flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(24), flex_gap_mobile: gap(12),
      padding: box(16, 24, 16, 24), padding_mobile: box(12, 16, 12, 16),
      background_background: 'classic', background_color: C.white,
      border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.light, ...cls('ctc-nav'),
    }, [
      image(m.logo, { width: [183, 165, 140], link: URL.home, align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(183), _element_custom_width_tablet: px(165), _element_custom_width_mobile: px(140), _flex_size: 'none' } }),
      container({
        content_width: 'full', width: auto, flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(28), flex_gap_tablet: gap(14),
        padding: box(0), flex_wrap: 'nowrap',
      }, [
        container({ content_width: 'full', width: auto, flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(28), padding: box(0), flex_wrap: 'nowrap', ...cls('ctc-navlinks') }, [
          navLink('Home', URL.home),
          dropdown('CTEC Courses', URL.c60, [
            ['CTEC 60 Hour Qualifying Education', URL.c60], ['CTEC 20 Hour Continuing Education', URL.c20],
            ['CTEC 15 Hour In Lieu of Experience', URL.c15], ['California Tax Law - 5 Hours', URL.caLaw],
            ['20 Hour Book Add-On', URL.book20], ['60 Hour Book Add-On', URL.book60],
          ]),
          dropdown('Info', URL.become, [
            ['How to Become a CTEC Registered Tax Preparer', URL.become], ['How To Renew Your CTEC Registration', URL.renew],
            ['Frequently Asked Questions', URL.faq], ['Tax News', URL.news], ['Need A Website?', URL.website],
          ]),
          navLink('Help', URL.contact),
          navLink('Login', URL.login),
        ]),
        widget('button', {
          text: `${PHONE.label} →`, link: link(PHONE.tel),
          ...typo('typography', HEAD, [20, 18, 15], 700, { lh: 1.2, ls: 0 }), border_radius: box(10),
          text_padding: box(10, 18, 10, 18), text_padding_mobile: box(9, 12, 9, 12),
          button_text_color: C.white, background_background: 'classic', background_color: C.gold,
          hover_color: C.white, button_background_hover_background: 'classic', button_background_hover_color: C.goldHover,
          _flex_size: 'none',
        }),
        widget('icon', {
          selected_icon: { value: 'fas fa-bars', library: 'fa-solid' }, link: link('#menu'), primary_color: C.navy, size: px(26),
          ...wcls('ctc-burger'), _flex_size: 'none',
        }),
      ]),
    ]),
  ], false)];
}

function footer(m) {
  const head = (t) => eyebrow(t, C.gold, 'left', { size: 15, settings: { _margin: box(0, 0, 6, 0) } });
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0),
    background_background: 'classic', background_color: C.footer,
    border_border: 'solid', border_width: box(3, 0, 0, 0), border_color: C.gold, ...cls('ctc-footer'),
  }, [
    container({
      container_type: 'grid', content_width: 'boxed', boxed_width: px(1392),
      grid_columns_grid: px(4, 'fr'), grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
      grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
      grid_gaps: gap(40), grid_gaps_mobile: gap(32), grid_align_items: 'start',
      padding: box(64, 24, 32, 24), padding_mobile: box(48, 20, 24, 20),
    }, [
      stack([
        image(m.logo, { width: 168, link: URL.home, align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(168), _margin: box(0, 0, 18, 0) } }),
        text('A CTEC &amp; IRS Approved Education Provider. Proud Member of Business Consumer Alliance and TrustPilot', { color: C.muted, size: [18, 17, 16], lh: 1.6, settings: { _margin: box(0, 0, 18, 0) } }),
        linkList([['Terms &amp; Conditions', URL.terms], ['Privacy Policy', URL.privacy], ['Refund Policy', URL.refund]], { inline: true, space: 16, size: 17 }),
      ]),
      stack([head('CTEC Courses'), linkList([
        ['CTEC 60 Hour Qualifying Education', URL.c60], ['CTEC 20 Hour Continuing Education Course', URL.c20],
        ['CTEC 15 Hour In Lieu of Experience Course', URL.c15], ['California Tax Law - 5 Hours', URL.caLaw],
        ['20 Hour Book Add-On', URL.book20], ['60 Hour Book Add-On', URL.book60],
      ], { space: 8 })]),
      stack([head('Info'), linkList([
        ['How to Become a CTEC Registered Tax Preparer', URL.become], ['How To Renew Your CTEC Registration', URL.renew],
        ['Frequently Asked Questions', URL.faq], ['Tax News', URL.news], ['Need A Website?', URL.website],
        ['Help', URL.contact], ['Login', URL.login],
      ], { space: 8 })]),
      stack([
        head('Call Us Today!'),
        widget('heading', { title: PHONE.label, header_size: 'span', link: link(PHONE.tel), title_color: C.white, ...typo('typography', BODY, [32, 30, 28], 800, { lh: 1.2, ls: 0 }) }),
        linkList([['Visit our Facebook', URL.facebook]], { size: 18, settings: { _margin: box(10, 0, 0, 0) } }),
      ], { gap: 4 }),
    ]),
    container({
      content_width: 'boxed', boxed_width: px(1392), flex_direction: 'row', padding: box(20, 24, 28, 24), padding_mobile: box(18, 20, 24, 20),
      border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.navy2,
    }, [text('© California Tax Courses 2026', { color: C.muted, size: 17, lh: 1.5 })]),
  ], false)];
}

module.exports = { STYLE, header, footer };
