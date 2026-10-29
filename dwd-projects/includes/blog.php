<?php
/**
 * Blog: styled single-post template, [dwd_blog] listing grid, and a few schema extras.
 * Posts are written in the normal WordPress editor; this file makes them match the site.
 */
defined( 'ABSPATH' ) || exit;

add_filter( 'template_include', function ( $template ) {
	if ( is_singular( 'post' ) && ! locate_template( array( 'single-post.php' ) ) ) {
		return DWDP_DIR . 'templates/single-post.php';
	}
	return $template;
}, 20 );

add_action( 'wp_enqueue_scripts', function () {
	if ( is_singular( 'post' ) ) {
		wp_enqueue_style( 'dwdp-front' );
	}
}, 20 );

/** Estimated reading time in minutes. */
function dwdp_reading_time( $post = null ) {
	$words = str_word_count( wp_strip_all_tags( get_post_field( 'post_content', $post ) ) );
	return max( 1, (int) round( $words / 230 ) );
}

function dwdp_post_card( $p ) {
	$cats  = get_the_category( $p->ID );
	$cat   = $cats ? $cats[0]->name : 'Blog';
	$thumb = get_the_post_thumbnail( $p, 'large', array( 'loading' => 'lazy', 'alt' => get_the_title( $p ) ) );
	return sprintf(
		'<a class="dwb-card" href="%1$s"><span class="dwb-card-img">%2$s</span><span class="dwb-card-body"><span class="dwb-card-cat">%3$s · %4$d min read</span><span class="dwb-card-title">%5$s</span><span class="dwb-card-ex">%6$s</span><span class="dwb-card-more">Read article →</span></span></a>',
		esc_url( get_permalink( $p ) ),
		$thumb,
		esc_html( $cat ),
		dwdp_reading_time( $p ),
		esc_html( get_the_title( $p ) ),
		esc_html( wp_trim_words( get_the_excerpt( $p ), 26 ) )
	);
}

/** [dwd_blog limit="12" exclude=""] — grid of the latest posts. */
add_shortcode( 'dwd_blog', function ( $atts ) {
	$atts  = shortcode_atts( array( 'limit' => 12, 'exclude' => '' ), $atts );
	$posts = get_posts(
		array(
			'post_type'      => 'post',
			'post_status'    => 'publish',
			'posts_per_page' => absint( $atts['limit'] ),
			'post__not_in'   => array_filter( array_map( 'absint', explode( ',', (string) $atts['exclude'] ) ) ),
		)
	);
	if ( ! $posts ) {
		return '<p class="dwb-empty">New articles are on the way.</p>';
	}
	dwdp_enqueue_front();
	$out = '<div class="dwb-grid">';
	foreach ( $posts as $p ) {
		$out .= dwdp_post_card( $p );
	}
	return $out . '</div>';
} );

/** Add the business phone to Yoast's Organization schema (Yoast free doesn't output it). */
add_filter( 'wpseo_schema_organization', function ( $data ) {
	$phone = trim( dwdp_setting( 'cta_phone' ) );
	if ( $phone ) {
		$digits            = preg_replace( '/\D/', '', $phone );
		$data['telephone'] = 10 === strlen( $digits ) ? '+1-' . substr( $digits, 0, 3 ) . '-' . substr( $digits, 3, 3 ) . '-' . substr( $digits, 6 ) : $phone;
	}
	return $data;
} );
