<?php
/**
 * Site email through Google Workspace. WP Mail SMTP is switched to smtp.gmail.com only after the
 * app password Mike pastes is checked with Google, so site email never stops working.
 */
defined( 'ABSPATH' ) || exit;

function dwdsm_user() {
	$o = (array) get_option( 'wp_mail_smtp', array() );
	$e = (string) ( $o['mail']['from_email'] ?? '' );
	return is_email( $e ) ? $e : (string) wp_get_current_user()->user_email;
}

function dwdsm_status() {
	$o = (array) get_option( 'wp_mail_smtp', array() );
	$m = (string) ( $o['mail']['mailer'] ?? 'mail' );
	$g = 'smtp' === $m && 'smtp.gmail.com' === (string) ( $o['smtp']['host'] ?? '' );
	return array(
		'google'  => $g,
		'mailer'  => $m,
		'user'    => $g ? (string) ( $o['smtp']['user'] ?? '' ) : dwdsm_user(),
		'plugin'  => class_exists( 'WPMailSMTP\\Options' ),
		'since'   => (string) get_option( 'dwdsm_since', '' ),
		'errors'  => array_slice( (array) get_option( 'dwdla_mail_errors', array() ), -3 ),
	);
}

/** Log in to smtp.gmail.com with this password. Returns '' when Google accepts it, else the reason. */
function dwdsm_check( $user, $pass ) {
	if ( ! class_exists( 'PHPMailer\\PHPMailer\\SMTP' ) ) {
		require_once ABSPATH . WPINC . '/PHPMailer/SMTP.php';
		require_once ABSPATH . WPINC . '/PHPMailer/Exception.php';
	}
	$s = new PHPMailer\PHPMailer\SMTP();
	$s->Timeout = 20;
	if ( ! $s->connect( 'smtp.gmail.com', 587 ) ) {
		return 'Could not reach Google’s mail server from the website (' . ( $s->getError()['error'] ?? 'no answer' ) . ').';
	}
	$host = wp_parse_url( home_url(), PHP_URL_HOST );
	$ok   = $s->hello( $host ) && $s->startTLS() && $s->hello( $host ) && $s->authenticate( $user, $pass );
	$err  = $s->getError();
	$s->quit();
	$s->close();
	if ( $ok ) {
		return '';
	}
	$d = trim( (string) ( $err['detail'] ?? '' ) . ' ' . (string) ( $err['smtp_code_ex'] ?? '' ) );
	return preg_match( '/535|BadCredentials|Username and Password not accepted/i', $d )
		? 'Google didn’t accept that password. Make sure it’s an app password made while signed in as ' . $user . ' (16 letters).'
		: 'Google refused the login: ' . ( $d ?: (string) ( $err['error'] ?? 'unknown' ) );
}

function dwdsm_test() {
	$to = dwdsm_user();
	return wp_mail( $to, 'Test: your website now sends through Google Workspace', '<p>This test email was sent by dreamwebdigital.com through your Google Workspace account (' . esc_html( $to ) . ').</p><p>Onboarding forms, client emails and new-lead alerts now go out the same way, signed by Google, and a copy shows in your Gmail Sent folder.</p>', array( 'Content-Type: text/html; charset=UTF-8' ) );
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/sitemail', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () { return dwdsm_status(); } ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$pass = preg_replace( '/\s+/', '', (string) $r['pass'] );
			if ( strlen( $pass ) < 8 ) {
				return new WP_Error( 'dwdsm', 'Paste the 16-letter app password from Google.', array( 'status' => 400 ) );
			}
			$user = dwdsm_user();
			$why  = dwdsm_check( $user, $pass );
			if ( '' !== $why ) {
				return new WP_Error( 'dwdsm', $why, array( 'status' => 400 ) );
			}
			$o = (array) get_option( 'wp_mail_smtp', array() );
			$o['mail']             = array_merge( (array) ( $o['mail'] ?? array() ), array( 'mailer' => 'smtp', 'from_email' => $user, 'from_email_force' => true ) );
			$o['smtp']             = array_merge( (array) ( $o['smtp'] ?? array() ), array(
				'host'       => 'smtp.gmail.com',
				'port'       => 587,
				'encryption' => 'tls',
				'autotls'    => true,
				'auth'       => true,
				'user'       => $user,
				'pass'       => $pass,
			) );
			if ( class_exists( 'WPMailSMTP\\Options' ) ) {
				WPMailSMTP\Options::init()->set( $o, false, true ); // the plugin encrypts the password itself
			} else {
				update_option( 'wp_mail_smtp', $o );
			}
			update_option( 'dwdsm_since', current_time( 'mysql' ), false );
			$out         = dwdsm_status();
			$out['test'] = dwdsm_test();
			return $out;
		} ),
	) );
	register_rest_route( 'dwd/v1', '/crm/sitemail/test', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function () {
		$out         = dwdsm_status();
		$out['test'] = dwdsm_test();
		return $out;
	} ) );
} );

// WP Mail SMTP's admin-bar menu shows a stray notification "1" on the site header (the bar itself is hidden there).
add_action( 'wp_before_admin_bar_render', function () {
	global $wp_admin_bar;
	if ( $wp_admin_bar ) {
		$wp_admin_bar->remove_node( 'wp-mail-smtp-menu' );
	}
}, 999 );
