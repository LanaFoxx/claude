<?php
/**
 * One-time import of the hand-built project pages (children of the Portfolio page)
 * into Projects. Keeps the same URLs, images and Yoast SEO settings, then sets the
 * old pages to Draft so the new project pages take over.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=' . DWDP_CPT, 'Import existing projects', 'Import', 'manage_options', 'dwdp-import', 'dwdp_import_page' );
} );

function dwdp_import_data() {
	$file = DWDP_DIR . 'data/existing-projects.json';
	$data = file_exists( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : array(); // phpcs:ignore
	return is_array( $data ) ? $data : array();
}

function dwdp_import_page() {
	$items = dwdp_import_data();
	$done  = get_option( 'dwdp_imported', array() );
	echo '<div class="wrap"><h1>Import existing projects</h1>';
	if ( isset( $_GET['imported'] ) ) { // phpcs:ignore
		echo '<div class="notice notice-success"><p>Imported ' . absint( $_GET['imported'] ) . ' project(s). The old pages were set to Draft and the same addresses now show the new project pages.</p></div>'; // phpcs:ignore
	}
	echo '<p>Moves the portfolio projects that were built as separate pages into the Projects list, keeping their addresses, images, text and SEO settings. The old pages are set to <strong>Draft</strong> (not deleted), so you can switch back anytime.</p>';
	echo '<table class="widefat striped" style="max-width:820px"><thead><tr><th>#</th><th>Project</th><th>Address</th><th>Images</th><th>Status</th></tr></thead><tbody>';
	foreach ( $items as $p ) {
		$status = isset( $done[ $p['old_page'] ] ) ? '<a href="' . esc_url( get_edit_post_link( $done[ $p['old_page'] ] ) ) . '">Imported</a>' : ( get_post( $p['old_page'] ) ? 'Ready' : 'Old page not found' );
		printf(
			'<tr><td>%s</td><td>%s</td><td>/%s/%s/</td><td>%d</td><td>%s</td></tr>',
			esc_html( sprintf( '%02d', $p['order'] ) ),
			esc_html( $p['name'] ),
			esc_html( dwdp_base_slug() ),
			esc_html( $p['slug'] ),
			count( $p['sections'] ),
			wp_kses_post( $status )
		);
	}
	echo '</tbody></table>';
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" style="margin-top:16px">';
	wp_nonce_field( 'dwdp_import' );
	echo '<input type="hidden" name="action" value="dwdp_import">';
	submit_button( 'Import projects', 'primary', 'submit', false );
	echo '</form></div>';
}

add_action( 'admin_post_dwdp_import', function () {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Not allowed.' );
	}
	check_admin_referer( 'dwdp_import' );
	$count = dwdp_run_import();
	wp_safe_redirect( admin_url( 'edit.php?post_type=' . DWDP_CPT . '&page=dwdp-import&imported=' . $count ) );
	exit;
} );

function dwdp_run_import() {
	$done  = get_option( 'dwdp_imported', array() );
	$count = 0;
	$yoast = array( '_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_focuskw', '_yoast_wpseo_meta-robots-noindex', '_yoast_wpseo_is_cornerstone', '_yoast_wpseo_opengraph-image', '_yoast_wpseo_opengraph-image-id' );
	foreach ( dwdp_import_data() as $p ) {
		if ( isset( $done[ $p['old_page'] ] ) && get_post( $done[ $p['old_page'] ] ) ) {
			continue;
		}
		$old = get_post( $p['old_page'] );
		// Free the slug: the old page keeps its address only while it stays published.
		if ( $old && 'publish' === $old->post_status ) {
			wp_update_post( array( 'ID' => $old->ID, 'post_status' => 'draft' ) );
		}
		$id = wp_insert_post(
			array(
				'post_type'   => DWDP_CPT,
				'post_status' => 'publish',
				'post_title'  => $p['name'],
				'post_name'   => $p['slug'],
				'menu_order'  => (int) $p['order'],
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			if ( $old ) {
				wp_update_post( array( 'ID' => $old->ID, 'post_status' => $old->post_status ) );
			}
			continue;
		}
		foreach ( array( 'url', 'industry', 'summary', 'together', 'review', 'review_by', 'platform', 'scope', 'responsive', 'aftercare' ) as $k ) {
			update_post_meta( $id, '_dwdp_' . $k, $p[ $k ] );
		}
		update_post_meta( $id, '_dwdp_on_home', '1' );
		update_post_meta( $id, '_dwdp_sections', implode( ',', array_map( 'absint', $p['sections'] ) ) );
		update_post_meta( $id, '_dwdp_mockup', absint( $p['mockup'] ) );
		$cover = attachment_url_to_postid( $p['cover_url'] );
		if ( $cover ) {
			update_post_meta( $id, '_dwdp_cover', $cover );
		}
		if ( $old ) {
			foreach ( $yoast as $key ) {
				$val = get_post_meta( $old->ID, $key, true );
				if ( '' !== $val ) {
					update_post_meta( $id, $key, $val );
				}
			}
		}
		$done[ $p['old_page'] ] = $id;
		$count++;
	}
	update_option( 'dwdp_imported', $done, false );
	flush_rewrite_rules();
	return $count;
}
