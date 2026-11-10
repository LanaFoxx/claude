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
	// No font preloads: the font rules are printed in the page now, so the browser finds the files right away, and on this
	// HTTP/1.1 server four early font downloads held up the scripts the first paint waits for (text shows in the
	// fallback font first; font-display: swap).
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
		// Stylesheets from this site: print their contents into <head> instead of linking ~16 small files. The server speaks
		// HTTP/1.1 (six downloads at a time), so those files held up the first paint by ~0.5-0.8 s even with a cached page.
		$html = ctc_sp_inline_css( $html );
		// Mailchimp site tracking (printed straight into the page, so the script filters below miss it): wait for the
		// visitor's first interaction like the other tracking scripts. Its chain of ~10 scripts otherwise lands before
		// the first paint on cached pages and PageSpeed counts all of it as blocking.
		$html = str_replace( '<script id="mcjs">', '<script id="mcjs" type="ctc/delay">', $html );
		// Page scripts after the first paint (visitors only; never cart, checkout or order pages; ?ctc_nodefer=1 turns it off).
		if ( ! is_user_logged_in() && ! ctc_sp_no_delay() && ! isset( $_GET['ctc_nodefer'] ) ) $html = ctc_sp_defer_body_scripts( $html );
		return $html;
	} );
}, 1 );

/**
 * The scripts at the end of the page (jQuery plugins, WooCommerce, Stripe buttons, Elementor widgets) used to run before
 * the browser drew anything, because on a cached page they all arrive at once. Here they keep their exact order but run
 * right after the first paint: each <script> in <body> becomes type="ctc/defer" and a small runner replays them in order.
 * DOMContentLoaded / load listeners added by those scripts after the events already fired are still called.
 */
function ctc_sp_defer_body_scripts( $html ) {
	$bp = stripos( $html, '<body' );
	$ep = strripos( $html, '</body>' );
	if ( false === $bp || false === $ep ) return $html;
	$body = substr( $html, $bp, $ep - $bp );
	$n = 0;
	$body = preg_replace_callback( '#<script\b([^>]*)>#i', function ( $m ) use ( &$n ) {
		$attrs = $m[1];
		if ( preg_match( '#\bid=[\'"]ctc-(?:speed|defer-run)[\'"]#i', $attrs ) ) return $m[0];
		if ( preg_match( '#(?<![\w-])type=[\'"]([^\'"]*)[\'"]#i', $attrs, $t ) && ! in_array( strtolower( $t[1] ), array( 'text/javascript', 'application/javascript', '' ), true ) ) return $m[0];
		if ( preg_match( '#(?<![\w-])(?:async|nomodule)(?=[\s>=/]|$)#i', $attrs ) ) return $m[0];
		$attrs = preg_replace( '#\s*(?<![\w-])type=[\'"][^\'"]*[\'"]#i', '', $attrs );
		$attrs = preg_replace( '#\s*(?<![\w-])defer(?:=[\'"][^\'"]*[\'"])?(?=[\s>/]|$)#i', '', $attrs );
		$attrs = preg_replace( '#(?<![\w-])src=#i', 'data-ctc-defer=', $attrs );
		$n++;
		return '<script type="ctc/defer"' . $attrs . '>';
	}, $body );
	if ( ! $n ) return $html;
	$runner = <<<'JS'
<script id="ctc-defer-run">
(function () {
  var d = document, w = window, loaded = d.readyState === 'complete', dAdd = d.addEventListener, wAdd = w.addEventListener;
  wAdd.call(w, 'load', function () { loaded = true; });
  function late(type, fn, target) {
    if (type === 'DOMContentLoaded' && d.readyState !== 'loading') { setTimeout(function () { fn.call(target, new Event(type)); }); return true; }
    if (type === 'load' && target === w && loaded) { setTimeout(function () { fn.call(target, new Event(type)); }); return true; }
    return false;
  }
  function start() {
    d.addEventListener = function (t, f, o) { if (typeof f === 'function' && late(t, f, d)) return; return dAdd.call(this, t, f, o); };
    w.addEventListener = function (t, f, o) { if (typeof f === 'function' && late(t, f, w)) return; return wAdd.call(this, t, f, o); };
    var list = Array.prototype.slice.call(d.querySelectorAll('script[type="ctc/defer"]'));
    (function next() {
      var old = list.shift();
      if (!old) { setTimeout(function () { d.addEventListener = dAdd; w.addEventListener = wAdd; w.ctcDeferredDone = true; d.dispatchEvent(new Event('ctc-deferred')); }, 50); return; }
      var s = d.createElement('script');
      for (var i = 0; i < old.attributes.length; i++) { var a = old.attributes[i]; if (a.name !== 'type' && a.name !== 'data-ctc-defer') s.setAttribute(a.name, a.value); }
      var src = old.getAttribute('data-ctc-defer');
      if (src) { s.src = src; s.async = false; s.onload = s.onerror = next; old.parentNode.replaceChild(s, old); }
      else { s.text = old.text; old.parentNode.replaceChild(s, old); next(); }
    })();
  }
  // Let the browser draw the page once, then run the scripts.
  if (w.requestAnimationFrame) requestAnimationFrame(function () { setTimeout(start, 0); }); else setTimeout(start, 0);
})();
</script>

JS;
	return substr( $html, 0, $bp ) . $body . $runner . substr( $html, $ep );
}

