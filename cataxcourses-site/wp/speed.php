/**
 * CTC speed (Code Snippets, scope: front-end). PageSpeed work, Nov 2026.
 *
 * 1. Drops files the public pages never use: WordPress admin icons and Thickbox (logged-out visitors), the LiveChat
 *    "text widget" styles (the chat itself still loads), the old WebToffee Stripe assets (that gateway is switched off),
 *    and WooCommerce styles/scripts on pages that are not shop pages.
 * 2. Hero: the laptop poster image is fetched first (it is the largest element on screen) and the looping video
 *    starts after the page has loaded, so it no longer competes with the page for bandwidth.
 * 3. Chat and tracking (LiveChat widget, Google Analytics / Ads, Meta pixel via Pixel Manager, Mailchimp tracking)
 *    load on the visitor's first scroll, tap, click or key press (or after 15 s). Not on cart, checkout or
 *    order-received pages, so purchase tracking is unchanged.
 */
function ctc_sp_shop_page() {
	return function_exists( 'is_woocommerce' ) && ( is_woocommerce() || is_cart() || is_checkout() || is_account_page() );
}
function ctc_sp_no_delay() {
	if ( is_user_logged_in() && current_user_can( 'edit_posts' ) && ! empty( $_GET['ctc_sp_test'] ) ) return false; // staff can test
	return ( function_exists( 'is_cart' ) && ( is_cart() || is_checkout() || ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) ) )
		|| is_page( 'thank-you' ) || isset( $_GET['ctc_nodelay'] );
}

/* 1. Unused files */
add_action( 'wp_enqueue_scripts', function () {
	if ( is_admin() ) return;
	if ( ! is_user_logged_in() ) {
		wp_dequeue_style( 'dashicons' );
		wp_dequeue_style( 'thickbox' );
		wp_dequeue_script( 'thickbox' );
	}
	wp_dequeue_style( 'text-widgets-style' );
	wp_dequeue_style( 'text-icons-style' );
	// WebToffee Stripe is no longer a checkout option; its button / style files are dead weight everywhere but the account page.
	if ( ! ( function_exists( 'is_account_page' ) && is_account_page() ) ) {
		foreach ( array( 'eh-style', 'eh_apple_pay_style', 'eh_payment_request', 'eh_stripe_checkout', 'stripe_v3_js', 'eh_google_pay', 'eh-gpay' ) as $h ) { wp_dequeue_style( $h ); wp_dequeue_script( $h ); }
	}
	// WooCommerce Stripe: payment is taken on the checkout page only (product pages have no Stripe button), so its
	// ~1.9 MB of Stripe / express-checkout scripts load on cart, checkout and account pages only.
	if ( ! ( function_exists( 'is_cart' ) && ( is_cart() || is_checkout() || is_account_page() ) ) ) {
		foreach ( array( 'stripe', 'wc_stripe_express_checkout', 'wc-stripe-upe-classic', 'wc_stripe_payment_request', 'wc-stripe-blocks-checkout-style' ) as $h ) wp_dequeue_script( $h );
		foreach ( array( 'wc_stripe_express_checkout_style', 'wc-stripe-upe-classic', 'stripelink_styles' ) as $h ) wp_dequeue_style( $h );
	}
	if ( ! ctc_sp_shop_page() ) {
		foreach ( array( 'woocommerce-layout', 'woocommerce-smallscreen', 'woocommerce-general', 'wcsatt-css', 'wc-blocks-style' ) as $h ) wp_dequeue_style( $h );
		foreach ( array( 'woocommerce', 'wc-jquery-blockui', 'wc-cart-fragments' ) as $h ) wp_dequeue_script( $h );
	}
}, 9999 );

/* 1b. Files some plugins add late, while the page is being built (after the step above). Product pages were loading
   WooCommerce's whole checkout (checkout script, 50 KB of country/address data, React, Stripe's card form) and the
   product-gallery zoom/lightbox, although these pages have no checkout form and no product gallery. Removed right
   before the scripts and styles are printed; cart, checkout and account pages keep everything. */
