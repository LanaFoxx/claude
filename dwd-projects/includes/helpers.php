<?php
defined( 'ABSPATH' ) || exit;

/** Plugin settings with defaults. */
function dwdp_settings() {
	$defaults = array(
		'base_slug'      => 'portfolio',
		'portfolio_url'  => '/portfolio/',
		'microlink_key'  => '',
		'capture_width'  => 1440,
		'cta_title'      => 'Your project could be next.',
		'cta_text'       => 'Each of these projects began with a brief Zoom call. Tell me what you have in mind, and I’ll show you what’s possible.',
		'cta_button'     => 'Schedule a Zoom',
		'cta_url'        => 'https://calendly.com/dreamwebdigital/dream-web-digital-consultation-call',
		'cta_phone'      => '(772) 210-1728',
		'def_together'   => 'The client was a pleasure to work with, had every asset ready from the start and responded promptly whenever I needed input.',
		'def_platform'   => 'WordPress and Elementor',
		'def_scope'      => 'Full custom website design, no premade themes or templates.',
		'def_responsive' => 'Desktop, tablet, and mobile',
		'def_aftercare'  => 'Security setup, one-on-one training, and 2 months of post-launch support',
		'biz_summary'    => 'Dream Web Digital is a one-on-one web design business run by Michael, an experienced designer and developer based in Charlotte, North Carolina who works with clients nationwide. He personally designs, builds and hosts premium custom WordPress websites, gives every project his full attention, offers unlimited revisions and 2 months of aftercare, and is rated 5.0 stars on Google with 100% Job Success on Upwork.',
		'biz_city'       => 'Charlotte',
		'biz_areas'      => "Charlotte, NC\nMecklenburg County, NC\nConcord, NC\nGastonia, NC\nHuntersville, NC\nMatthews, NC\nRock Hill, SC",
		'biz_industries' => "Attorneys and law firms\nDoctors and medical practices\nConstruction companies\nRoofing companies\nRemodeling contractors\nAccounting firms\nFinancial advisors\nMental health practices\nFitness and training brands\nFlight schools\nRetail stores\nVending services\nMedical records services",
		'biz_services'   => "Custom website design\nWordPress website development\nElementor website design\nWebsite redesign\nSmall business website design\nManaged WordPress hosting\nWebsite maintenance and support\nSEO-ready website builds",
		'biz_promises'   => "One-on-one: you work directly with Michael, never a large agency, rotating team or overseas outsourcing\nFull time and attention on every project\nThe job gets done exactly as the client asks\nUnlimited revisions\nNo surprise charges: the project is finished as agreed, never paused midway to ask for more money\nCustom design, no templates\nFully responsive on desktop, tablet and mobile\nWordPress security setup and 1-on-1 training\n2 months of aftercare after launch, plus a lifetime workmanship warranty\nLong-term client relationships",
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
		'pinned'     => '0', // '1' = always first, whatever the order number
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
	// Pinned projects always come first; the rest keep their order.
	$pinned = array_filter( $q, function ( $p ) { return '1' === (string) dwdp_get( $p->ID, 'pinned' ); } );
	$q      = array_merge( array_values( $pinned ), array_values( array_diff_key( $q, $pinned ) ) );
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

/**
 * Two-tone heading, as used across the site: the first part thin, the rest heavy in blue.
 * Splits before the last $tail words (default: about half).
 */
function dwdp_two_tone( $title, $color = '#4BA3DC', $tail = 0 ) {
	$words = preg_split( '/\s+/', trim( (string) $title ) );
	if ( count( $words ) < 2 ) {
		return esc_html( $title );
	}
	$tail = $tail ? min( $tail, count( $words ) - 1 ) : (int) floor( count( $words ) / 2 );
	$head = array_slice( $words, 0, count( $words ) - $tail );
	$rest = array_slice( $words, count( $words ) - $tail );
	return '<span style="font-weight:200">' . esc_html( implode( ' ', $head ) ) . '</span> <span style="font-weight:900;color:' . esc_attr( $color ) . '">' . esc_html( implode( ' ', $rest ) ) . '</span>';
}
