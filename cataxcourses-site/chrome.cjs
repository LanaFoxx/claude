// Header + footer library templates and the shared style block.
const L = require('./lib.cjs');
const { C, HEAD, BODY, PHONE, URL, px, box, gap, auto, link, typo, container, widget, cls, wcls, stack, row, grid, eyebrow, text, image, linkList } = L;

// Everything Elementor's free controls can't express. Scoped to .ctc-* classes only.
const STYLE = `<style id="ctc-design">
body:has(.ctc-header){background:#fff;margin:0;color:${C.navy};font-family:${BODY},system-ui,sans-serif}
.elementor:has(> .ctc-header){position:sticky;top:calc(var(--wp-admin--admin-bar--height,0px) - 41px);z-index:100}
.ctc-thin{font-weight:300}.ctc-gold{color:${C.gold}}.ctc-block{display:block;line-height:1.2}.ctc-balance{text-wrap:balance}
@media (max-width:767px){
 .ctc-badge-slider{flex-wrap:nowrap!important;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;justify-content:flex-start!important;gap:0!important}
 .ctc-badge-slider::-webkit-scrollbar{display:none}
 .ctc-badge-slider>.elementor-widget{flex:0 0 100%!important;width:100%!important;max-width:100%!important;scroll-snap-align:center;display:flex;justify-content:center}
 .ctc-badge-slider>.elementor-widget img{width:auto!important;max-width:250px!important;object-fit:contain}
 /* equal visual size: wide logos shorter, square Alliance taller */
 .ctc-badge-slider>.elementor-widget:nth-child(1) img{height:48px!important}
 .ctc-badge-slider>.elementor-widget:nth-child(2) img{height:90px!important}
 .ctc-badge-slider>.elementor-widget:nth-child(3) img{height:81px!important}
 .ctc-badge-slider>.elementor-widget:nth-child(4) img{height:93px!important}
 .ctc-badge-slider{min-height:100px;align-items:center!important}
}
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
@media (min-width:1025px){.ctc-dd:hover>.ctc-dd-menu,.ctc-dd:focus-within>.ctc-dd-menu,.ctc-dd.ctc-dd-open>.ctc-dd-menu{display:flex!important}}
.ctc-dd>.ctc-navlink{cursor:pointer;user-select:none}.ctc-dd>.ctc-navlink .elementor-heading-title{color:#1C2333}.ctc-dd:hover>.ctc-navlink .elementor-heading-title,.ctc-dd.ctc-dd-open>.ctc-navlink .elementor-heading-title{color:#B8901F}
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
.ctc-link-gold a:hover,.ctc-link-gold a:focus{color:${C.white}!important}
/* Checkout SMS consent checkbox (wp/preview-snippet.php) */
.ctc-checkout .ctc-sms-consent label{display:block!important;position:relative;padding-left:30px;font-weight:400!important;font-size:14px!important;line-height:1.55;color:${C.gray}}.ctc-checkout .ctc-sms-consent input[type=checkbox]{position:absolute;left:0;top:2px;width:18px;height:18px;margin:0;accent-color:${C.gold}}.ctc-checkout .ctc-sms-consent a{color:${C.goldText};font-weight:700}.ctc-checkout .ctc-sms-consent .optional{display:none}
/* Text alerts (SMS opt-in) form */
.ctc-sms-form a{color:${C.goldText}!important;font-weight:700}.ctc-sms-form .elementor-field-type-acceptance .elementor-field-option{display:flex;gap:10px;align-items:flex-start}.ctc-sms-form input[type=checkbox]{width:20px;height:20px;flex:none;margin-top:3px;accent-color:${C.gold}}.ctc-sms-form .elementor-field-type-acceptance label{font-weight:400!important;font-size:15px;line-height:1.6;color:${C.gray}}
/* Tax News article body (Theme Builder single-post template, pages/post-single.cjs) */
.ctc-post-body p{margin:0 0 22px}.ctc-post-body a{color:${C.goldText};font-weight:700}.ctc-post-body a:hover{color:${C.goldDeep}}
.ctc-post-body h2,.ctc-post-body h3,.ctc-post-body h4{font-family:Outfit,sans-serif;color:${C.navy};font-weight:700;line-height:1.2;margin:36px 0 14px}.ctc-post-body h2{font-size:32px}.ctc-post-body h3{font-size:26px}
.ctc-post-body img{max-width:100%;height:auto;border-radius:12px;margin:8px 0 22px}.ctc-post-body figure{margin:0 0 22px}.ctc-post-body ul,.ctc-post-body ol{margin:0 0 22px;padding-left:24px}.ctc-post-body li{margin:0 0 8px}
.ctc-post-body strong{color:${C.navy}}
/* Thank-you page (rendered by wp/preview-snippet.php around the Moodle plugin's [moodleauth] output) */
.ctc-thankyou{font-family:Manrope,sans-serif}.ctc-ty-inner{max-width:1392px;margin:0 auto;padding:0 24px}
.ctc-ty-hero{background-color:${C.navy};padding:64px 0 56px;color:#fff}
.ctc-ty-pill{display:inline-block;background:${C.navy2};color:${C.gold};border:1px solid ${C.navyLine};border-radius:999px;padding:6px 12px;font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.ctc-ty-hero h1{font-family:Outfit,sans-serif;font-size:68px;font-weight:800;line-height:1.05;letter-spacing:-.02em;color:#fff;margin:18px 0 0}.ctc-ty-hero h1 .ctc-thin{font-size:.6em}
.ctc-ty-body{background:${C.sand};padding:64px 0 88px}
.ctc-ty-card{background:#fff;border-radius:16px;border-top:6px solid ${C.gold};padding:40px;max-width:820px;box-shadow:0 30px 60px -30px rgba(28,35,51,.25);color:${C.gray};font-size:19px;line-height:1.65}
.ctc-ty-card #response_text{margin-left:0!important}.ctc-ty-card p{margin:0 0 12px}.ctc-ty-card a{color:${C.goldText};font-weight:700}.ctc-ty-card h1,.ctc-ty-card h2,.ctc-ty-card h3,.ctc-ty-card strong{color:${C.navy}}
.ctc-ty-help{margin:24px 0 0;color:${C.gray};font-size:17px}.ctc-ty-help a{color:${C.goldText}}
@media (max-width:767px){.ctc-ty-inner{padding:0 20px}.ctc-ty-hero{padding:42px 0 37px}.ctc-ty-hero h1{font-size:44px}.ctc-ty-body{padding:42px 0 58px}.ctc-ty-card{padding:24px 20px;font-size:17px}}
.ctc-deco{pointer-events:none}.ctc-o18{opacity:.18}
.ctc-laptop .elementor-wrapper{--video-aspect-ratio:1.5!important;aspect-ratio:3/2;background:transparent!important}
/* laptop videos (v3, 1770x1180 with margin): show only the laptop + its shadow so the section background (dots) shows around it */
.ctc-laptop video{object-fit:contain;background:transparent!important;-webkit-mask-image:url(https://cataxcourses.com/wp-content/uploads/2026/10/ctc-laptop-mask-v3.png);mask-image:url(https://cataxcourses.com/wp-content/uploads/2026/10/ctc-laptop-mask-v3.png);-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
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
/* pages: sticky FAQ intro (desktop), breakable email */
@media (min-width:1025px){.ctc-sticky{position:sticky!important;top:120px;align-self:start}}
.ctc-break .elementor-heading-title{overflow-wrap:anywhere}
@media (min-width:1025px){.ctc-legal-aside{position:sticky!important;top:120px;align-self:start}}
.ctc-legal-text ul{margin:0 0 12px;padding-left:1.4em}.ctc-legal-text li{margin-bottom:4px}
.ctc-article.ctc-article-w:hover{background-color:#FBFAF6!important}
.ctc-page #enroll{scroll-margin-top:100px}
@media (min-width:1025px){.ctc-dd-menu{width:max-content!important;min-width:280px!important;max-width:min(420px,90vw)!important}.ctc-dd-menu>.e-con,.ctc-dd-card{width:100%!important}.ctc-dd-list .elementor-icon-list-item>a{white-space:nowrap}}
.ctc-navlink .elementor-heading-title a,.ctc-navlink .elementor-heading-title a:focus,.ctc-navlink .elementor-heading-title a:hover,.ctc-dd-list a,.ctc-dd-list a:focus{background-color:transparent!important;box-shadow:none!important;outline:none}
.ctc-dd-list .elementor-icon-list-item>a:hover{background-color:#F3F1EC!important}
/* ===== store pages: WooCommerce cart + checkout in the design's cards (.ctc-store) ===== */
.ctc-store .woocommerce{font-family:Manrope,system-ui,sans-serif;color:#1C2333;font-size:17px}
.ctc-store .woocommerce *{box-sizing:border-box}
.ctc-store a{color:#B8901F;font-weight:700}
.ctc-store .ctc-step-eyebrow,.ctc-checkout .woocommerce-billing-fields>h3::before,.ctc-checkout .woocommerce-shipping-fields>h3::before,.ctc-cart .cart_totals>h2::before{display:block;font-family:Manrope,sans-serif;font-size:15px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#B8901F;margin:0 0 6px}
.ctc-store h3,.ctc-store .ctc-card-title,.ctc-cart .cart_totals>h2{font-family:Outfit,sans-serif!important;font-weight:800!important;font-size:28px!important;line-height:1.15!important;color:#1C2333!important;margin:0 0 22px!important;letter-spacing:-.01em;text-transform:none!important}
.ctc-store .ctc-card,.ctc-checkout #customer_details .col-1,.ctc-checkout #customer_details .col-2,.ctc-checkout #order_review,.ctc-cart .cart_totals,.ctc-cart table.shop_table.cart{background:#fff;border:1px solid #E6E3DA;border-top:6px solid #D4A93A!important;border-radius:16px;padding:32px 36px 36px}
.ctc-store .woocommerce-notices-wrapper,.ctc-store .woocommerce-NoticeGroup,.ctc-store .woocommerce-form-coupon-toggle,.ctc-store form.checkout_coupon{grid-column:1/-1}
.ctc-store .woocommerce-message,.ctc-store .woocommerce-info,.ctc-store .woocommerce-error{background:#fff;color:#1C2333;border:1px solid #E6E3DA;border-left:4px solid #D4A93A;border-radius:10px;box-shadow:none!important;padding:14px 18px 14px 48px;margin:0 0 20px;font-size:16px;list-style:none}
.ctc-store .woocommerce-error{border-left-color:#C0392B}
.ctc-store .woocommerce-message::before,.ctc-store .woocommerce-info::before{color:#B8901F}
/* form fields */
.ctc-store .form-row{margin:0 0 18px!important;padding:0!important}
.ctc-store .form-row label{display:block;font-size:15px;font-weight:700;color:#1C2333;margin:0 0 8px;line-height:1.3}
.ctc-store .form-row .required{color:#B8901F;text-decoration:none}
.ctc-store input.input-text,.ctc-store textarea,.ctc-store select,.ctc-store .select2-container .select2-selection--single{width:100%;background:#fff!important;border:1px solid #D9DCE1!important;border-radius:10px!important;padding:13px 16px!important;font-size:17px!important;color:#1C2333!important;font-family:Manrope,sans-serif!important;line-height:1.3!important;min-height:50px;box-shadow:none!important}
.ctc-store .select2-container .select2-selection--single{display:flex;align-items:center;padding:0 16px!important}
.ctc-store .select2-container .select2-selection__rendered{padding:0!important;line-height:1.3!important;color:#1C2333!important}
.ctc-store .select2-container .select2-selection__arrow{top:12px!important;right:10px!important}
.ctc-store input.input-text:focus,.ctc-store select:focus,.ctc-store textarea:focus,.ctc-store .select2-container--focus .select2-selection{border-color:#D4A93A!important;box-shadow:0 0 0 3px rgba(212,169,58,.25)!important;outline:none}
.ctc-store .form-row-first,.ctc-store .form-row-last{width:calc(50% - 9px)!important}
.ctc-store .form-row-first{float:left!important}.ctc-store .form-row-last{float:right!important}
.ctc-store .ctc-note{margin:6px 0 0;font-size:15px;line-height:1.6;color:#4B5058;background:#F3F1EC;border-radius:10px;padding:14px 16px;border-left:4px solid #D4A93A;clear:both}
.ctc-store .woocommerce-form__label-for-checkbox,.ctc-store .woocommerce-form__label-checkbox{display:flex!important;gap:10px;align-items:flex-start;font-weight:500!important}
/* buttons */
.ctc-store .button,.ctc-store button.button,.ctc-store a.button,.ctc-store #place_order{background:#1C2333!important;color:#fff!important;border:0!important;border-radius:12px!important;padding:14px 24px!important;font-family:Outfit,sans-serif!important;font-weight:700!important;font-size:18px!important;line-height:1.2!important;text-transform:none!important;letter-spacing:0!important;box-shadow:none!important;transition:background-color .2s}
.ctc-store .button:hover{background:#242D40!important}
.ctc-store .button:disabled,.ctc-store .button[disabled]{opacity:.45!important}
.ctc-store #place_order,.ctc-store .wc-proceed-to-checkout a.checkout-button{display:block!important;width:100%!important;text-align:center;background:#D4A93A!important;font-size:22px!important;padding:18px 28px!important;margin-top:8px}
.ctc-store #place_order:hover,.ctc-store .wc-proceed-to-checkout a.checkout-button:hover{background:#C39A2F!important}
/* checkout layout: steps left, summary right */
.ctc-checkout form.checkout{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:20px 32px;align-items:start}
.ctc-checkout form.checkout>*{grid-column:1;min-width:0}
.ctc-checkout #customer_details{display:grid;gap:20px;width:auto!important;margin:0!important}
.ctc-checkout #customer_details::before,.ctc-checkout #customer_details::after{display:none!important}
.ctc-checkout #customer_details .col-1,.ctc-checkout #customer_details .col-2{float:none!important;width:auto!important;margin:0!important}
.ctc-checkout #customer_details .col-2:not(:has(input,textarea,select)){display:none}
.ctc-checkout .woocommerce-billing-fields>h3::before{content:"Step 1"}
.ctc-checkout .woocommerce-shipping-fields>h3::before{content:"Step 2"}
.ctc-checkout .woocommerce-billing-fields__field-wrapper::after,.ctc-checkout .woocommerce-shipping-fields__field-wrapper::after{content:"";display:table;clear:both}
.ctc-checkout #ship-to-different-address{font-size:20px!important}
.ctc-checkout #ship-to-different-address label{display:flex!important;gap:10px;align-items:center;font-weight:700}
.ctc-checkout #order_review_heading{display:none!important}
.ctc-checkout #order_review{grid-column:2;grid-row:1/span 4;position:sticky;top:120px;padding:28px 28px 30px}
.ctc-checkout #order_review table.shop_table{border:0!important;margin:0 0 4px;width:100%;border-collapse:collapse}
.ctc-checkout #order_review table.shop_table th,.ctc-checkout #order_review table.shop_table td{border:0!important;border-top:1px solid #E6E3DA!important;padding:12px 0!important;background:transparent!important;font-size:16px;vertical-align:top}
.ctc-checkout #order_review thead{display:none}
.ctc-checkout #order_review .cart_item td{border-top:0!important}
.ctc-checkout #order_review .product-name{font-weight:700;color:#1C2333}
.ctc-checkout #order_review .product-total,.ctc-checkout #order_review tfoot td{text-align:right;font-family:Outfit,sans-serif;font-weight:700}
.ctc-checkout #order_review .order-total th,.ctc-checkout #order_review .order-total td{font-family:Outfit,sans-serif!important;font-weight:800!important;font-size:22px!important;color:#1C2333}
.ctc-checkout .ctc-next{margin:22px -28px -30px;background:#1C2333;color:#D9DCE1;border-radius:0 0 14px 14px;padding:24px 28px;font-size:15px;line-height:1.6}
.ctc-checkout .ctc-next strong{display:block;color:#fff;font-family:Outfit,sans-serif;font-size:18px;margin-bottom:8px}
.ctc-checkout .ctc-next ol{margin:0 0 12px;padding-left:1.2em}.ctc-checkout .ctc-next a{color:#D4A93A}
.ctc-checkout .ctc-pay-card{padding:32px 36px 36px}
.ctc-checkout #payment{background:transparent!important;border-radius:0!important}
.ctc-checkout #payment ul.payment_methods{border:0!important;padding:0!important;margin:0 0 18px!important;display:grid;gap:10px}
.ctc-checkout #payment ul.payment_methods>li{list-style:none;background:#fff;border:1px solid #D9DCE1;border-radius:12px;padding:14px 18px!important;margin:0!important}
.ctc-checkout #payment ul.payment_methods>li:has(input:checked){border-color:#D4A93A;background:#FBF5E3}
.ctc-checkout #payment ul.payment_methods>li>label{font-weight:700;color:#1C2333;font-size:17px}
.ctc-checkout #payment div.payment_box{background:#fff!important;border-radius:10px;margin:12px 0 0!important;padding:16px!important;color:#4B5058;font-size:15px}
.ctc-checkout #payment div.payment_box::before{display:none!important}
.ctc-checkout #payment .wc_payment_method>label{display:inline-flex;flex-wrap:wrap;align-items:center;column-gap:8px;row-gap:12px;vertical-align:middle}
.ctc-checkout #payment .wc_payment_method>label img{margin:0!important;max-height:28px;width:auto}
.ctc-checkout #payment fieldset.eh-credit-card-form{border:0!important;padding:0!important;margin:0!important;min-width:0}.ctc-checkout #payment fieldset.eh-credit-card-form>br{display:none}
.ctc-checkout #payment .place-order{padding:0!important;margin:0!important}
.ctc-checkout .woocommerce-terms-and-conditions-wrapper{font-size:15px;color:#4B5058;margin:0 0 14px}
.ctc-checkout .woocommerce-privacy-policy-text p{margin:0 0 10px}
@media (max-width:1024px){.ctc-checkout form.checkout{grid-template-columns:minmax(0,1fr)}.ctc-checkout #order_review{grid-column:1;grid-row:auto;position:static}}
@media (max-width:767px){.ctc-store .ctc-card,.ctc-checkout #customer_details .col-1,.ctc-checkout #customer_details .col-2,.ctc-checkout #order_review,.ctc-checkout .ctc-pay-card,.ctc-cart .cart_totals,.ctc-cart table.shop_table.cart{padding:24px 20px 26px}.ctc-store .form-row-first,.ctc-store .form-row-last{width:100%!important;float:none!important}.ctc-checkout .ctc-next{margin:22px -20px -26px;padding:22px 20px}.ctc-store h3,.ctc-store .ctc-card-title,.ctc-cart .cart_totals>h2{font-size:24px!important}}
/* cart: item cards left, order summary right */
.ctc-cart .woocommerce{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:20px 32px;align-items:start}
.ctc-cart .woocommerce>*{min-width:0}
.ctc-cart .woocommerce-notices-wrapper{grid-column:1/-1}
.ctc-cart .wc-empty-cart-message,.ctc-cart .return-to-shop{grid-column:1/-1}
.ctc-cart .cart-collaterals{width:auto!important;float:none!important}
.ctc-cart .cart-collaterals .cart_totals{width:auto!important;float:none!important;position:sticky;top:120px;padding:28px}
.ctc-cart .cart_totals>h2::before{content:"Order Summary"}
.ctc-cart table.shop_table.cart{border-collapse:separate!important;width:100%;padding:8px 28px}
.ctc-cart table.shop_table.cart thead{display:none}
.ctc-cart table.shop_table.cart tr.cart_item{display:grid;grid-template-columns:72px minmax(0,1fr) auto auto;grid-template-areas:"thumb name qty subtotal" "thumb remove qty subtotal";gap:4px 18px;align-items:center;padding:22px 0;border-bottom:1px solid #E6E3DA}
.ctc-cart table.shop_table.cart td{border:0!important;padding:0!important;background:transparent!important;display:block!important;text-align:left!important}
.ctc-cart table.shop_table.cart td::before{display:none!important}
.ctc-cart td.product-thumbnail{grid-area:thumb}.ctc-cart td.product-thumbnail img{width:72px!important;height:72px;object-fit:cover;border-radius:10px;border:1px solid #E6E3DA}
.ctc-cart td.product-name{grid-area:name}.ctc-cart td.product-name a{font-family:Outfit,sans-serif;font-weight:700;font-size:20px;color:#1C2333}
.ctc-cart td.product-price{display:none!important}
.ctc-cart td.product-quantity{grid-area:qty}.ctc-cart td.product-subtotal{grid-area:subtotal;font-family:Outfit,sans-serif;font-weight:800;font-size:24px;color:#1C2333}
.ctc-cart td.product-remove{grid-area:remove}
.ctc-cart td.product-remove a.remove{display:inline!important;width:auto!important;height:auto!important;font-size:15px!important;font-weight:600;color:#4B5058!important;background:none!important;border:0!important;line-height:1.4!important;text-indent:-9999px;position:relative}
.ctc-cart td.product-remove a.remove::after{content:"Remove";text-indent:0;position:absolute;left:0;top:0;text-decoration:underline}
.ctc-cart td.product-remove a.remove:hover::after{color:#B8901F}
.ctc-cart .quantity .qty{width:72px;border:1px solid #D9DCE1;border-radius:10px;padding:10px;font-size:17px;text-align:center}
.ctc-cart tr:not(.cart_item) td.actions{display:flex!important;flex-wrap:wrap;gap:12px;justify-content:space-between;padding:22px 0 8px!important}
.ctc-cart td.actions .coupon{display:flex;gap:10px;flex-wrap:wrap}
.ctc-cart td.actions .coupon label{display:none}
.ctc-cart #coupon_code{min-width:200px;border:1px solid #D9DCE1;border-radius:10px;padding:12px 14px;font-size:16px}
.ctc-cart .cart_totals table.shop_table{border:0!important;width:100%}
.ctc-cart .cart_totals table.shop_table th,.ctc-cart .cart_totals table.shop_table td{border:0!important;border-top:1px solid #E6E3DA!important;padding:12px 0!important;background:transparent!important;font-size:16px}
.ctc-cart .cart_totals table.shop_table td{text-align:right;font-family:Outfit,sans-serif;font-weight:700}
.ctc-cart .cart_totals .order-total th,.ctc-cart .cart_totals .order-total td{font-family:Outfit,sans-serif!important;font-weight:800!important;font-size:22px!important}
.ctc-cart .wc-empty-cart-message{display:block!important}
.ctc-cart .cart-empty.woocommerce-info{display:block!important;max-width:720px;margin:0 auto!important;background:#fff;border:1px solid #E6E3DA;border-top:6px solid #D4A93A;border-radius:16px 16px 0 0;border-bottom:0;padding:56px 40px 9px!important;text-align:center;font-family:Outfit,sans-serif;font-weight:700;font-size:28px;color:#1C2333}
.ctc-cart .cart-empty.woocommerce-info::before{position:static!important;display:block!important;margin:0 auto 18px;content:"";width:56px;height:56px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4a93a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'/%3E%3C/svg%3E") center/contain no-repeat}
.ctc-cart .return-to-shop{max-width:720px;margin:0 auto!important;background:#fff;border:1px solid #E6E3DA;border-top:0;border-radius:0 0 16px 16px;padding:9px 40px 56px;text-align:center}
.ctc-cart .return-to-shop .button{display:inline-block!important;width:auto!important;background:#D4A93A!important;font-size:20px!important;padding:16px 28px!important}
@media (max-width:1024px){.ctc-cart .woocommerce{grid-template-columns:minmax(0,1fr)}.ctc-cart .cart-collaterals .cart_totals{position:static}}
@media (max-width:767px){.ctc-cart table.shop_table.cart tr.cart_item{grid-template-columns:60px minmax(0,1fr) auto;grid-template-areas:"thumb name subtotal" "thumb qty remove"}.ctc-cart td.product-thumbnail img{width:60px!important;height:60px}.ctc-cart .cart-empty.woocommerce-info{padding:40px 20px 9px!important;font-size:24px}.ctc-cart .return-to-shop{padding:9px 20px 40px}}
.ctc-checkout form.checkout,.ctc-checkout #customer_details,.ctc-checkout .col2-set{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}
.ctc-checkout #customer_details .col-1,.ctc-checkout #customer_details .col-2{padding:32px 36px 36px!important}
.ctc-checkout .woocommerce-billing-fields,.ctc-checkout .woocommerce-shipping-fields,.ctc-checkout .woocommerce-additional-fields{background:transparent!important;border:0!important;padding:0!important;box-shadow:none!important}
@media (max-width:767px){.ctc-checkout #customer_details .col-1,.ctc-checkout #customer_details .col-2{padding:24px 20px 26px!important}}
.ctc-cart table.shop_table.cart td.product-price{display:none!important}
.ctc-cart table.shop_table.cart td.product-subtotal,.ctc-cart table.shop_table.cart td.product-subtotal .amount{font-family:Outfit,sans-serif!important;font-weight:800!important;font-size:24px!important;color:#1C2333!important;text-align:right!important}
@media (max-width:767px){.ctc-cart table.shop_table.cart td.product-name a{font-size:17px!important;line-height:1.3!important}.ctc-cart table.shop_table.cart td.product-subtotal,.ctc-cart table.shop_table.cart td.product-subtotal .amount{font-size:19px!important}}
.ctc-store table.shop_table td .amount,.ctc-store table.shop_table td bdi{font-family:Outfit,sans-serif!important;font-weight:700!important;font-size:17px!important;color:#1C2333!important}
.ctc-store table.shop_table .order-total .amount,.ctc-store table.shop_table .order-total bdi{font-size:24px!important;font-weight:800!important}
.ctc-store table.shop_table th{font-size:16px!important;font-weight:600!important;color:#4B5058!important;text-transform:none!important;letter-spacing:0!important}
.ctc-store table.shop_table .order-total th{font-family:Outfit,sans-serif!important;font-size:22px!important;font-weight:800!important;color:#1C2333!important}
/* Live chat: LiveChat's own launcher bar is hidden; this site-styled button opens the same chat window */
.ctc-chat-btn{position:fixed;right:24px;bottom:19px;z-index:2147483000;display:inline-flex;align-items:center;gap:10px;padding:14px 22px 14px 18px;border:0;border-radius:999px;background:${C.gold};color:#fff;font-family:Outfit,sans-serif;font-size:17px;font-weight:700;line-height:1;cursor:pointer;box-shadow:0 12px 28px -10px rgba(28,35,51,.55);transition:background-color .2s,transform .2s}
.ctc-chat-btn:hover{background:${C.goldHover};transform:translateY(-2px)}.ctc-chat-btn svg{width:22px;height:22px;flex:none}
.ctc-chat-btn.ctc-chat-hidden{display:none}
@media (max-width:767px){.ctc-chat-btn{right:16px;bottom:16px;padding:0;width:56px;height:56px;justify-content:center}.ctc-chat-btn span{display:none}}
/* footer's last row: © + links left-aligned in one line (desktop); stacked left on tablet/phone, clear of the chat button */
.ctc-footer>.e-con:last-child>.e-con-inner{justify-content:flex-start!important;column-gap:28px!important;padding-right:200px}
.ctc-footer>.e-con:last-child .elementor-icon-list-items{justify-content:flex-start}
@media (max-width:1024px){.ctc-footer>.e-con:last-child>.e-con-inner{flex-direction:column!important;align-items:flex-start!important;row-gap:10px!important;text-align:left}}
@media (max-width:767px){.ctc-footer>.e-con:last-child>.e-con-inner{padding-right:64px}}
.ctc-chat-card{cursor:pointer}
</style>
<script>(function(){var mob=window.matchMedia('(max-width:1024px)');function closeAll(){document.querySelectorAll('.ctc-dd.ctc-dd-open').forEach(function(d){d.classList.remove('ctc-dd-open');});}
document.addEventListener('click',function(e){var b=e.target.closest('.ctc-burger,.ctc-menu-close');if(b){e.preventDefault();var open=document.body.classList.toggle('ctc-menu-open');if(!open)closeAll();return;}
var t=e.target.closest('.ctc-dd>.ctc-navlink');if(t){e.preventDefault();var d=t.closest('.ctc-dd'),was=d.classList.contains('ctc-dd-open');closeAll();if(!was)d.classList.add('ctc-dd-open');return;}if(!e.target.closest('.ctc-dd'))closeAll();
var chat=e.target.closest('.ctc-open-chat');if(chat){e.preventDefault();try{if(window.LiveChatWidget)window.LiveChatWidget.call('maximize');else if(window.LC_API)window.LC_API.open_chat_window();}catch(x){}return;}
if(e.target.closest('.ctc-navlinks a')&&!e.target.closest('.ctc-menu-close')){document.body.classList.remove('ctc-menu-open');closeAll();}});
window.addEventListener('pageshow',function(){document.body.classList.remove('ctc-menu-open');closeAll();});
/* mobile badge sliders: one logo at a time, auto-advance, pause while touched */
function initSliders(){document.querySelectorAll('.ctc-badge-slider').forEach(function(el){if(el._ctc)return;el._ctc=1;var hold=false;el.addEventListener('touchstart',function(){hold=true;},{passive:true});el.addEventListener('touchend',function(){setTimeout(function(){hold=false;},3000);});
setInterval(function(){if(hold||!window.matchMedia('(max-width:767px)').matches||el.scrollWidth<=el.clientWidth+2)return;var n=Math.round(el.scrollLeft/el.clientWidth)+1,c=el.children.length;el.scrollTo({left:(n>=c?0:n)*el.clientWidth,behavior:'smooth'});},2800);});}
if(document.readyState!=='loading')initSliders();else document.addEventListener('DOMContentLoaded',initSliders);
/* live chat: hide LiveChat's launcher bar, show the site-styled button; reopen-on-click via the LiveChat API */
function initChat(){if(document.querySelector('.ctc-chat-btn'))return;var btn=document.createElement('button');btn.type='button';btn.className='ctc-chat-btn ctc-chat-hidden';btn.setAttribute('aria-label','Chat with us');
btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span>Chat with us</span>';
btn.addEventListener('click',function(){try{if(window.LiveChatWidget){window.LiveChatWidget.call('maximize');}else if(window.LC_API){window.LC_API.open_chat_window();}}catch(x){}});document.body.appendChild(btn);
var tries=0,t=setInterval(function(){var W=window.LiveChatWidget;if(!W){if(++tries>60)clearInterval(t);return;}clearInterval(t);
W.on('ready',function(){try{var st=W.get('state');if(!st||st.visibility!=='maximized'){W.call('hide');btn.classList.remove('ctc-chat-hidden');}}catch(x){W.call('hide');btn.classList.remove('ctc-chat-hidden');}});
W.on('visibility_changed',function(d){if(d.visibility==='minimized'){W.call('hide');btn.classList.remove('ctc-chat-hidden');}else if(d.visibility==='maximized'){btn.classList.add('ctc-chat-hidden');}});
try{var st0=W.get('state');if(st0&&st0.visibility!=='maximized'){W.call('hide');btn.classList.remove('ctc-chat-hidden');}}catch(x){}},500);}
if(document.readyState!=='loading')initChat();else document.addEventListener('DOMContentLoaded',initChat);
/* chat button: right edge lines up with the footer's phone number (desktop; on tablet/phone the number moves left) */
function alignChat(){var b=document.querySelector('.ctc-chat-btn'),t=document.querySelector('.ctc-footer a[href^="tel:"]');if(!b)return;if(!t||window.matchMedia('(max-width:1024px)').matches){b.style.right='';return;}
var w=t.closest('.elementor-widget')||t,r=w.getBoundingClientRect();var title=t.querySelector('.elementor-heading-title')||t;var rt=title.getBoundingClientRect();var right=Math.max(r.right,rt.right);b.style.right=Math.max(12,Math.round(document.documentElement.clientWidth-right))+'px';}
window.addEventListener('resize',alignChat);window.addEventListener('load',alignChat);setTimeout(alignChat,800);setTimeout(alignChat,3000);
})();</script>`;

