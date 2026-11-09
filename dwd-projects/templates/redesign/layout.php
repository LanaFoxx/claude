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
wp_footer();
?>
</body>
</html>
