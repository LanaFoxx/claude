<?php
/**
 * Website Onboarding form (Elementor): admin tool to read the form's fields and make them required,
 * with an intro note at the top. Changes the page's saved Elementor data; a backup copy is kept.
 */
defined( 'ABSPATH' ) || exit;

/** Find the page(s) holding the onboarding form. Returns [ [post_id, data(array)] ]. */
function dwdob_pages() {
	global $wpdb;
	$ids = $wpdb->get_col( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_elementor_data' AND meta_value LIKE '%Onboarding%' AND meta_value LIKE '%form_fields%'" ); // phpcs:ignore
	$out = array();
	foreach ( $ids as $id ) {
		if ( 'revision' === get_post_type( $id ) ) {
			continue;
		}
		$data = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
		if ( is_array( $data ) ) {
			$out[] = array( (int) $id, $data );
		}
	}
	return $out;
}
/** Walk the Elementor tree; $fn gets each form widget's settings by reference. */
function dwdob_walk( &$els, $fn ) {
	foreach ( $els as &$el ) {
		if ( 'widget' === ( $el['elType'] ?? '' ) && 'form' === ( $el['widgetType'] ?? '' ) && false !== stripos( (string) ( $el['settings']['form_name'] ?? '' ), 'onboard' ) ) {
			$fn( $el['settings'] );
		}
		if ( ! empty( $el['elements'] ) ) {
			dwdob_walk( $el['elements'], $fn );
		}
	}
}
/** File types every onboarding upload box accepts (also checked in the browser by assets/onboarding.js). */
function dwdob_upload_types() {
	return 'jpg,jpeg,png,gif,webp,heic,svg,ai,eps,psd,pdf,doc,docx,txt,rtf,pages,odt,xls,xlsx,csv,ppt,pptx,key,ttf,otf,woff,woff2,zip,mp4,mov,webm,m4v';
}
/** Make every answer field required (uploads stay optional), add the intro note, and sharpen the inspiration question. */
function dwdob_apply() {
	$intro = '<div class="dwo-must" style="margin:0 0 18px;padding:14px 16px;border-radius:10px;background:#EEF4FF;border:1px solid #C9D8F5;color:#0F2447;font-size:15px;line-height:1.55">'
		. '<strong>Please fill out every part of this form and take your time.</strong> The more complete your answers, the better we can work together, and the faster and smoother your website comes together. '
		. 'If a question doesn’t apply to you, just write <strong>N/A</strong>.<br><br>'
		. '<strong>Most important:</strong> the websites you like for inspiration (in step 4). Please paste the links and tell me what you like about each one.</div>';
	$changed = array();
	foreach ( dwdob_pages() as $pg ) {
		list( $id, $data ) = $pg;
		$orig = get_post_meta( $id, '_elementor_data', true );
		dwdob_walk( $data, function ( &$st ) use ( $intro, &$changed ) {
			foreach ( $st['form_fields'] as &$x ) {
				$t   = $x['field_type'] ?? 'text';
				$cid = $x['custom_id'] ?? '';
				if ( 'step_contact_intro' === $cid && false === strpos( (string) $x['field_html'], 'dwo-must' ) ) {
					$x['field_html'] = $intro . $x['field_html'];
					$changed[]       = 'intro';
				}
				// Upload boxes: one broad list of file types for every box (a logo pack often comes as a zip),
				// bigger size limits. Files too big for the form go in the shared-folder link instead.
				if ( 'upload' === $t ) {
					$types = dwdob_upload_types();
					$size  = 'media_upload' === $cid ? '100' : '50';
					if ( ( $x['file_types'] ?? '' ) !== $types || (string) ( $x['file_sizes'] ?? '' ) !== $size ) {
						$x['file_types'] = $types;
						$x['file_sizes'] = $size;
						$changed[]       = $cid . ':types';
					}
					continue;
				}
				if ( 'shared_folder' === $cid && false === strpos( (string) ( $x['field_label'] ?? '' ), 'Dropbox' ) ) {
					$x['field_label'] = 'Link to a Google Drive, Dropbox or WeTransfer folder with your files (use this for anything too big to upload above)';
					$x['placeholder'] = 'Paste the folder link, or write N/A';
					$changed[]        = 'shared_folder:label';
				}
				if ( in_array( $t, array( 'step', 'html', 'upload', 'hidden', 'recaptcha', 'recaptcha_v3', 'honeypot' ), true ) ) {
					continue;
				}
				if ( 'url' === $t ) { // allow "N/A" for people without a site / folder
					$x['field_type']  = 'text';
					$x['placeholder'] = 'Paste the link, or write N/A';
					$changed[]        = $cid . ':text';
				}
				if ( 'true' !== ( $x['required'] ?? '' ) ) {
					$x['required'] = 'true';
					$changed[]     = $cid . ':required';
				}
				if ( 'inspiration' === $cid ) {
					$x['field_label'] = 'List 3–4 websites you like (paste the links) and what you like about each one';
					$x['placeholder'] = "https://example.com – I like the clean layout and big photos
https://example2.com – I like how easy it is to book
(Please list them here even if you’ve sent them before.)";
					$changed[]        = 'inspiration:label';
				}
			}
		} );
		if ( $changed ) {
			if ( ! get_post_meta( $id, '_dwdob_backup', true ) ) {
				update_post_meta( $id, '_dwdob_backup', wp_slash( $orig ) );
			}
			update_post_meta( $id, '_elementor_data', wp_slash( wp_json_encode( $data ) ) );
			delete_post_meta( $id, '_elementor_element_cache' );
			if ( class_exists( '\\Elementor\\Plugin' ) ) {
				\Elementor\Plugin::$instance->files_manager->clear_cache();
			}
		}
	}
	return array_values( array_unique( $changed ) );
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/onboard-form', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function () { return array( 'changed' => dwdob_apply() ); } ) );
	register_rest_route( 'dwd/v1', '/crm/onboard-form', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function () {
		$res = array();
		foreach ( dwdob_pages() as $pg ) {
			list( $id, $data ) = $pg;
			dwdob_walk( $data, function ( &$st ) use ( &$res, $id ) {
				$f = array();
				foreach ( (array) ( $st['form_fields'] ?? array() ) as $x ) {
					$f[] = array( 'id' => $x['custom_id'] ?? '', 'type' => $x['field_type'] ?? 'text', 'label' => $x['field_label'] ?? '', 'required' => ( $x['required'] ?? '' ) === 'true', 'file_types' => $x['file_types'] ?? '', 'file_sizes' => $x['file_sizes'] ?? '', 'multi' => $x['allow_multiple_upload'] ?? '', 'html' => mb_substr( (string) ( $x['field_html'] ?? '' ), 0, 300 ) );
				}
				$res[] = array( 'page' => $id, 'title' => get_the_title( $id ), 'url' => get_permalink( $id ), 'form' => $st['form_name'] ?? '', 'fields' => $f );
			} );
		}
		$res[] = array( 'php' => array( 'upload_max_filesize' => ini_get( 'upload_max_filesize' ), 'post_max_size' => ini_get( 'post_max_size' ), 'max_file_uploads' => ini_get( 'max_file_uploads' ), 'max_execution_time' => ini_get( 'max_execution_time' ), 'memory_limit' => ini_get( 'memory_limit' ) ) );
		return $res;
	} ) );
} );