const navLink = (label, url) => widget('heading', {
  title: label, header_size: 'span', link: link(url), title_color: C.navy,
  ...typo('typography', BODY, [18, 18, 17], 600, { lh: 1.3, ls: 0 }), ...wcls('ctc-navlink'),
});
function dropdown(label, url, items) {
  return container({ content_width: 'full', width: auto, padding: box(0), flex_direction: 'column', ...cls('ctc-dd') }, [
    widget('heading', {
      title: `${label}<span class="ctc-caret">▾</span>`, header_size: 'span', title_color: C.navy,
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
              ['Book Add-Ons', URL.books],
            ]),
            dropdown('Info', URL.become, [
              ['Helpful Guides &amp; How-Tos', URL.guides], ['How to Become a CTEC Registered Tax Preparer', URL.become], ['How To Renew Your CTEC Registration', URL.renew],
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
  // Claude Design "Footer": logo + blurb left, "Call Us Today" right; copyright + policy links underneath.
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0),
    background_background: 'classic', background_color: C.footer,
    border_border: 'solid', border_width: box(3, 0, 0, 0), border_color: C.gold, ...cls('ctc-footer'),
  }, [
    container({
      content_width: 'boxed', boxed_width: px(1392), flex_direction: 'row', flex_wrap: 'wrap', flex_justify_content: 'space-between', flex_align_items: 'center',
      flex_gap: gap(32), padding: box(56, 24, 40, 24), padding_mobile: box(44, 20, 32, 20),
    }, [
      stack([
        image(m.logo, { width: 168, link: URL.home, align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(168) } }),
        text('A CTEC &amp; IRS Approved Education Provider. Proud Member of Business Consumer Alliance and TrustPilot.', { color: C.muted, size: 16, lh: 1.6, maxW: 420 }),
      ], { gap: 14, settings: { width: auto, width_mobile: px(100, '%') } }),
      stack([
        eyebrow('Call Us Today', C.gold, 'right', { size: 14, settings: { align_tablet: 'left', align_mobile: 'left' } }),
        widget('heading', { title: PHONE.label, header_size: 'span', link: link(PHONE.tel), title_color: C.white, align: 'right', align_tablet: 'left', align_mobile: 'left', ...typo('typography', HEAD, 32, 800, { lh: 1, ls: 0 }) }),
        text('Monday – Friday, 9am – 4pm PST', { color: '#8A8F99', size: 15, lh: 1.5, align: 'right', settings: { align_tablet: 'left', align_mobile: 'left' } }),
      ], { gap: 8, settings: { width: auto, width_mobile: px(100, '%') } }),
    ]),
    container({
      content_width: 'boxed', boxed_width: px(1392), flex_direction: 'row', flex_wrap: 'wrap', flex_justify_content: 'space-between', flex_align_items: 'center',
      flex_gap: gap(16), padding: box(32, 24, 32, 24), padding_mobile: box(22, 20, 22, 20), // equal top/bottom; 86px tall row = 50px chat button + 18px above/below
      border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.navy2,
    }, [
      text('© California Tax Courses 2026', { color: C.muted, size: 15, lh: 1.5, settings: { _element_width: 'auto' } }),
      linkList([['Terms &amp; Conditions', URL.terms], ['Privacy Policy', URL.privacy], ['Refund Policy', URL.refund], ['Facebook', URL.facebook]],
        { inline: true, space: 20, size: 15, settings: { _element_width: 'auto' } }),
    ]),
  ], false)];
}

module.exports = { STYLE, header, footer };
