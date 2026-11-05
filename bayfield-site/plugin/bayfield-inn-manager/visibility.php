<?php
/**
 * Page on/off switch: Pages › All Pages gets an "On website" toggle.
 * Off = only logged-in editors can see the page (with a notice); everyone else gets "not found".
 * Hidden pages drop out of navigation menus and the XML sitemap and are marked noindex.
 */
defined( 'ABSPATH' ) || exit;

const BI_HIDDEN_META = '_bi_hidden';

function bi_page_hidden( $id ) {
	return (bool) get_post_meta( (int) $id, BI_HIDDEN_META, true );
}

function bi_hidden_page_ids() {
	static $ids = null;
	if ( null === $ids ) {
		$ids = array_map( 'intval', get_posts( array( 'post_type' => 'page', 'post_status' => 'any', 'fields' => 'ids', 'numberposts' => -1,
			'meta_key' => BI_HIDDEN_META, 'meta_value' => '1' ) ) ); // phpcs:ignore
	}
	return $ids;
}

/* ------------------------------------------------------------ admin list */
add_filter( 'manage_page_posts_columns', function ( $cols ) {
	$new = array();
	foreach ( $cols as $k => $v ) {
		$new[ $k ] = $v;
		if ( 'title' === $k ) {
			$new['bi_visible'] = 'On website';
		}
	}
	return $new;
} );

add_action( 'manage_page_posts_custom_column', function ( $col, $id ) {
	if ( 'bi_visible' !== $col ) {
		return;
	}
	if ( (int) get_option( 'page_on_front' ) === (int) $id ) {
		echo '<span class="bi-vis-note">Homepage (always on)</span>';
		return;
	}
	$on = ! bi_page_hidden( $id );
	printf( '<button type="button" class="bi-vis-toggle%s" data-id="%d" aria-pressed="%s" title="%s"><span class="bi-vis-track"><span class="bi-vis-knob"></span></span><span class="bi-vis-label">%s</span></button>',
		$on ? ' is-on' : '', (int) $id, $on ? 'true' : 'false', esc_attr__( 'Show or hide this page on the website' ), $on ? 'On' : 'Off' );
}, 10, 2 );