function ctc_sp_late_strip() {
	if ( is_admin() || ! function_exists( 'is_cart' ) || is_cart() || is_checkout() || is_account_page() ) return;
	foreach ( array( 'wc-checkout', 'wc-country-select', 'wc-address-i18n', 'wc-custom-place-order-button', 'woocommerce-tokenization-form',
		'stripe', 'wc-stripe-upe-classic', 'wc_stripe_express_checkout', 'wc-stripe-blocks-checkout', 'wc_stripe_payment_request' ) as $h ) wp_dequeue_script( $h );
	foreach ( array( 'wc-stripe-upe-classic', 'stripelink_styles', 'wc_stripe_express_checkout_style' ) as $h ) wp_dequeue_style( $h );
	if ( function_exists( 'is_product' ) && is_product() && ctc_sp_elementor_product() ) {
		foreach ( array( 'wc-zoom', 'wc-flexslider', 'wc-photoswipe', 'wc-photoswipe-ui-default', 'wc-single-product', 'zoom', 'flexslider', 'photoswipe', 'photoswipe-ui-default' ) as $h ) wp_dequeue_script( $h );
		foreach ( array( 'photoswipe', 'photoswipe-default-skin', 'wp-block-library', 'wc-blocks-style' ) as $h ) wp_dequeue_style( $h );
	}
}
// True when this product page uses our Elementor design (no WooCommerce image gallery). Products on WooCommerce's
// standard layout (e.g. the auto-renewal plan) keep their gallery scripts.
function ctc_sp_elementor_product() {
	// Our course / mug designs are applied by the CTC preview snippet (ctc_product_template_id); those pages have no WooCommerce gallery.
	return function_exists( 'ctc_product_template_id' ) && (bool) ctc_product_template_id();
}
add_action( 'wp_print_styles', 'ctc_sp_late_strip', 0 );
add_action( 'wp_print_scripts', 'ctc_sp_late_strip', 0 );
add_action( 'wp_print_footer_scripts', 'ctc_sp_late_strip', 0 );
add_action( 'wp_footer', 'ctc_sp_late_strip', 0 );
add_action( 'wp', function () {
	if ( function_exists( 'is_product' ) && is_product() && ctc_sp_elementor_product() ) remove_action( 'wp_footer', 'woocommerce_photoswipe' ); // lightbox markup for a gallery these pages don't have
} );

