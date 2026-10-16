// Header + footer library templates and the shared style block.
const L = require('./lib.cjs');
const { C, HEAD, BODY, PHONE, URL, px, box, gap, auto, link, typo, container, widget, cls, wcls, stack, row, grid, eyebrow, text, image, linkList } = L;

// Everything Elementor's free controls can't express. Scoped to .ctc-* classes only.
const STYLE = `<style id="ctc-design">
body:has(.ctc-header){background:#fff;margin:0;color:${C.navy};font-family:${BODY},system-ui,sans-serif}
.elementor:has(> .ctc-header){position:sticky;top:calc(var(--wp-admin--admin-bar--height,0px) - 41px);z-index:100}
.ctc-thin{font-weight:300}.ctc-gold{color:${C.gold}}.ctc-block{display:block}
@media (max-width:767px){.ctc-hero-big{white-space:nowrap;font-size:min(1.25em,13.5vw)!important}.ctc-fit-line{white-space:nowrap;font-size:min(1em,7.6vw)}}
.ctc-header a,.ctc-page a,.ctc-footer a{text-decoration:none}
.ctc-page a[href^="tel:"],.ctc-footer a[href^="tel:"]{white-space:nowrap}
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
@media (min-width:1025px){.ctc-dd:hover>.ctc-dd-menu,.ctc-dd:focus-within>.ctc-dd-menu{display:flex!important}}
.ctc-menu-phone,.ctc-menu-logo,.ctc-menu-close{display:none!important}
.ctc-dd-card{border-top-color:${C.gold}!important}
.ctc-dd-list .elementor-icon-list-item>a{display:block!important;padding:12px 14px;border-radius:8px}
.ctc-dd-list .elementor-icon-list-item>a:hover{background:${C.sand}}
.ctc-burger{display:none!important}
.ctc-burger .elementor-icon{cursor:pointer}
@media (max-width:1024px){
 .ctc-burger{display:block!important}
 .ctc-nav>.e-con-inner{justify-content:space-between!important}
 .ctc-nav>.e-con-inner>.e-con{margin-left:auto!important;justify-content:flex-end!important}
 .ctc-navlinks{display:none!important}
 .ctc-nav{position:relative}.ctc-nav .e-con:not(.ctc-nav){position:static}
 body.ctc-menu-open{overflow:hidden}
 body.ctc-menu-open .ctc-navlinks{display:flex!important;position:fixed!important;top:var(--wp-admin--admin-bar--height,0px);left:0;right:0;bottom:0;z-index:9999;width:auto!important;flex-direction:column!important;flex-wrap:nowrap!important;justify-content:space-between!important;align-items:center!important;gap:24px!important;background:#fff;padding:28px 24px 110px!important;overflow-y:auto}
 .ctc-navlinks .ctc-menu-close{position:absolute!important;top:22px;right:20px;width:auto!important}
 .ctc-menu-close .elementor-icon{cursor:pointer}
 body.ctc-menu-open .ctc-menu-items{flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:6px!important;margin:auto 0;width:100%!important}
 body.ctc-menu-open .ctc-menu-items .ctc-navlink{padding:10px 0;text-align:center}
 body.ctc-menu-open .ctc-menu-items .ctc-navlink .elementor-heading-title{font-size:24px!important}
 .ctc-dd{align-items:center;width:100%!important}
 .ctc-dd-list .elementor-icon-list-item{justify-content:center!important;text-align:center}
 .ctc-dd-list .elementor-icon-list-item>a{justify-content:center;padding:9px 14px!important}
 .ctc-dd-menu{position:static!important;display:none!important;padding-top:0!important;min-width:0}
 .ctc-dd.ctc-dd-open>.ctc-dd-menu{display:flex!important}
 .ctc-caret{display:inline-block;transition:transform .2s}.ctc-dd.ctc-dd-open .ctc-caret{transform:rotate(180deg)}
 .ctc-nav-phone{display:none!important}
 body.ctc-menu-open .ctc-navlinks .ctc-menu-phone{display:block!important}
 body.ctc-menu-open .ctc-navlinks .ctc-menu-logo{display:block!important}
 body.ctc-menu-open .ctc-navlinks .ctc-menu-close{display:block!important}
 .ctc-dd-menu>.e-con-inner,.ctc-dd-card{border:0!important;box-shadow:none!important;padding:0 0 6px 0!important;background:transparent!important}
}
/* course cards, articles, CTAs */
.ctc-checks .elementor-icon-list-item{align-items:flex-start!important}
.ctc-checks .elementor-icon-list-icon{flex:none;width:20px;height:20px;border-radius:50%;background:${C.gold};display:inline-flex!important;align-items:center;justify-content:center;margin-top:4px}
.ctc-checks .elementor-icon-list-icon{padding:0!important;margin-right:0!important;line-height:1!important}
.ctc-checks .elementor-icon-list-icon i,.ctc-checks .elementor-icon-list-icon svg{font-size:11px!important;width:11px!important;height:11px!important;line-height:1!important;color:#fff!important;fill:#fff!important;margin:0!important;position:static!important;display:block;text-align:center}
.ctc-checks .elementor-icon-list-text{padding-left:10px!important}
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
/* FAQ (toggle widget: all closed by default) */
.ctc-faq .elementor-toggle-item{background:${C.navy2};border:1px solid ${C.navyLine}!important;border-radius:10px;overflow:hidden;margin-bottom:10px!important}
.ctc-faq .elementor-tab-title{display:flex!important;flex-direction:row-reverse;justify-content:space-between;align-items:center;gap:16px;border:0!important}
.ctc-faq .elementor-tab-title a{color:inherit}
.ctc-faq .elementor-toggle-icon{flex:none;width:26px!important;height:26px;border-radius:50%;background:${C.gold};display:inline-flex!important;align-items:center;justify-content:center;float:none!important;font-size:12px!important;line-height:1!important;margin:0!important}
.ctc-faq .elementor-toggle-icon span{display:inline-flex!important;width:auto!important}
.ctc-faq .elementor-tab-title:not(.elementor-active) .elementor-toggle-icon-opened,.ctc-faq .elementor-tab-title.elementor-active .elementor-toggle-icon-closed{display:none!important}
.ctc-faq .elementor-toggle-icon i,.ctc-faq .elementor-toggle-icon svg{font-size:12px!important;width:12px!important;height:12px!important;color:${C.navy}!important;fill:${C.navy}!important}
.ctc-faq .elementor-tab-content{border:0!important}
.ctc-faq .elementor-tab-content p{margin:0 0 12px}.ctc-faq .elementor-tab-content p:last-child{margin:0}
.ctc-faq .elementor-tab-content a{color:${C.gold};word-break:break-word}
</style>
<script>(function(){var mob=window.matchMedia('(max-width:1024px)');function closeAll(){document.querySelectorAll('.ctc-dd.ctc-dd-open').forEach(function(d){d.classList.remove('ctc-dd-open');});}
document.addEventListener('click',function(e){var b=e.target.closest('.ctc-burger,.ctc-menu-close');if(b){e.preventDefault();var open=document.body.classList.toggle('ctc-menu-open');if(!open)closeAll();return;}
var t=e.target.closest('.ctc-dd>.ctc-navlink a');if(t&&mob.matches){e.preventDefault();var d=t.closest('.ctc-dd'),was=d.classList.contains('ctc-dd-open');closeAll();if(!was)d.classList.add('ctc-dd-open');return;}
if(e.target.closest('.ctc-navlinks a')&&!e.target.closest('.ctc-menu-close')){document.body.classList.remove('ctc-menu-open');closeAll();}});
window.addEventListener('pageshow',function(){document.body.classList.remove('ctc-menu-open');closeAll();});})();</script>`;

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
        // Desktop: inline nav row. Mobile (<=1024px): full-screen overlay – logo top, items middle, call button bottom.
        container({ content_width: 'full', width: auto, flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(28), padding: box(0), flex_wrap: 'nowrap', ...cls('ctc-navlinks') }, [
          image(m.logo, { width: 200, link: URL.home, align: 'center', cls: 'ctc-menu-logo', settings: { _element_width: 'initial', _element_custom_width: px(200) } }),
          widget('icon', { selected_icon: { value: 'fas fa-times', library: 'fa-solid' }, link: link('#close'), primary_color: C.navy, size: px(28), ...wcls('ctc-menu-close') }),
          container({ content_width: 'full', width: auto, flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(28), padding: box(0), flex_wrap: 'nowrap', ...cls('ctc-menu-items') }, [
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
            text: `${PHONE.label} →`, link: link(PHONE.tel), align: 'center',
            ...typo('typography', HEAD, [20, 20, 20], 700, { lh: 1.2, ls: 0 }), border_radius: box(12),
            text_padding: box(16, 28, 16, 28),
            button_text_color: C.white, background_background: 'classic', background_color: C.gold,
            hover_color: C.white, button_background_hover_background: 'classic', button_background_hover_color: C.goldHover,
            ...wcls('ctc-menu-phone'),
          }),
        ]),
        widget('button', {
          text: `${PHONE.label} →`, link: link(PHONE.tel),
          ...typo('typography', HEAD, [20, 18, 15], 700, { lh: 1.2, ls: 0 }), border_radius: box(10),
          text_padding: box(10, 18, 10, 18), text_padding_mobile: box(9, 12, 9, 12),
          button_text_color: C.white, background_background: 'classic', background_color: C.gold,
          hover_color: C.white, button_background_hover_background: 'classic', button_background_hover_color: C.goldHover,
          _flex_size: 'none', ...wcls('ctc-nav-phone'),
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
