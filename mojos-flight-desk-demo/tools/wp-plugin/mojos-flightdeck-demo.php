<?php
/**
 * Plugin Name: Mojo's Flight Desk — Public Demo
 * Description: Serves the portfolio demo of the Flight Desk at /flightdeck-demo/. Static files with sample data only — it never reads the real Flight Desk database.
 * Version: 1.0.0
 */
if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'init', function () {
	$path = (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH );
	if ( ! preg_match( '#^/flightdeck-demo(/.*)?$#', $path, $m ) ) return;
	if ( empty( $m[1] ) ) { wp_safe_redirect( home_url( '/flightdeck-demo/' ), 301 ); exit; }
	$rel  = ltrim( $m[1], '/' );
	if ( $rel === '' ) $rel = 'index.html';
	$base = realpath( __DIR__ . '/site' );
	$file = realpath( $base . '/' . $rel );
	if ( ! defined( 'DONOTCACHEPAGE' ) ) define( 'DONOTCACHEPAGE', true );
	if ( ! $file || strpos( $file, $base . DIRECTORY_SEPARATOR ) !== 0 || ! is_file( $file ) ) { status_header( 404 ); header( 'Content-Type: text/plain' ); echo 'Not found'; exit; }
	$types = array( 'html' => 'text/html; charset=utf-8', 'css' => 'text/css; charset=utf-8', 'js' => 'application/javascript; charset=utf-8', 'png' => 'image/png', 'ttf' => 'font/ttf' );
	$ext = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );
	if ( ! isset( $types[ $ext ] ) ) { status_header( 404 ); exit; }
	status_header( 200 );
	header( 'Content-Type: ' . $types[ $ext ] );
	header( 'X-Robots-Tag: noindex, nofollow' );
	header( 'X-Content-Type-Options: nosniff' );
	header( 'Cache-Control: ' . ( $ext === 'html' ? 'no-cache' : 'public, max-age=3600' ) );
	header( 'Content-Length: ' . filesize( $file ) );
	readfile( $file );
	exit;
}, 0 );
