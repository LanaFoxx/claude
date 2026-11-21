<?php
/**
 * Local landing pages ("Charlotte Web Design" …): one WordPress page per city, rendered by
 * templates/local-landing.php with the site's blog/project styles. Built for the Google Ads
 * landing page, the Google Business Profile website link and local search ("web design charlotte").
 * Add another city to dwdp_local_pages() to create its page.
 */
defined( 'ABSPATH' ) || exit;

function dwdp_local_pages() {
	return array(); // Michael: Charlotte page removed for now (the business profile is Treasure Coast). Old entry kept below for reuse.
	return array(
		'charlotte-web-design' => array(
			'city'   => 'Charlotte',
			'state'  => 'NC',
			'title'  => 'Charlotte Web Design',
			'seo'    => 'Charlotte Web Design | Custom WordPress Websites | Dream Web Digital',
			'desc'   => 'Charlotte web designer building custom WordPress websites for small businesses. 5.0★ on Google, Top Rated Plus on Upwork, 500+ sites built. Same-day replies.',
			'hoods'  => array( 'Uptown', 'South End', 'NoDa', 'Plaza Midwood', 'Dilworth', 'Myers Park', 'SouthPark', 'Ballantyne', 'University City', 'Steele Creek' ),
			'towns'  => array( 'Matthews', 'Mint Hill', 'Huntersville', 'Cornelius', 'Davidson', 'Mooresville', 'Concord', 'Kannapolis', 'Gastonia', 'Belmont', 'Mount Holly', 'Indian Trail', 'Waxhaw', 'Monroe', 'Fort Mill, SC', 'Rock Hill, SC', 'Lake Norman' ),
		),
	);
}

function dwdp_local_current() {
	if ( ! is_page() ) {
		return null;
	}
	$slug = get_post_field( 'post_name', get_queried_object_id() );
	$all  = dwdp_local_pages();
	return isset( $all[ $slug ] ) ? array_merge( $all[ $slug ], array( 'slug' => $slug ) ) : null;
}

// Create each local page once (published, so it can be linked and indexed).
add_action( 'init', function () {
	$done = (array) get_option( 'dwdp_local_made', array() );
	foreach ( dwdp_local_pages() as $slug => $p ) {
		if ( ! empty( $done[ $slug ] ) && get_post( $done[ $slug ] ) ) {
			continue;
		}
		$have = get_page_by_path( $slug );
		$id   = $have ? $have->ID : wp_insert_post( array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => $p['title'],
			'post_name'    => $slug,
			'post_excerpt' => $p['desc'],
			'post_content' => '<!-- This page is built by the Dream Web Digital plugin (templates/local-landing.php). -->',
		) );
		if ( $id && ! is_wp_error( $id ) ) {
			$done[ $slug ] = $id;
		}
	}
	update_option( 'dwdp_local_made', $done, false );
}, 30 );

add_filter( 'template_include', function ( $t ) {
	return dwdp_local_current() ? DWDP_DIR . 'templates/local-landing.php' : $t;
}, 99 );

// SEO title + description (Yoast, with plain WordPress as fallback).
add_filter( 'wpseo_title', function ( $t ) { $l = dwdp_local_current(); return $l ? $l['seo'] : $t; }, 99 );
add_filter( 'wpseo_opengraph_title', function ( $t ) { $l = dwdp_local_current(); return $l ? $l['seo'] : $t; }, 99 );
add_filter( 'wpseo_metadesc', function ( $d ) { $l = dwdp_local_current(); return $l ? $l['desc'] : $d; }, 99 );
add_filter( 'wpseo_opengraph_desc', function ( $d ) { $l = dwdp_local_current(); return $l ? $l['desc'] : $d; }, 99 );
add_filter( 'pre_get_document_title', function ( $t ) { $l = dwdp_local_current(); return $l ? $l['seo'] : $t; }, 99 );

// Styles in the head (project cards are used on the page).
add_action( 'wp_enqueue_scripts', function () {
	if ( dwdp_local_current() ) {
		wp_enqueue_style( 'dwdp-front' );
	}
}, 21 );

// The Charlotte page is retired for now: send its address (and any ads or links) to the homepage.
add_action( 'template_redirect', function () {
	$path = trim( (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ), '/' ); // phpcs:ignore
	if ( 'charlotte-web-design' === $path ) {
		wp_safe_redirect( home_url( '/' ), 301 );
		exit;
	}
}, 1 );

/* Saved business settings from the Charlotte period fall back to the Treasure Coast defaults (once). */
add_action( 'admin_init', function () {
	if ( get_option( 'dwdp_loc_tc_2026_11' ) || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$saved = get_option( 'dwdp_settings', array() );
	if ( is_array( $saved ) ) {
		foreach ( array( 'biz_summary', 'biz_city', 'biz_areas' ) as $k ) {
			if ( isset( $saved[ $k ] ) && preg_match( '/Charlotte|Mecklenburg|5\.0/', $saved[ $k ] ) ) {
				unset( $saved[ $k ] );
			}
		}
		update_option( 'dwdp_settings', $saved );
	}
	update_option( 'dwdp_loc_tc_2026_11', 1, false );
} );
