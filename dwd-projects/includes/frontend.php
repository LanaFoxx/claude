<?php
defined( 'ABSPATH' ) || exit;

add_action( 'wp_enqueue_scripts', function () {
	// The site's one typeface, Urbanist, loaded on every page (Elementor's own Google Fonts are switched off below).
	wp_register_style( 'dwdp-fonts', 'https://fonts.googleapis.com/css2?family=Urbanist:wght@200;300;400;500;600;700;900&display=swap', array(), null );
	wp_enqueue_style( 'dwdp-fonts' );
	wp_register_style( 'dwdp-front', DWDP_URL . 'assets/front.css', array( 'dwdp-fonts' ), DWDP_VERSION );
	wp_register_script( 'dwdp-front', DWDP_URL . 'assets/front.js', array(), DWDP_VERSION, true );
	if ( is_singular( DWDP_CPT ) ) {
		wp_enqueue_style( 'dwdp-front' );
	}
} );

function dwdp_enqueue_front() {
	wp_enqueue_style( 'dwdp-front' );
	wp_enqueue_script( 'dwdp-front' );
}

/**
 * The site-wide design styles (layout, header, menu, cards, forms, dots). They used to be printed
 * from outside this plugin; keeping them here means they always load. Printed early in <head>,
 * in the same place and with the same ids as before, so later rules still override them.
 */
add_action( 'wp_head', function () {
	foreach ( array( 'dw-site', 'dwd-site' ) as $name ) {
		$file = DWDP_DIR . 'assets/' . $name . '.css';
		if ( is_readable( $file ) ) {
			echo '<style id="' . esc_attr( $name ) . '-css">' . file_get_contents( $file ) . '</style>' . "\n"; // phpcs:ignore
		}
	}
}, 9 );

/**
 * Dotted backgrounds only on the dark sections, so a dotted section never sits directly
 * against another one. The light sections (dw-dots-light, plus the Elementor sections that
 * got the same dots by ID) become plain.
 */
add_action( 'wp_head', function () {
	$ids = array( '89a6760f', '7d8e8aa3', '7f41de1b', '969108eb', '9ec54d3c', 'b8fbd2ba', '51ae0a9b', 'a5de6e96', '8fc7c8a7', 'c33bf56b', '28747d18', 'f5415e51', 'bbaddbd9', '8b5f9ec2', 'a1ecfee3', '96459fde' );
	$sel = array( 'html body .dw-dots-light' );
	foreach ( $ids as $id ) {
		$sel[] = 'html body .elementor-element-' . $id;
	}
	echo '<style id="dwdp-no-light-dots">' . implode( ',', $sel ) . '{background-image:none!important}'
		// Anything marked dark gets the white dots, even if an old rule lists it as a light section.
		. 'html body .dw-dots-dark.dw-dots-dark{background-image:radial-gradient(rgba(255,255,255,0.12) 1px,transparent 1px)!important;background-size:22px 22px!important}</style>' . "\n";
}, 99 );

/**
 * Tablet and small-laptop layout fixes for the Elementor header and homepage hero:
 * - 1025-1280px: tighter menu so it never wraps onto two lines; buttons never wrap.
 * - up to 1180px: the hero stacks, text centred on top and the laptop underneath at full width.
 */
