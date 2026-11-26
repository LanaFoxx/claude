<?php
/**
 * Other domains pointed at this server, permanently redirected (301):
 * - thebayfieldinn.com (and www.) -> the same page on bayfieldinn.com
 * - bayfieldlive.com (and www.)   -> the live webcam page
 * Only runs when a request arrives on one of those domains.
 */
defined( 'ABSPATH' ) || exit;

function bi_domain_redirect() {
	$host = strtolower( preg_replace( '/:\d+$/', '', (string) ( $_SERVER['HTTP_HOST'] ?? '' ) ) ); // phpcs:ignore
	if ( in_array( $host, array( 'bayfieldlive.com', 'www.bayfieldlive.com' ), true ) ) {
		$target = 'https://bayfieldinn.com/webcam/';
	} elseif ( in_array( $host, array( 'thebayfieldinn.com', 'www.thebayfieldinn.com' ), true ) ) {
		$target = 'https://bayfieldinn.com' . ( $_SERVER['REQUEST_URI'] ?? '/' ); // phpcs:ignore -- path + query kept as-is
	} else {
		return;
	}
	header( 'Location: ' . $target, true, 301 );
	header( 'Cache-Control: public, max-age=3600' );
	exit;
}
bi_domain_redirect();
