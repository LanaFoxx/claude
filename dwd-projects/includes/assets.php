<?php
/**
 * Project assets: files Mike keeps with a project (photos, logos, fonts, zips).
 * Stored as normal media-library attachments; the list of ids lives in _dwdc_assets on the project.
 */

defined( 'ABSPATH' ) || exit;

/** Asset list for a project, newest first. */
function dwda_list( $id ) {
	$ids = array_values( array_filter( array_map( 'intval', (array) get_post_meta( $id, '_dwdc_assets', true ) ) ) );
	$out = array();
	foreach ( array_reverse( $ids ) as $aid ) {
		$p = get_post( $aid );
		if ( ! $p || 'attachment' !== $p->post_type ) {
			continue;
		}
		$file  = get_attached_file( $aid );
		$mime  = (string) get_post_mime_type( $aid );
		$img   = 0 === strpos( $mime, 'image/' ) && 'image/svg+xml' !== $mime;
		$thumb = $img ? wp_get_attachment_image_src( $aid, 'medium' ) : false;
		$out[] = array(
			'id'    => $aid,
			'name'  => $file ? wp_basename( $file ) : $p->post_title,
			'url'   => wp_get_attachment_url( $aid ),
			'thumb' => $thumb ? $thumb[0] : '',
			'mime'  => $mime,
			'size'  => $file && file_exists( $file ) ? filesize( $file ) : 0,
			'date'  => get_the_date( 'Y-m-d', $p ),
		);
	}
	return $out;
}

/** Extra file types allowed only while an asset is being uploaded (zips and fonts). */
function dwda_mimes( $m ) {
	return array_merge( $m, array(
		'zip'   => 'application/zip',
		'otf'   => 'font/otf',
		'ttf'   => 'font/ttf',
		'woff'  => 'font/woff',
		'woff2' => 'font/woff2',
		'eps'   => 'application/postscript',
		'ai'    => 'application/postscript',
		'psd'   => 'image/vnd.adobe.photoshop',
	) );
}

add_filter( 'dwdc_contact_full', function ( $c, $id ) {
	$c['assets'] = dwda_list( $id );
	$c['drive']  = (string) get_post_meta( $id, '_dwdc_drive', true );
	return $c;
}, 13, 2 );

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'edit_posts' ); };
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/asset', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id = (int) $r['id'];
		if ( ! get_post( $id ) || DWDC_CONTACT !== get_post_type( $id ) ) {
			return new WP_Error( 'dwda', 'Project not found.', array( 'status' => 404 ) );
		}
		if ( empty( $_FILES['file'] ) ) {
			return new WP_Error( 'dwda', 'No file received.', array( 'status' => 400 ) );
		}
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		add_filter( 'upload_mimes', 'dwda_mimes' );
		// WordPress's type sniffing rejects fonts/zips whose detected type differs slightly; trust the allowed extension.
		$fix = function ( $d, $file, $filename, $mimes ) {
			if ( empty( $d['ext'] ) ) {
				$t = wp_check_filetype( $filename, dwda_mimes( array() ) );
				if ( $t['ext'] ) {
					$d = array( 'ext' => $t['ext'], 'type' => $t['type'], 'proper_filename' => false );
				}
			}
			return $d;
		};
		add_filter( 'wp_check_filetype_and_ext', $fix, 10, 4 );
		$aid = media_handle_upload( 'file', $id );
		remove_filter( 'wp_check_filetype_and_ext', $fix, 10 );
		remove_filter( 'upload_mimes', 'dwda_mimes' );
		if ( is_wp_error( $aid ) ) {
			return new WP_Error( 'dwda', $aid->get_error_message(), array( 'status' => 400 ) );
		}
		$ids   = array_values( array_filter( array_map( 'intval', (array) get_post_meta( $id, '_dwdc_assets', true ) ) ) );
		$ids[] = (int) $aid;
		update_post_meta( $id, '_dwdc_assets', $ids );
		return array( 'assets' => dwda_list( $id ) );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/asset/(?P<aid>\d+)', array( 'methods' => 'DELETE', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id  = (int) $r['id'];
		$aid = (int) $r['aid'];
		$ids = array_values( array_filter( array_map( 'intval', (array) get_post_meta( $id, '_dwdc_assets', true ) ) ) );
		if ( ! in_array( $aid, $ids, true ) ) {
			return new WP_Error( 'dwda', 'That file is not on this project.', array( 'status' => 404 ) );
		}
		update_post_meta( $id, '_dwdc_assets', array_values( array_diff( $ids, array( $aid ) ) ) );
		wp_delete_attachment( $aid, true );
		return array( 'assets' => dwda_list( $id ) );
	} ) );
} );