add_action( 'wp_head', function () {
	echo '<style id="dwdp-tablet">'
		. '.elementor-location-header .elementor-button,.elementor-location-header .elementor-button-text{white-space:nowrap}'
		. '.elementor-location-header .elementor-menu-toggle{background:transparent!important;border:0!important}'
		. '@media(min-width:1025px) and (max-width:1280px){'
		. '.elementor-element-0df6828 .elementor-nav-menu{flex-wrap:nowrap!important}'
		. '.elementor-element-0df6828 .elementor-nav-menu .elementor-item{padding-left:11px!important;padding-right:11px!important;font-size:15.5px!important;white-space:nowrap}'
		. '.elementor-location-header .elementor-button{padding-left:18px!important;padding-right:18px!important}}'
		. '@media(min-width:768px) and (max-width:1180px){'
		. '.elementor-element-dw0000a{flex-direction:column!important;align-items:center!important;gap:46px!important}'
		. '.elementor-element-dw00007{width:100%!important;max-width:680px;align-items:center!important;text-align:center}'
		. '.elementor-element-dw00007 .elementor-heading-title,.elementor-element-dw00007 .elementor-widget-text-editor{text-align:center!important}'
		. '.elementor-element-dw00009{width:100%!important;max-width:860px}'
		. '.elementor-element-dw00009 .dwdp-laptop{width:90%}}'
		. '</style>' . "\n";
	// Reusable hero glow for dark sections (class "dw-glow" on an Elementor container).
	// Homepage hero glow sits behind the headline (left column on desktop, centered when the hero stacks).
	echo '<style id="dwdp-hero-glow">.elementor-element-f28e5483::before{top:-60px!important;right:auto!important;left:calc(50% - 760px)!important;width:820px!important;height:720px!important;background:radial-gradient(circle,rgba(27,126,195,.38),transparent 64%)!important}'
		. '@media(max-width:1180px){.elementor-element-f28e5483::before{left:50%!important;transform:translateX(-50%);top:-120px!important}}</style>' . "\n";
	echo '<style id="dwdp-glow">.dw-glow{position:relative;overflow:hidden}.dw-glow::before{content:"";position:absolute;top:-180px;left:50%;transform:translateX(-50%);width:820px;max-width:120%;height:620px;background:radial-gradient(circle,rgba(27,126,195,.32),transparent 65%);pointer-events:none}.dw-glow>*{position:relative;z-index:1}</style>' . "\n";
}, 99 );

/** The About page was retired; its content lives in the homepage "Why Dream Web" section. */
add_action( 'template_redirect', function () {
	$path = trim( (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ), '/' ); // phpcs:ignore
	if ( 'about' === $path ) {
		wp_safe_redirect( home_url( '/#about' ), 301 );
		exit;
	}
}, 1 );

/**
 * Buttons: all caps with wide letter spacing, for a more upscale feel. Covers Elementor
 * buttons and form submits plus the plugin's own buttons.
 */
add_action( 'wp_head', function () {
	// One button style everywhere: same thin uppercase type, same height, padding and minimum width.
	$btn = 'a.elementor-button,button.elementor-button,.elementor-button[type=submit],.dwdp-btn,.dwf-zoom,.dw-pbtn,.dw-form button,.dw-host-btn';
	$txt = '.elementor-button .elementor-button-text,.elementor-button .elementor-button-content-wrapper';
	echo '<style id="dwdp-buttons">'
		. $btn . ',' . $txt . '{text-transform:uppercase!important;letter-spacing:.16em!important;font-family:Urbanist,sans-serif!important;font-size:14px!important;font-weight:600!important;line-height:1.2!important}'
		. $btn . '{display:inline-flex!important;align-items:center;justify-content:center;box-sizing:border-box;height:52px!important;padding:0 32px!important;min-width:232px;border-radius:8px!important;white-space:nowrap}'
		. '@media(max-width:480px){' . $btn . '{min-width:0;padding:0 26px!important}}'
		// Shared closing band: dark, dots, glow, even spacing (class dw-cta-band on an Elementor container).
		. '.dw-cta-band{border-top:1px solid rgba(255,255,255,.07)}.dw-cta-band>.e-con-inner{gap:0!important}'
		. '.dw-cta-band>.e-con-inner>.elementor-widget-heading{margin-bottom:16px!important}.dw-cta-band>.e-con-inner>.elementor-widget-text-editor{margin-bottom:32px!important}.dw-cta-band .elementor-widget-text-editor p{margin:0}'
		. '</style>' . "\n";
}, 99 );