function ctc_sp_inline_css( $html ) {
	$hp = strpos( $html, '</head>' );
	if ( false === $hp ) return $html;
	$head = substr( $html, 0, $hp );
	if ( ! preg_match_all( '#<link\s[^>]*>\n?#i', $head, $links ) ) return $html;
	$home = preg_quote( untrailingslashit( set_url_scheme( home_url(), 'https' ) ), '#' );
	$budget = 600 * 1024; // raw bytes; anything beyond stays a normal link
	foreach ( $links[0] as $tag ) {
		if ( ! preg_match( '#rel=[\'"]stylesheet[\'"]#i', $tag ) || preg_match( '#\bonload=|\bdisabled\b#i', $tag ) ) continue;
		if ( ! preg_match( '#href=[\'"](' . $home . '(/wp-(?:content|includes)/[^\'"?]+\.css))(?:\?[^\'"]*)?[\'"]#i', $tag, $m ) ) continue;
		$media = preg_match( '#media=[\'"]([^\'"]+)[\'"]#i', $tag, $mm ) ? $mm[1] : 'all';
		if ( ! in_array( $media, array( 'all', 'screen' ), true ) ) continue;
		$file = ABSPATH . ltrim( $m[2], '/' );
		$real = realpath( $file );
		if ( ! $real || 0 !== strpos( $real, realpath( ABSPATH ) ) || ! is_readable( $real ) ) continue;
		$css = file_get_contents( $real );
		if ( false === $css || stripos( $css, '@import' ) !== false || strlen( $css ) > $budget ) continue;
		$budget -= strlen( $css );
		$base = dirname( $m[1] ) . '/';
		$css = preg_replace_callback( '#url\(\s*([\'"]?)([^)\'"]+)\1\s*\)#i', function ( $u ) use ( $base ) {
			$p = $u[2];
			if ( preg_match( '#^(?:[a-z]+:|//|/|\#)#i', $p ) ) return $u[0];
			$abs = $base . $p;
			do { $abs = preg_replace( '#/[^/]+/\.\./#', '/', $abs, 1, $n ); } while ( $n );
			$abs = str_replace( '/./', '/', $abs );
			return 'url(' . $u[1] . $abs . $u[1] . ')';
		}, $css );
		$css = str_replace( '</style', '<\/style', $css );
		$id = preg_match( '#id=[\'"]([^\'"]+)[\'"]#i', $tag, $im ) ? ' id="' . esc_attr( $im[1] ) . '-inline"' : '';
		$head = str_replace( $tag, '<style' . $id . ( 'all' !== $media ? ' media="' . esc_attr( $media ) . '"' : '' ) . '>' . $css . "</style>\n", $head );
	}
	return $head . substr( $html, $hp );
}

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
	return array( 'text-connect', 'text-widget', 'pmw', 'mailchimp-woocommerce-pixel-tracking', 'mailchimp-woocommerce-pixel-tracking-blocks' );
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
  // Pages whose scripts run after the first paint: start the video a second after they finish (the poster shows meanwhile).
  if (document.querySelector('script[type="ctc/defer"]')) document.addEventListener('ctc-deferred', function () { setTimeout(videos, 1000); });
  else if (document.readyState === 'complete') setTimeout(videos, 300); else window.addEventListener('load', function () { setTimeout(videos, 300); });
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
