<?php
defined( 'ABSPATH' ) || exit;

/** Plugin settings with defaults. */
function dwdp_settings() {
	$defaults = array(
		'base_slug'      => 'portfolio',
		'portfolio_url'  => '/portfolio/',
		'microlink_key'  => '',
		'capture_width'  => 1440,
		'cta_title'      => 'Yours could be next.',
		'cta_text'       => "Every one of these started with a quick Zoom call. Tell me what you're dreaming up.",
		'cta_button'     => 'Schedule a Zoom',
		'cta_url'        => 'https://calendly.com/dreamwebdigital/dream-web-digital-consultation-call',
		'cta_phone'      => '(772) 771-8882',
		'def_platform'   => 'WordPress · Elementor',
		'def_scope'      => 'Custom design & full development — no pre-made themes',
		'def_responsive' => 'Desktop, tablet, and mobile',
		'def_aftercare'  => 'Security setup, 1-on-1 training, 2 months post-launch support',
	);
	$saved = get_option( 'dwdp_settings', array() );
	return wp_parse_args( is_array( $saved ) ? $saved : array(), $defaults );
}

function dwdp_setting( $key ) {
	$s = dwdp_settings();
	return isset( $s[ $key ] ) ? $s[ $key ] : '';
}

function dwdp_base_slug() {
	$slug = sanitize_title( dwdp_setting( 'base_slug' ) );
	return $slug ? $slug : 'portfolio';
}

/** All project meta fields: key => default. */
function dwdp_fields() {
	return array(
		'url'        => '',
		'industry'   => '',
		'summary'    => '',
		'together'   => '',
		'review'     => '',
		'review_by'  => '',
		'platform'   => '',
		'scope'      => '',
		'responsive' => '',
		'aftercare'  => '',
		'on_home'    => '1',
		'sections'   => '', // comma-separated attachment IDs, in order
		'cover'      => '', // attachment ID used on portfolio cards + homepage carousel
		'mockup'     => '', // attachment ID of the phone mockup
		'fullshot'   => '', // attachment ID of the full-page capture
		'mobileshot' => '', // attachment ID of the raw mobile capture
		'cuts'       => '', // JSON list of cut positions (px) used for the last split
	);
}

function dwdp_get( $post_id, $key ) {
	$fields = dwdp_fields();
	$value  = get_post_meta( $post_id, '_dwdp_' . $key, true );
	if ( '' === $value || false === $value ) {
		$value = isset( $fields[ $key ] ) ? $fields[ $key ] : '';
		if ( in_array( $key, array( 'platform', 'scope', 'responsive', 'aftercare' ), true ) ) {
			$value = dwdp_setting( 'def_' . $key );
		}
	}
	return $value;
}

function dwdp_ids( $csv ) {
	return array_values( array_filter( array_map( 'absint', explode( ',', (string) $csv ) ) ) );
}

/** Published projects in display order. */
function dwdp_projects( $only_home = false ) {
	$q = get_posts(
		array(
			'post_type'      => DWDP_CPT,
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
		)
	);
	if ( $only_home ) {
		$q = array_values( array_filter( $q, function ( $p ) { return '1' === (string) dwdp_get( $p->ID, 'on_home' ); } ) );
	}
	return $q;
}

/** Two-digit position of a project in the portfolio (01, 02, ...). */
function dwdp_number( $post_id ) {
	static $order = null;
	if ( null === $order ) {
		$order = wp_list_pluck( dwdp_projects(), 'ID' );
	}
	$i = array_search( (int) $post_id, array_map( 'intval', $order ), true );
	return sprintf( '%02d', false === $i ? 0 : $i + 1 );
}

/** Domain shown in the browser-bar of the homepage carousel. */
function dwdp_domain( $post_id ) {
	$url  = dwdp_get( $post_id, 'url' );
	$host = $url ? wp_parse_url( $url, PHP_URL_HOST ) : '';
	return $host ? preg_replace( '/^www\./', '', $host ) : get_the_title( $post_id );
}

/** Image tag for an attachment, with a sensible alt fallback. */
function dwdp_img( $id, $alt = '', $attrs = array() ) {
	$id = absint( $id );
	if ( ! $id ) {
		return '';
	}
	if ( '' === trim( (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) ) && $alt ) {
		$attrs['alt'] = $alt;
	}
	return wp_get_attachment_image( $id, 'full', false, $attrs );
}

/** Full-resolution file URL (skips WordPress's "-scaled" copy of very large images). */
function dwdp_original_url( $id ) {
	$url = function_exists( 'wp_get_original_image_url' ) ? wp_get_original_image_url( $id ) : '';
	return $url ? $url : wp_get_attachment_url( $id );
}