/* 2. Hero: poster first, video after load */
add_action( 'wp_head', function () {
	if ( is_admin() ) return;
	foreach ( glob( WP_CONTENT_DIR . '/uploads/elementor/google-fonts/fonts/{outfit,manrope}-*.woff2', GLOB_BRACE ) ?: array() as $i => $f ) {
		if ( $i > 3 ) break;
		echo '<link rel="preload" as="font" type="font/woff2" crossorigin href="' . esc_url( content_url( '/uploads/elementor/google-fonts/fonts/' . basename( $f ) ) ) . '">' . "\n";
	}
	// Mug photo slider: keep the square photo's space from the first paint, show only the first slide until the slider starts.
	echo '<style>.ctc-mug-gallery .swiper-slide-image{width:100%;height:auto;aspect-ratio:1/1;object-fit:cover}.ctc-mug-gallery .elementor-image-carousel-wrapper:not(.swiper-initialized) .swiper-slide:not(:first-child){display:none}.ctc-mug-gallery .elementor-image-carousel-wrapper{aspect-ratio:1/1}.ctc-mug-gallery .elementor-image-carousel-wrapper:not(.swiper-initialized) .swiper-slide{max-width:100%!important;width:100%;flex:0 0 100%}</style>' . "\n";
}, 1 );
add_action( 'template_redirect', function () {
	if ( is_admin() || wp_doing_ajax() || is_feed() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) return;
	ob_start( function ( $html ) {
		if ( false === strpos( $html, '<html' ) ) return $html;
		// The hero video's poster is the largest thing on screen: fetch it first (only on pages that show it).
		if ( preg_match( '#<video class="elementor-video"[^>]*poster="([^"]+)"#', $html, $pm ) ) $html = preg_replace( '#<head([^>]*)>#', '<head$1>' . "\n" . '<link rel="preload" as="image" href="' . $pm[1] . '" fetchpriority="high">', $html, 1 );
		// WebP: where a .webp copy of an uploaded JPG/PNG exists, pages use it (about 70% smaller). Only image tags, srcset lists
		// and CSS backgrounds change; social-sharing <meta> images keep the original.
		$html = ctc_sp_webp( $html );
		// Header, footer and product designs are printed inline by the design snippet; drop the duplicate <link> to the same CSS file.
		if ( preg_match_all( '#<style[^>]*>\s*\.elementor-(\d+) #', $html, $ids ) ) {
			foreach ( array_unique( $ids[1] ) as $pid ) $html = preg_replace( "#<link[^>]+id='elementor-post-" . $pid . "-css'[^>]*>\n?#", '', $html );
		}
		// Stylesheets Elementor prints late, in the page body (slider, video, accordion widget styles): move them into <head>
		// so those parts appear styled from the first paint instead of jumping into place when the file arrives.
		$hp = strpos( $html, '</head>' );
		if ( false !== $hp && preg_match_all( '#<link\s[^>]*rel=[\'"]stylesheet[\'"][^>]*>\n?#i', substr( $html, $hp ), $late ) && $late[0] ) {
			$body = substr( $html, $hp );
			foreach ( $late[0] as $tag ) $body = str_replace( $tag, '', $body );
			$html = substr( $html, 0, $hp ) . implode( '', $late[0] ) . $body;
		}
		// Photo sliders: the first photo is the main image on screen, so it loads right away (the rest stay lazy).
		$html = preg_replace( '#<img class="swiper-slide-image swiper-lazy" data-src="([^"]+)"#', '<img class="swiper-slide-image" src="$1" fetchpriority="high" decoding="async"', $html, 1 );
		// Trust badges and seals sit lower on the page: load them when scrolled near.
		$html = preg_replace( '#<img(?![^>]*\bloading=)([^>]*/uploads/[^"]*ctc-(?:badge|seal)[^>]*)>#', '<img loading="lazy" decoding="async"$1>', $html );
		// Hosted hero videos: keep the poster, hand the file to the loader below.
		$html = preg_replace_callback( '#<video class="elementor-video" src="([^"]+)"([^>]*)>#', function ( $m ) {
			return '<video class="elementor-video" data-ctc-src="' . $m[1] . '" preload="none"' . str_replace( array( ' preload="auto"', ' preload="metadata"' ), '', $m[2] ) . '>';
		}, $html );
		return $html;
	} );
}, 1 );

function ctc_sp_webp_url( $url ) {
	static $seen = array();
	if ( ! preg_match( '#^(?:https?://cataxcourses\.com)?/wp-content/uploads/(.+)\.(?:jpe?g|png)$#i', $url, $m ) ) return $url;
	if ( ! isset( $seen[ $url ] ) ) {
		$file = WP_CONTENT_DIR . '/uploads/' . $m[1] . '.webp';
		$seen[ $url ] = is_file( $file ) ? preg_replace( '#\.(?:jpe?g|png)$#i', '.webp', $url ) : $url;
	}
	return $seen[ $url ];
}
function ctc_sp_webp( $html ) {
	$swap = function ( $value ) {
		return preg_replace_callback( '#(?:https?://cataxcourses\.com)?/wp-content/uploads/[^\s"\'(),]+\.(?:jpe?g|png)#i', function ( $m ) { return ctc_sp_webp_url( $m[0] ); }, $value );
	};
	$html = preg_replace_callback( '#\b(src|srcset|data-src|data-srcset|poster)=("|\')([^"\']*)\2#i', function ( $m ) use ( $swap ) {
		return $m[1] . '=' . $m[2] . $swap( $m[3] ) . $m[2];
	}, $html );
	return preg_replace_callback( '#url\(\s*(["\']?)([^)"\']+)\1\s*\)#i', function ( $m ) use ( $swap ) { return 'url(' . $m[1] . $swap( $m[2] ) . $m[1] . ')'; }, $html );
}