add_action( 'admin_head-edit.php', function () {
	if ( 'page' !== ( $GLOBALS['typenow'] ?? '' ) ) {
		return;
	}
	?>
	<style>
	.column-bi_visible { width: 120px; }
	.bi-vis-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 2px 0; border: 0; background: none; cursor: pointer; }
	.bi-vis-track { position: relative; width: 36px; height: 20px; border-radius: 999px; background: #c3c4c7; transition: background .2s; }
	.bi-vis-knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: left .2s; }
	.bi-vis-toggle.is-on .bi-vis-track { background: #17301B; }
	.bi-vis-toggle.is-on .bi-vis-knob { left: 18px; }
	.bi-vis-label { font-weight: 600; min-width: 22px; text-align: left; }
	.bi-vis-toggle.is-busy { opacity: .5; pointer-events: none; }
	.bi-vis-note { color: #646970; font-size: 12px; }
	</style>
	<script>
	jQuery(function ($) {
		$(document).on('click', '.bi-vis-toggle', function () {
			var $b = $(this), on = !$b.hasClass('is-on');
			$b.addClass('is-busy');
			$.post(ajaxurl, { action: 'bi_toggle_page', id: $b.data('id'), on: on ? 1 : 0, nonce: <?php echo wp_json_encode( wp_create_nonce( 'bi_toggle_page' ) ); ?> })
				.done(function (r) {
					if (!r || !r.success) { alert('Could not change this page. Please try again.'); return; }
					$b.toggleClass('is-on', on).attr('aria-pressed', on ? 'true' : 'false').find('.bi-vis-label').text(on ? 'On' : 'Off');
				})
				.fail(function () { alert('Could not change this page. Please try again.'); })
				.always(function () { $b.removeClass('is-busy'); });
		});
	});
	</script>
	<?php
} );

add_action( 'wp_ajax_bi_toggle_page', function () {
	check_ajax_referer( 'bi_toggle_page', 'nonce' );
	$id = (int) ( $_POST['id'] ?? 0 );
	if ( ! $id || 'page' !== get_post_type( $id ) || ! current_user_can( 'edit_page', $id ) ) {
		wp_send_json_error( 'Not allowed', 403 );
	}
	if ( ! empty( $_POST['on'] ) ) {
		delete_post_meta( $id, BI_HIDDEN_META );
	} else {
		update_post_meta( $id, BI_HIDDEN_META, '1' );
	}
	if ( function_exists( 'sg_cachepress_purge_cache' ) ) {
		sg_cachepress_purge_cache(); // menus appear on every page
	}
	wp_send_json_success( array( 'on' => ! bi_page_hidden( $id ) ) );
} );

/* --------------------------------------------------------------- front */
add_action( 'template_redirect', function () {
	if ( ! is_page() || ! bi_page_hidden( get_queried_object_id() ) ) {
		return;
	}
	nocache_headers();
	if ( current_user_can( 'edit_pages' ) ) {
		return; // Editors can preview it.
	}
	global $wp_query;
	$wp_query->set_404();
	status_header( 404 );
} );

add_action( 'wp_head', function () {
	if ( is_page() && bi_page_hidden( get_queried_object_id() ) ) {
		echo '<meta name="robots" content="noindex, nofollow">' . "\n";
	}
}, 0 );

// Admin bar notice while previewing a hidden page.
add_action( 'admin_bar_menu', function ( $bar ) {
	if ( is_admin() || ! is_page() || ! bi_page_hidden( get_queried_object_id() ) ) {
		return;
	}
	$bar->add_node( array( 'id' => 'bi-hidden-page', 'title' => '&#9888; This page is OFF: only logged-in editors can see it',
		'href' => admin_url( 'edit.php?post_type=page' ), 'meta' => array( 'class' => 'bi-hidden-page' ) ) );
}, 90 );
add_action( 'wp_head', function () {
	if ( is_admin_bar_showing() && is_page() && bi_page_hidden( get_queried_object_id() ) ) {
		echo '<style>#wp-admin-bar-bi-hidden-page > .ab-item{background:#b32d2e!important;color:#fff!important;font-weight:600}</style>';
	}
} );

// Drop hidden pages (and their sub-items) from navigation menus.
add_filter( 'wp_nav_menu_objects', function ( $items ) {
	$hidden = bi_hidden_page_ids();
	if ( ! $hidden ) {
		return $items;
	}
	$drop = array();
	foreach ( $items as $it ) {
		if ( 'page' === $it->object && in_array( (int) $it->object_id, $hidden, true ) ) {
			$drop[] = (int) $it->ID;
		} elseif ( 'custom' === $it->type ) {
			$pid = url_to_postid( $it->url );
			if ( $pid && in_array( $pid, $hidden, true ) ) {
				$drop[] = (int) $it->ID;
			}
		}
	}
	do {
		$before = count( $drop );
		foreach ( $items as $it ) {
			if ( in_array( (int) $it->menu_item_parent, $drop, true ) && ! in_array( (int) $it->ID, $drop, true ) ) {
				$drop[] = (int) $it->ID;
			}
		}
	} while ( count( $drop ) !== $before );
	return array_values( array_filter( $items, function ( $it ) use ( $drop ) { return ! in_array( (int) $it->ID, $drop, true ); } ) );
} );

// Keep hidden pages out of the XML sitemap.
add_filter( 'wp_sitemaps_posts_query_args', function ( $args, $type ) {
	if ( 'page' === $type && bi_hidden_page_ids() ) {
		$args['post__not_in'] = array_merge( $args['post__not_in'] ?? array(), bi_hidden_page_ids() );
	}
	return $args;
}, 10, 2 );

// Hide hand-placed links to hidden pages (e.g. the footer's Explore list) for visitors.
add_action( 'wp_head', function () {
	if ( current_user_can( 'edit_pages' ) || ! bi_hidden_page_ids() ) {
		return;
	}
	$sel = array();
	foreach ( bi_hidden_page_ids() as $id ) {
		$url  = get_permalink( $id );
		$path = wp_make_link_relative( $url );
		foreach ( array_unique( array( $url, $path, untrailingslashit( $path ) ) ) as $h ) {
			$h     = esc_attr( $h );
			$sel[] = ".elementor-icon-list-item:has(> a[href=\"$h\"])";
			$sel[] = ".elementor-widget-button:has(a[href=\"$h\"])";
		}
	}
	echo '<style id="bi-hidden-links">' . implode( ',', $sel ) . '{display:none!important}</style>' . "\n"; // phpcs:ignore
}, 20 );
