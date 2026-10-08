<?php
/**
 * Magnolia Property Care theme.
 *
 * @package Magnolia
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MAGNOLIA_VERSION', '1.0.0' );

/**
 * Design screens and the pages they become.
 */
function magnolia_screens() {
	return array(
		'home'     => array( 'slug' => 'home', 'title' => 'Home' ),
		'about'    => array( 'slug' => 'about-us', 'title' => 'About Us' ),
		'services' => array( 'slug' => 'services', 'title' => 'Services' ),
		'projects' => array( 'slug' => 'past-projects', 'title' => 'Past Projects' ),
		'contact'  => array( 'slug' => 'contact', 'title' => 'Contact' ),
	);
}

add_action(
	'after_setup_theme',
	function () {
		add_theme_support( 'title-tag' );
		add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
	}
);

add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_style( 'magnolia', get_stylesheet_uri(), array(), MAGNOLIA_VERSION );
		wp_enqueue_script( 'magnolia', get_template_directory_uri() . '/assets/js/site.js', array(), MAGNOLIA_VERSION, true );
	}
);

add_action(
	'wp_head',
	function () {
		echo '<link rel="icon" href="' . esc_url( get_template_directory_uri() . '/assets/icon-olive.png' ) . '">' . "\n";
	}
);

/**
 * Page ID created by the setup screen for a design screen, or 0.
 */
function magnolia_page_id( $screen ) {
	$pages = get_option( 'magnolia_pages', array() );
	$id    = isset( $pages[ $screen ] ) ? (int) $pages[ $screen ] : 0;
	return ( $id && 'publish' === get_post_status( $id ) ) ? $id : 0;
}

/**
 * URL of a design screen's page.
 */
function magnolia_page_url( $screen ) {
	if ( 'home' === $screen ) {
		return home_url( '/' );
	}
	$id = magnolia_page_id( $screen );
	if ( $id ) {
		return get_permalink( $id );
	}
	$screens = magnolia_screens();
	return home_url( '/' . $screens[ $screen ]['slug'] . '/' );
}

/**
 * Underline colour for a header nav link: olive on the current page.
 */
function magnolia_nav_line( $screen ) {
	$id     = magnolia_page_id( $screen );
	$active = 'home' === $screen ? is_front_page() : ( $id && is_page( $id ) );
	return $active ? 'rgb(115, 130, 56)' : 'transparent';
}

/**
 * [magnolia_estimate_form] — the Request an Estimate form on the Contact page.
 */
add_shortcode(
	'magnolia_estimate_form',
	function () {
		ob_start();
		if ( isset( $_GET['estimate'] ) && 'sent' === $_GET['estimate'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			get_template_part( 'template-parts/estimate-thanks' );
		} else {
			if ( isset( $_GET['estimate'] ) && 'error' === $_GET['estimate'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				echo '<p role="alert" style="background:#f3e3dc;color:#7a2e1a;padding:14px 18px;margin-bottom:24px;font-size:15px">Sorry, your request could not be sent. Please call (336) 583-9398 or email heys@magnoliaproperty.care.</p>';
			}
			get_template_part( 'template-parts/estimate-form' );
		}
		return ob_get_clean();
	}
);

/**
 * Emails estimate requests to the address set in Appearance → Magnolia Setup.
 */
function magnolia_handle_estimate() {
	$back = magnolia_page_url( 'contact' );

	// Honeypot: real visitors never fill this in.
	if ( ! empty( $_POST['website'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
		wp_safe_redirect( add_query_arg( 'estimate', 'sent', $back ) );
		exit;
	}

	// phpcs:disable WordPress.Security.NonceVerification.Missing -- public form, no logged-in state to protect.
	$field = function ( $key, $multiline = false ) {
		if ( ! isset( $_POST[ $key ] ) ) {
			return '';
		}
		$value = wp_unslash( $_POST[ $key ] );
		return $multiline ? sanitize_textarea_field( $value ) : sanitize_text_field( $value );
	};
	$name     = $field( 'name' );
	$phone    = $field( 'phone' );
	$email    = sanitize_email( $field( 'email' ) );
	$services = isset( $_POST['services'] ) ? array_map( 'sanitize_text_field', (array) wp_unslash( $_POST['services'] ) ) : array();
	// phpcs:enable

	if ( '' === $name || '' === $phone || ! is_email( $email ) ) {
		wp_safe_redirect( add_query_arg( 'estimate', 'error', $back ) );
		exit;
	}

	$lines = array(
		'Name: ' . $name,
		'Phone: ' . $phone,
		'Email: ' . $email,
		'Property address: ' . $field( 'address' ),
		'I am: ' . $field( 'role' ),
		'Timeline: ' . $field( 'timeline' ),
		'Services: ' . implode( ', ', $services ),
		'',
		'Project details:',
		$field( 'details', true ),
	);

	$to   = get_option( 'magnolia_estimate_email', get_option( 'admin_email' ) );
	$sent = wp_mail(
		$to,
		'Estimate request from ' . $name,
		implode( "\n", $lines ),
		array( 'Reply-To: ' . $name . ' <' . $email . '>' )
	);

	wp_safe_redirect( add_query_arg( 'estimate', $sent ? 'sent' : 'error', $back ) );
	exit;
}
add_action( 'admin_post_nopriv_magnolia_estimate', 'magnolia_handle_estimate' );
add_action( 'admin_post_magnolia_estimate', 'magnolia_handle_estimate' );

require get_template_directory() . '/inc/setup.php';