/* 3. Delay chat / tracking until the visitor interacts */
function ctc_sp_delay_handles() {
	return array( 'text-widget', 'pmw', 'mailchimp-woocommerce-pixel-tracking', 'mailchimp-woocommerce-pixel-tracking-blocks' );
}
function ctc_sp_delay_id( $id ) {
	foreach ( ctc_sp_delay_handles() as $h ) if ( in_array( $id, array( "$h-js", "$h-js-before", "$h-js-after", "$h-js-extra" ), true ) ) return true;
	return false;
}
add_filter( 'wp_script_attributes', function ( $a ) {
	if ( is_admin() || ctc_sp_no_delay() || empty( $a['id'] ) || ! ctc_sp_delay_id( $a['id'] ) || empty( $a['src'] ) ) return $a;
	$a['data-ctc-delay'] = $a['src']; unset( $a['src'], $a['async'], $a['defer'] ); $a['type'] = 'ctc/delay';
	return $a;
} );
add_filter( 'wp_inline_script_attributes', function ( $a ) {
	if ( is_admin() || ctc_sp_no_delay() || empty( $a['id'] ) || ! ctc_sp_delay_id( $a['id'] ) ) return $a;
	$a['type'] = 'ctc/delay';
	return $a;
} );
add_action( 'wp_footer', function () {
	if ( is_admin() ) return;
	$delay = ctc_sp_no_delay() ? 'false' : 'true';
	?>
<script id="ctc-speed">
(function () {
  // Hero video: start it once the page has loaded.
  function videos() { document.querySelectorAll('video[data-ctc-src]').forEach(function (v) { if (!v.getClientRects().length) return; /* hidden at this screen size (phone hero shows a still image) */ v.src = v.getAttribute('data-ctc-src'); v.removeAttribute('data-ctc-src'); v.preload = 'auto'; var p = v.play && v.play(); if (p && p.catch) p.catch(function () {}); }); }
  if (document.readyState === 'complete') setTimeout(videos, 300); else window.addEventListener('load', function () { setTimeout(videos, 300); });
  // Chat and tracking: run the delayed scripts in page order on the first interaction.
  var DELAY = <?php echo $delay; ?>, done = false;
  function run() {
    if (done) return; done = true;
    ['scroll', 'pointerdown', 'touchstart', 'keydown', 'mousemove', 'wheel'].forEach(function (e) { window.removeEventListener(e, run, { passive: true }); });
    if (window.ctcLoadGA) window.ctcLoadGA();
    var list = Array.prototype.slice.call(document.querySelectorAll('script[type="ctc/delay"]'));
    (function next() {
      var old = list.shift(); if (!old) return;
      var s = document.createElement('script');
      for (var i = 0; i < old.attributes.length; i++) { var at = old.attributes[i]; if (at.name !== 'type' && at.name !== 'data-ctc-delay') s.setAttribute(at.name, at.value); }
      var src = old.getAttribute('data-ctc-delay');
      if (src) { s.src = src; s.onload = s.onerror = next; old.parentNode.replaceChild(s, old); }
      else { s.text = old.text; old.parentNode.replaceChild(s, old); next(); }
    })();
  }
  // Cart, checkout and order pages: tracking still loads on every visit, right after the page has finished loading.
  if (!DELAY) { if (document.readyState === 'complete') run(); else window.addEventListener('load', function () { setTimeout(run, 200); }); return; }
  ['scroll', 'pointerdown', 'touchstart', 'keydown', 'mousemove', 'wheel'].forEach(function (e) { window.addEventListener(e, run, { passive: true }); });
  setTimeout(run, 15000);
  // "Chat with us" buttons clicked before the chat has loaded: load it, then open it.
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.ctc-open-chat')) return;
    run();
    var tries = 0, t = setInterval(function () { if (window.LiveChatWidget) { clearInterval(t); try { window.LiveChatWidget.call('maximize'); } catch (x) {} } if (++tries > 40) clearInterval(t); }, 250);
  }, true);
})();
</script>
	<?php
}, 999 );
