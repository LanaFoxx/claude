<?php
/**
 * thebayfieldinn.com (and www.) -> the same page on bayfieldinn.com, permanently (301).
 * Only runs when a request arrives on the other domain, so it does nothing until that
 * domain's DNS points at this server.
 */
defined( 'ABSPATH' ) || exit;

function bi_domain_redirect() {
	$host = strtolower( preg_replace( '/:\d+$/', '', (string) ( $_SERVER['HTTP_HOST'] ?? '' ) ) ); // phpcs:ignore
	if ( ! in_array( $host, array( 'thebayfieldinn.com', 'www.thebayfieldinn.com' ), true ) ) {
		return;
	}
	$target = 'https://bayfieldinn.com' . ( $_SERVER['REQUEST_URI'] ?? '/' ); // phpcs:ignore -- path + query kept as-is
	header( 'Location: ' . $target, true, 301 );
	header( 'Cache-Control: public, max-age=3600' );
	exit;
}
bi_domain_redirect();
