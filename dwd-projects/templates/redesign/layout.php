<?php
/**
 * Page shell for the redesigned pages (see includes/redesign.php). The homepage partial carries its own
 * nav and footer; interior pages share chrome-top / chrome-bottom.
 */
defined( 'ABSPATH' ) || exit;
$dwdr = dwdr_page();
$body = dwdr_add_ctas( dwdr_body( $dwdr ) ); // sections without a button get Get a Quote + Call
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php dwdr_head(); ?>
</head>
<body <?php body_class( 'dwr dwr-' . $dwdr ); ?>>
<?php
wp_body_open();
if ( 'home' === $dwdr ) {
	echo $body; // phpcs:ignore
} else {
	echo dwdr_render( 'chrome-top' ) . $body . dwdr_render( 'chrome-bottom' ); // phpcs:ignore
}
// Phones: a Call / Get a Quote bar stays at the bottom once the visitor scrolls (not on the quote and thank-you pages).
if ( ! in_array( $dwdr, array( 'quote', 'thank-you', 'onboarding' ), true ) ) {
	echo '<div class="dwr-mbar" aria-label="Contact Michael"><a class="dwr-mbar-call" href="tel:+17722101728"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>Call</a><a class="dwr-mbar-quote" href="' . esc_url( home_url( '/quote/' ) ) . '">Get a Free Quote</a></div>'
		. '<script>(function(){var b=document.querySelector(".dwr-mbar");if(!b)return;var f=function(){b.classList.toggle("on",window.scrollY>420&&!document.documentElement.classList.contains("dw-menu-open")&&!document.body.classList.contains("dw-menu-open"));};addEventListener("scroll",f,{passive:true});f();})();</script>';
}
if ( 'onboarding' === $dwdr ) {
	// Elementor prints its own stylesheets in the footer once the form renders; the page has its own styles.
	ob_start();
	wp_footer();
	echo preg_replace( array( '#<link\b[^>]*rel=["\']stylesheet["\'][^>]*(elementor|hello|swiper|e-animation|widget-)[^>]*>\s*#i', '#<style\b[^>]*id=["\'](elementor|e-|widget-)[^>]*>.*?</style>\s*#is' ), '', (string) ob_get_clean() ); // phpcs:ignore
} else {
	wp_footer();
}
?>
</body>
</html>
