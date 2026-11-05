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
	return ( function_exists( 'is_cart' ) && ( is_cart() || is_checkout() || is_account_page() || ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) ) )
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

/* 2. Hero: poster first, video after load */
add_action( 'wp_head', function () {
	if ( is_admin() ) return;
	foreach ( glob( WP_CONTENT_DIR . '/uploads/elementor/google-fonts/fonts/{outfit,manrope}-*.woff2', GLOB_BRACE ) ?: array() as $i => $f ) {
		if ( $i > 3 ) break;
		echo '<link rel="preload" as="font" type="font/woff2" crossorigin href="' . esc_url( content_url( '/uploads/elementor/google-fonts/fonts/' . basename( $f ) ) ) . '">' . "\n";
	}
}, 1 );
add_action( 'template_redirect', function () {
	if ( is_admin() || wp_doing_ajax() || is_feed() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) return;
	ob_start( function ( $html ) {
		if ( false === strpos( $html, '<html' ) ) return $html;
		// The hero video's poster is the largest thing on screen: fetch it first (only on pages that show it).
		if ( preg_match( '#<video class="elementor-video"[^>]*poster="([^"]+)"#', $html, $pm ) ) $html = preg_replace( '#<head([^>]*)>#', '<head$1>' . "\n" . '<link rel="preload" as="image" href="' . $pm[1] . '" fetchpriority="high">', $html, 1 );
		// Trust badges and seals sit lower on the page: load them when scrolled near.
		$html = preg_replace( '#<img(?![^>]*\bloading=)([^>]*/uploads/[^"]*ctc-(?:badge|seal)[^>]*)>#', '<img loading="lazy" decoding="async"$1>', $html );
		// Hosted hero videos: keep the poster, hand the file to the loader below.
		$html = preg_replace_callback( '#<video class="elementor-video" src="([^"]+)"([^>]*)>#', function ( $m ) {
			return '<video class="elementor-video" data-ctc-src="' . $m[1] . '" preload="none"' . str_replace( array( ' preload="auto"', ' preload="metadata"' ), '', $m[2] ) . '>';
		}, $html );
		return $html;
	} );
}, 1 );

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
  function videos() { document.querySelectorAll('video[data-ctc-src]').forEach(function (v) { v.src = v.getAttribute('data-ctc-src'); v.removeAttribute('data-ctc-src'); v.preload = 'auto'; var p = v.play && v.play(); if (p && p.catch) p.catch(function () {}); }); }
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
  if (!DELAY) { run(); return; }
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