/** A phone icon in front of every phone-number link on the site. */
add_action( 'wp_head', function () {
	$svg = rawurlencode( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>' );
	echo '<style id="dwdp-phone-icon">a[href^="tel:"].dw-phone-ico::before{content:"";display:inline-block;width:.95em;height:.95em;margin-right:.45em;vertical-align:-.12em;background-color:currentColor;-webkit-mask:url("data:image/svg+xml,' . $svg . '") center/contain no-repeat;mask:url("data:image/svg+xml,' . $svg . '") center/contain no-repeat}a[href^="tel:"].dw-phone-ico:has(svg,img,i)::before{display:none}</style>' . "\n";
}, 99 );

/**
 * The icon only goes on standalone numbers (footer, contact cards). A number that sits inside a
 * sentence ("or call ...", "Call or text ... and") stays plain text.
 */
add_action( 'wp_footer', function () {
	echo "<script>document.querySelectorAll('a[href^=\"tel:\"]').forEach(function(a){var p=a.parentElement;if(!p||a.querySelector('svg,img,i'))return;var t=p.textContent.replace(a.textContent,'');if(!/[A-Za-z]/.test(t))a.classList.add('dw-phone-ico');});</script>\n";
}, 99 );

// Phones: the reviews row advances one card every 4 seconds and loops; a swipe pauses it for a moment.
add_action( 'wp_footer', function () {
	echo "<script>(function(){var r=document.querySelector('.elementor-element-dw0001t');if(!r)return;var hold=0;['touchstart','pointerdown','wheel'].forEach(function(e){r.addEventListener(e,function(){hold=Date.now()+8000;},{passive:true});});"
		. "setInterval(function(){if(!matchMedia('(max-width:767px)').matches||Date.now()<hold)return;var c=r.children;if(!c.length)return;var w=c[0].getBoundingClientRect().width+parseFloat(getComputedStyle(r).columnGap||0),i=Math.round(r.scrollLeft/w)+1;if(i>=c.length)i=0;r.scrollTo({left:i*w,behavior:'smooth'});},4000);})();</script>\n";
}, 99 );

/**
 * Inner-page hero titles: one size on every page (as large as the homepage headline).
 */
add_action( 'wp_head', function () {
	$h = '.elementor-element-7e6232a .elementor-heading-title,.elementor-element-dw0008r .elementor-heading-title,.elementor-element-dw0005k .elementor-heading-title,.elementor-element-18a049b .elementor-heading-title,.elementor-element-4bbde7c .elementor-heading-title';
	echo '<style id="dwdp-h1">' . $h . '{font-size:52px!important;line-height:1.04!important}@media(max-width:1024px){' . $h . '{font-size:42px!important}}@media(max-width:767px){' . $h . '{font-size:34px!important}}</style>' . "\n";
}, 99 );

/**
 * Homepage "What's included": less space above and below "See how the process works".
 */
add_action( 'wp_head', function () {
	echo '<style id="dwdp-included-space">.elementor-element-9e67fb33{padding-bottom:0!important}.elementor-element-9e67fb33>.e-con-inner{padding-bottom:52px!important}'
		. '@media(min-width:768px){.elementor-element-dw0000g{margin-top:-20px!important}.elementor-element-9e67fb33>.e-con-inner{padding-bottom:44px!important}}@media(max-width:767px){.elementor-element-9e67fb33>.e-con-inner{padding-bottom:40px!important}.elementor-element-dw0000g{margin-top:8px!important}}</style>' . "\n";
}, 99 );

/**
 * Page header eyebrows ("Step by step", "Hosting", "My work"...) in the same outlined pill as the blog's.
 */
add_action( 'wp_head', function () {
	$e = '.elementor-element-a9c373f .elementor-heading-title,.elementor-element-dw0008q .elementor-heading-title,.elementor-element-dw0005j .elementor-heading-title,.elementor-element-3b3802c .elementor-heading-title,.elementor-element-20d4377 .elementor-heading-title';
	echo '<style id="dwdp-eyebrow-pill">' . $e . '{display:inline-block!important;border:1px solid rgba(255,255,255,0.22)!important;border-radius:100px!important;padding:9px 18px!important;font:500 15.5px/1.5 Urbanist,sans-serif!important;color:#C9DAE8!important;letter-spacing:.02em!important;text-transform:none!important}'
		// Same height on every page (the blog's): pull up the eyebrows that sit lower.
		. '@media(min-width:1025px){.elementor-element-a9c373f{margin-top:-18px!important}.elementor-element-dw0008q{margin-top:-20px!important}.elementor-element-3b3802c{margin-top:-28px!important}}</style>' . "\n";
}, 99 );

// Elementor would otherwise load six unused Google Fonts families (Roboto, Karla, Archivo, Poppins...) in every weight.
add_filter( 'elementor/frontend/print_google_fonts', '__return_false' );

/**
 * Typography: Urbanist everywhere. Headings 900, body 300, nav 500 (active 600), buttons 600.
 * Small text (under 14px) and inputs stay at 400 for legibility; those weights are set where each style is defined.
 */
add_action( 'wp_head', function () {
	$not_icons = ':not(i):not(svg):not(svg *):not([class*="eicon"]):not([class*="fa-"]):not(.fa):not(.fas):not(.far):not(.fab)';
	echo '<style id="dwdp-type">'
		. 'body,body *' . $not_icons . ',input,select,textarea,button{font-family:"Urbanist",sans-serif!important}'
		. 'h1,h2,h3,h4{font-weight:900;letter-spacing:.01em}'
		. 'body{font-weight:300}.elementor-widget-html h1,.elementor-widget-html h2,.elementor-widget-html h3,.elementor-widget-html h4{font-weight:900!important}'
		. '.elementor-field-subgroup label,.elementor-field-option label,.screen-reader-text{font-weight:400}'
		. '.elementor-element-90f59da .elementor-tab-content,.elementor-element-90f59da .elementor-tab-content p{font-weight:300!important}'
		. 'h1,h1.elementor-heading-title,.elementor-element-2460b52 .elementor-heading-title{line-height:1.04!important}'
		. 'h2,h2.elementor-heading-title{line-height:1.08!important}'
		. '.elementor-widget-heading h1.elementor-heading-title,.elementor-widget-heading h2.elementor-heading-title,.elementor-widget-heading h3.elementor-heading-title,.elementor-widget-heading h4.elementor-heading-title,.elementor-element-2460b52 .elementor-heading-title{letter-spacing:.01em!important}'
		. '.dwb-article h2,.dwb-article h3,.dwb-related-title{font-weight:900!important}'
		// Nav links.
		. '.elementor-nav-menu a.elementor-item,.elementor-nav-menu--dropdown a{font-weight:500!important}'
		. '.elementor-nav-menu a.elementor-item-active,.elementor-nav-menu .current-menu-item>a{font-weight:600!important}'
		// Hero: "You dream it." thin, "I build it." heavy in light blue.
		. '.elementor-element-dw00002 .elementor-heading-title{font-weight:200!important}'
		. '.elementor-element-2460b52 .elementor-heading-title{font-weight:900!important;color:#4BA3DC!important}'
		. '.elementor-element-dw00003,.elementor-element-dw00003 p{color:#C9DAE8!important;font-weight:300!important}'
		. '@media(min-width:1025px){.elementor-element-dw00002 .elementor-heading-title{font-size:52px!important}.elementor-element-dw00003,.elementor-element-dw00003 p{font-size:16.5px!important}}'
		. '</style>' . "\n";
}, 999 );

// No underline arcs under any title.
add_action( 'wp_head', function () {
	echo '<style id="dwdp-no-arcs">.dw-swoosh .elementor-heading-title::after,.dw-swoosh.elementor-widget-heading .elementor-heading-title::after,.dw-swoosh-c .elementor-heading-title::after,.dww-title::after{display:none!important;content:none!important}</style>' . "\n";
}, 999 );

// Phones: easier reading. Body text at a regular weight and at least 16px, thin heading halves a touch heavier, larger section and card headings.
add_action( 'wp_head', function () {
	echo '<style id="dwdp-mobile-read">@media(max-width:767px){body{font-weight:400}.elementor-widget-text-editor,.elementor-widget-text-editor p:not([style*="font-weight"]),.elementor-widget-html p:not([style*="font-weight"]),li,.dwt-note,.dwt-note span,.dw-wt p,.dw-review p,.dwdp-single p,.dwb-article,.dwb-article p,.dwb-card-ex,.dww-card,.elementor-tab-content,.elementor-tab-content p{font-weight:400!important}.elementor-widget-text-editor:not(.elementor-element-dw0001g),.elementor-widget-text-editor:not(.elementor-element-dw0001g) p:not([style*="font-size"]),.elementor-widget-html p:not([style*="font-size"]):not([class*="eyebrow"]):not([class*="-k"]),.elementor-widget-html li,.dwt-card>p,.dwt-note,.elementor-tab-content p{font-size:16px!important;line-height:1.65!important}span[style*="font-weight:200"],.elementor-element-dw00002 .elementor-heading-title{font-weight:300!important}.elementor-widget-heading h2.elementor-heading-title{font-size:29px!important}.elementor-widget-heading h3.elementor-heading-title,.dwt-card h3,.elementor-widget-html h3{font-size:20px!important}}</style>' . "\n";
}, 1000 );

// Homepage quote: 34px on wide screens; a little smaller on small laptops so it stays on two lines.
add_action( 'wp_head', function () {
	echo '<style id="dwdp-quote">@media(min-width:1025px) and (max-width:1279px){.elementor-element-dw0001g,.elementor-element-dw0001g p:first-child{font-size:30px!important}}</style>' . "\n";
}, 99 );

// Review cards that link out (Google, Upwork): no underline, a slight lift on hover.
add_action( 'wp_head', function () {
	echo '<style id="dwdp-review-links">' . '.elementor-element-dw0001t>a.e-con{text-decoration:none!important;color:inherit;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}.elementor-element-dw0001t>a.e-con:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(18,41,62,.12)!important}' . '</style>' . "\n";
}, 99 );

/**
 * Header: frosted glass on every page. A mostly-white background with a blur, so the page shows
 * faintly through it as it scrolls underneath.
 */
add_action( 'wp_head', function () {
	echo '<style id="dwdp-header-glass">'
		// The glass lives on a pseudo-element: a backdrop-filter on the header itself would trap the fixed mobile menu.
		. '.dw-header{background:transparent!important;box-shadow:0 6px 24px rgba(18,41,62,.06)!important}'
		. '.dw-header::before{content:"";position:absolute;inset:0;z-index:-1;background:rgba(255,255,255,.86)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;backdrop-filter:blur(16px) saturate(160%)!important;opacity:1!important}'
		. '.dw-header .elementor-menu-toggle{background:transparent!important}'
		// Logo lines up with the left edge of the page content.
		. '.dw-header .elementor-widget-image{margin-left:20px!important}@media(max-width:767px){.dw-header .elementor-widget-image{margin-left:24px!important}}'
		. '</style>' . "\n";
}, 99 );

/**
 * On phones, card sections that would stack into a long column become one swipeable row
 * (scroll snap, next card peeking in): homepage "included" cards and review badges, hosting
 * cards and the contact steps.
 */
add_action( 'wp_head', function () {
	$rows  = '.elementor-element-dw00016,.elementor-element-dw0001t,.elementor-element-dw000ad';
	$cards = '.elementor-element-dw00016>.e-con,.elementor-element-dw0001t>.e-con,.elementor-element-dw000ad>.e-con';
	echo '<style id="dwdp-swipe">@media(max-width:767px){'
		. $rows . ',.dwc-steps{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;overflow-x:auto!important;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:14px!important;margin-left:-20px!important;margin-right:-20px!important;padding:6px 20px 26px!important;width:calc(100% + 40px)!important;max-width:none!important;scroll-padding:0 20px}'
		. $rows . ',.dwc-steps{}' . str_replace( ',', '::-webkit-scrollbar,', $rows ) . '::-webkit-scrollbar,.dwc-steps::-webkit-scrollbar{display:none}'
		. $cards . ',.dwc-steps>.dwc-step{flex:0 0 82%!important;width:82%!important;max-width:82%!important;scroll-snap-align:start;margin:0!important}'
		// No tinted band behind the swipe rows: drop the row backgrounds and the clipped card shadows.
		. $rows . ',.dwc-steps{background:transparent!important}' . $cards . ',.dwc-steps>.dwc-step{box-shadow:0 1px 0 rgba(18,41,62,.04)!important}'
		// Homepage hero: everything centered and the laptop fully on screen.
		. '.elementor-element-dw00007{align-items:center!important;text-align:center}.elementor-element-dw00007 .elementor-heading-title,.elementor-element-dw00007 .elementor-widget-text-editor{text-align:center!important}'
		. '.elementor-element-dw00007 .elementor-widget-html{align-self:center}.elementor-element-dw00006{justify-content:center!important;flex-direction:column!important;align-items:center!important}'
		. '.elementor-element-dw00009 .dwdp-laptop{width:100%!important}.dwdp-vslider.is-laptop{align-items:center!important}'
		// "What's included" heading centered; less space around "See how the process works".
		. '.elementor-element-dw0000f{align-items:center!important;text-align:center}.elementor-element-dw0000f .elementor-heading-title,.elementor-element-dw0000f .elementor-widget-text-editor{text-align:center!important}'
		. '.elementor-element-dw0000g{margin-top:0!important}.elementor-element-9e67fb33>.e-con-inner{row-gap:14px!important;gap:14px!important}.elementor-element-dw0000f{padding-bottom:0!important;margin-bottom:0!important}.elementor-element-dw00016{padding-bottom:14px!important}'
		// Homepage FAQ intro and "Let's build your website": centered, buttons stacked in the middle.
		. '.elementor-element-b7671e0,.elementor-element-dw0002c{align-items:center!important;text-align:center!important}'
		. '.elementor-element-b7671e0 .elementor-heading-title,.elementor-element-b7671e0 .elementor-widget-text-editor,.elementor-element-b7671e0 .elementor-button-wrapper,.elementor-element-dw0002c .elementor-heading-title,.elementor-element-dw0002c .elementor-widget-text-editor,.elementor-element-dw0002c .elementor-button-wrapper{text-align:center!important}'
		. '.elementor-element-b7671e0 .elementor-heading-title::after,.elementor-element-dw0002c .elementor-heading-title::after{margin-left:auto!important;margin-right:auto!important;background-position:center!important}'
		. '.elementor-element-dw0002b{flex-direction:column!important;align-items:center!important;justify-content:center!important}'
		// Footer: everything centered, "Call today" above the number with a small phone icon beside it.
		. '.dwf{flex-direction:column!important;justify-content:center!important;gap:20px!important}'
		. '.dwf .dwf-phone{display:grid!important;grid-template-columns:auto auto;justify-content:center;align-items:center;column-gap:8px;row-gap:2px}.dwf .dwf-call-t{display:contents!important}'
		. '.dwf .dwf-call-t small{grid-column:1/-1;grid-row:1;text-align:center}.dwf .dwf-call-ic{grid-column:1;grid-row:2}.dwf .dwf-call-t b{grid-column:1/-1;grid-row:2;margin-top:0!important}'
		// Reviews: one full-width card at a time, centered (auto-advances every 4 seconds, below).
		. '.elementor-element-dw0001t{padding-top:6px!important;padding-bottom:6px!important}.elementor-element-dw0001t>.e-con{flex:0 0 100%!important;width:100%!important;max-width:100%!important;scroll-snap-align:center;justify-content:center!important;align-items:center!important;text-align:center}'
		. '}</style>' . "\n";
	// Footer icons everywhere: small, no circles. Review cards: equal space above and below.
	echo '<style id="dwdp-footer-icons">.dwf .dwf-call-ic{display:none!important}.dwf .dwf-call-t{align-items:center!important;text-align:center!important}.dwf-icons{gap:20px!important;align-items:center}.dwf-ico,.dwf-ico:hover,.dwf-call-ic{width:auto!important;height:auto!important;border:0!important;border-radius:0!important;background:none!important}'
		. '.dwf-ico svg{width:15px!important;height:15px!important}.dwf-ico:hover svg{fill:#fff}.dwf-ico[href*="linkedin"] svg{width:18px!important;height:18px!important}.dwf-call-ic svg{width:15px!important;height:15px!important}'
		. '.elementor-element-dw0001t>.e-con .elementor-widget:last-child p:last-child{margin-bottom:0!important}.elementor-element-dw0001t>.e-con{padding-top:34px!important;padding-bottom:30px!important}</style>' . "\n";
}, 99 );

/** Case-study pages use the plugin template (inside the site's header/footer). */
add_filter( 'template_include', function ( $template ) {
	if ( is_singular( DWDP_CPT ) ) {
		$theme = locate_template( array( 'single-' . DWDP_CPT . '.php' ) );
		return $theme ? $theme : DWDP_DIR . 'templates/single-project.php';
	}
	return $template;
} );

/**
 * /portfolio/<slug>/ belongs to projects, but keep any real child page of the
 * Portfolio page working if no project has that slug.
 */
add_filter( 'request', function ( $vars ) {
	if ( empty( $vars[ DWDP_CPT ] ) || ! empty( $vars['post_type'] ) && DWDP_CPT !== $vars['post_type'] ) {
		return $vars;
	}
	$slug  = $vars[ DWDP_CPT ];
	$found = get_posts(
		array(
			'post_type'      => DWDP_CPT,
			'name'           => $slug,
			'post_status'    => is_user_logged_in() ? 'any' : 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);
	if ( $found ) {
		return $vars;
	}
	$path = dwdp_base_slug() . '/' . $slug;
	$page = get_page_by_path( $path );
	return ( $page && 'publish' === $page->post_status ) ? array( 'pagename' => $path ) : $vars;
} );

/** Project card used on the Portfolio page: the hero on a laptop with the phone view beside it, then name and industry. */
function dwdp_card_html( $p ) {
	$mock  = absint( dwdp_get( $p->ID, 'mockup' ) );
	$phone = $mock ? '<span class="dw-pphone">' . dwdp_img( $mock, get_the_title( $p ) . ' website on mobile', array( 'loading' => 'lazy' ) ) . '</span>' : '';
	$label = dwdp_number( $p->ID ) . ' · ' . dwdp_get( $p->ID, 'industry' );
	$name  = get_the_title( $p );
	$img   = dwdp_img( dwdp_get( $p->ID, 'cover' ), $name . ' website', array( 'loading' => 'lazy' ) );
	return sprintf(
		'<a class="dw-pcard" href="%1$s"><span class="dw-pshot"><span class="dwdp-laptop"><span class="dwdp-lid"><i class="dwdp-cam"></i><span class="dwdp-lscreen">%3$s</span></span><span class="dwdp-base"></span></span>%5$s</span><span class="dw-pfoot"><span class="dw-pmeta"><b>%2$s</b><em>%4$s</em></span><span class="dw-pbtn">View project →</span></span></a>',
		esc_url( get_permalink( $p ) ),
		esc_html( $name ),
		$img,
		esc_html( $label ),
		$phone
	);
}

/**
 * [dwd_portfolio] — grid of every published project. Optional: limit="4", and style="carousel"
 * for a sliding row (three cards on desktop, two on tablets, one on phones) with buttons above.
 */
add_shortcode( 'dwd_portfolio', function ( $atts ) {
	$atts     = shortcode_atts( array( 'limit' => 0, 'style' => 'grid' ), $atts );
	$projects = dwdp_projects();
	if ( $atts['limit'] ) {
		$projects = array_slice( $projects, 0, absint( $atts['limit'] ) );
	}
	if ( ! $projects ) {
		return '';
	}
	dwdp_enqueue_front();
	$cards = '';
	foreach ( $projects as $p ) {
		$cards .= dwdp_card_html( $p );
	}
	if ( 'carousel' !== $atts['style'] ) {
		return '<div class="dw-pgrid dwdp-grid">' . $cards . '</div>';
	}
	$arrow = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="%s"></path></svg>';
	return '<div class="dwdp-pcarousel">'
		. '<div class="dwdp-pnav">'
		. '<button type="button" class="dwdp-pbtn dwdp-prev" aria-label="Previous projects">' . sprintf( $arrow, 'M14 4 L7 11 L14 18' ) . '</button>'
		. '<button type="button" class="dwdp-pbtn dwdp-next" aria-label="Next projects">' . sprintf( $arrow, 'M8 4 L15 11 L8 18' ) . '</button>'
		. '</div>'
		. '<div class="dwdp-ptrack" tabindex="0" aria-label="Projects">' . $cards . '</div>'
		. '</div>';
} );

/**
 * [dwd_project_slider] — homepage showcase of every project's full hero (projects marked
 * "Show on homepage"). One design at a time; up/down buttons slide vertically between them.
 * Each hero links to its project. The heroes sit on a large laptop screen that runs off the
 * right edge of the section; use frame="none" for a plain screen, or style="classic" for the
 * older one-at-a-time slider.
 */
add_shortcode( 'dwd_project_slider', function ( $atts ) {
	$atts     = shortcode_atts( array( 'style' => 'vertical', 'frame' => 'laptop' ), $atts );
	$projects = dwdp_projects( true );
	if ( ! $projects ) {
		return '';
	}
	dwdp_enqueue_front();
	if ( 'classic' === $atts['style'] ) {
		return dwdp_classic_slider( $projects );
	}
	$items = '';
	$count = 0;
	foreach ( $projects as $p ) {
		$hero = absint( dwdp_get( $p->ID, 'cover' ) );
		if ( ! $hero ) {
			continue;
		}
		// One shared frame; each hero fills it from the top (short heroes lose a little of their
		// empty side margins, tall ones a sliver of their bottom edge).
		$lazy   = $count < 2 ? 'eager' : 'lazy';
		$items .= sprintf(
			'<a class="dwdp-vitem" href="%1$s" aria-label="%2$s">%3$s</a>',
			esc_url( get_permalink( $p ) ),
			esc_attr( 'View the ' . get_the_title( $p ) . ' project' ),
			dwdp_img( $hero, get_the_title( $p ) . ' website design', array( 'loading' => $lazy ) )
		);
		$count++;
	}
	if ( ! $count ) {
		return '';
	}
	$chev   = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="%s"></path></svg>';
	$screen = '<div class="dwdp-vview"><div class="dwdp-vtrack">' . $items . '</div></div>';
	if ( 'laptop' === $atts['frame'] ) {
		$screen = '<div class="dwdp-laptop"><div class="dwdp-lid"><i class="dwdp-cam"></i>' . $screen . '</div><div class="dwdp-base"></div></div>';
	}
	return '<div class="dwdp-vslider' . ( 'laptop' === $atts['frame'] ? ' is-laptop' : '' ) . '">'
		. '<div class="dwdp-vnav">'
		. '<button type="button" class="dwdp-vbtn dwdp-up" aria-label="Previous design">' . sprintf( $chev, 'M4 14 L11 7 L18 14' ) . '</button>'
		. '<button type="button" class="dwdp-vbtn dwdp-down" aria-label="Next design">' . sprintf( $chev, 'M4 8 L11 15 L18 8' ) . '</button>'
		. '</div>'
		. $screen
		. '</div>';
} );

/** The original one-at-a-time browser slider. */
function dwdp_classic_slider( $projects ) {
	$imgs = '';
	foreach ( $projects as $i => $p ) {
		$cover = absint( dwdp_get( $p->ID, 'cover' ) );
		if ( ! $cover ) {
			continue;
		}
		$imgs .= sprintf(
			'<a href="%1$s" class="%2$s" data-url="%3$s" aria-label="%4$s">%5$s</a>',
			esc_url( get_permalink( $p ) ),
			'' === $imgs ? 'on' : '',
			esc_attr( dwdp_domain( $p->ID ) ),
			esc_attr( 'View the ' . get_the_title( $p ) . ' project' ),
			dwdp_img( $cover, get_the_title( $p ) . ' website', array( 'loading' => 0 === $i ? 'eager' : 'lazy' ) )
		);
	}
	if ( '' === $imgs ) {
		return '';
	}
	$arrow = '<svg style="width:20px;height:20px" viewBox="0 0 22 22"><path d="%s"></path></svg>';
	return '<div class="dw-slider dwdp-slider">'
		. '<div class="dw-snavcol">'
		. '<button type="button" class="dw-snav dw-prev" aria-label="Previous site">' . sprintf( $arrow, 'M14 4 L7 11 L14 18' ) . '</button>'
		. '<button type="button" class="dw-snav dw-next" aria-label="Next site">' . sprintf( $arrow, 'M8 4 L15 11 L8 18' ) . '</button>'
		. '</div>'
		. '<div class="dw-browser"><div class="dw-bscreen">' . $imgs . '</div></div>'
		. '</div>';
}

/** Shared closing call to action. $context "blog" uses wording that fits articles instead of the portfolio. */
function dwdp_cta_html( $context = '' ) {
	$s     = dwdp_settings();
	if ( 'blog' === $context ) {
		$s['cta_title'] = 'Need help with your website?';
		$s['cta_text']  = 'If you’re planning a new website or a redesign, I’d be glad to discuss it. A brief Zoom call is all it takes to receive a quote and timeline.';
	}
	$phone = trim( $s['cta_phone'] );
	$tel   = preg_replace( '/[^0-9+]/', '', $phone );
	ob_start();
	?>
	<section class="dwdp-cta dw-dots-dark dw-glow">
		<div class="dwdp-cta-inner">
			<h2 class="dwdp-cta-title"><?php echo dwdp_two_tone( $s['cta_title'], '#4BA3DC', 3 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></h2>
			<p class="dwdp-cta-text"><?php echo esc_html( $s['cta_text'] ); ?></p>
			<div class="dwdp-cta-row">
				<a class="dwdp-btn" href="<?php echo esc_url( $s['cta_url'] ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $s['cta_button'] ); ?></a>
				<?php if ( $phone ) : ?>
					<span class="dwdp-cta-call">or call <a href="tel:<?php echo esc_attr( $tel ); ?>"><?php echo esc_html( $phone ); ?></a></span>
				<?php endif; ?>
			</div>
		</div>
	</section>
	<?php
	return ob_get_clean();
}
add_shortcode( 'dwd_projects_cta', function ( $atts ) {
	$atts = shortcode_atts( array( 'context' => '' ), $atts );
	dwdp_enqueue_front();
	return dwdp_cta_html( $atts['context'] );
} );
