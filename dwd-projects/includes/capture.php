<?php
/**
 * Screenshot capture (via the Microlink API) and image uploads for the project editor.
 * Each capture step is its own AJAX request so no single request runs too long.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'wp_ajax_dwdp_capture', 'dwdp_ajax_capture' );
add_action( 'wp_ajax_dwdp_upload', 'dwdp_ajax_upload' );

function dwdp_check_request() {
	check_ajax_referer( 'dwdp_edit', 'nonce' );
	$post_id = absint( isset( $_POST['post_id'] ) ? $_POST['post_id'] : 0 );
	if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
		wp_send_json_error( array( 'message' => 'You do not have permission to edit this project.' ), 403 );
	}
	// Keep screenshots at full resolution (WordPress otherwise shrinks images over 2560px).
	add_filter( 'big_image_size_threshold', '__return_false' );
	return $post_id;
}

/** CSS injected before capture so scroll animations and lazy effects don't leave blank areas. */
function dwdp_capture_css() {
	return '.elementor-invisible{visibility:visible!important}*{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}';
}

/** Call Microlink and return the decoded `data` object, or WP_Error. */
function dwdp_microlink( $params ) {
	$key  = trim( dwdp_setting( 'microlink_key' ) );
	$base = $key ? 'https://pro.microlink.io/' : 'https://api.microlink.io/';
	$args = array( 'timeout' => 120 );
	if ( $key ) {
		$args['headers'] = array( 'x-api-key' => $key );
	}
	$res = wp_remote_get( $base . '?' . http_build_query( $params, '', '&', PHP_QUERY_RFC3986 ), $args );
	if ( is_wp_error( $res ) ) {
		return new WP_Error( 'dwdp_http', 'Could not reach the screenshot service: ' . $res->get_error_message() );
	}
	$body = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( ! is_array( $body ) ) {
		return new WP_Error( 'dwdp_http', 'The screenshot service returned an unexpected response (HTTP ' . wp_remote_retrieve_response_code( $res ) . ').' );
	}
	if ( isset( $body['status'] ) && 'success' !== $body['status'] ) {
		$msg = isset( $body['message'] ) ? $body['message'] : ( isset( $body['data']['url'] ) ? $body['data']['url'] : 'unknown error' );
		if ( isset( $body['code'] ) && 'ERATE' === $body['code'] ) {
			$msg = 'The free screenshot allowance for today has been used up. Try again tomorrow, or add a Microlink API key under Projects → Settings.';
		}
		return new WP_Error( 'dwdp_service', 'Screenshot service: ' . $msg );
	}
	return isset( $body['data'] ) ? $body['data'] : array();
}

/** Download a remote image into the media library, attached to the project. */
function dwdp_sideload( $url, $post_id, $filename, $title ) {
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$tmp = download_url( $url, 120 );
	if ( is_wp_error( $tmp ) ) {
		return new WP_Error( 'dwdp_download', 'Could not download the screenshot: ' . $tmp->get_error_message() );
	}
	$id = media_handle_sideload( array( 'name' => $filename, 'tmp_name' => $tmp ), $post_id, $title );
	if ( is_wp_error( $id ) ) {
		@unlink( $tmp ); // phpcs:ignore
	}
	return $id;
}

function dwdp_ajax_capture() {
	$post_id = dwdp_check_request();
	$url     = esc_url_raw( wp_unslash( isset( $_POST['url'] ) ? $_POST['url'] : '' ) );
	$step    = sanitize_key( isset( $_POST['step'] ) ? $_POST['step'] : '' );
	if ( ! $url || ! wp_http_validate_url( $url ) ) {
		wp_send_json_error( array( 'message' => 'Please enter a full website address, like https://example.com' ) );
	}
	if ( function_exists( 'set_time_limit' ) ) {
		@set_time_limit( 180 ); // phpcs:ignore
	}
	$name  = get_the_title( $post_id );
	$name  = $name ? $name : wp_parse_url( $url, PHP_URL_HOST );
	$slug  = sanitize_title( $name );
	$width = max( 800, min( 2560, absint( dwdp_setting( 'capture_width' ) ) ) );

	if ( 'sections' === $step ) {
		$data = dwdp_microlink(
			array(
				'url'      => $url,
				'meta'     => 'false',
				'function' => trim( file_get_contents( DWDP_DIR . 'assets/measure-sections.js' ) ), // phpcs:ignore
			)
		);
		if ( is_wp_error( $data ) ) {
			wp_send_json_error( array( 'message' => $data->get_error_message() ) );
		}
		$fn = isset( $data['function'] ) ? $data['function'] : array();
		if ( empty( $fn['isFulfilled'] ) || empty( $fn['value']['s'] ) ) {
			wp_send_json_error( array( 'message' => 'Could not read the page sections. Using image detection instead.' ) );
		}
		wp_send_json_success( $fn['value'] );
	}

	$mobile = 'mobile' === $step;
	// "hero" = the first screen again at double resolution, so covers stay sharp on retina screens
	// and in the large homepage laptop. It isn't stored on the project; the editor crops it.
	$hero   = 'hero' === $step;
	$params = array(
		'url'                         => $url,
		'meta'                        => 'false',
		'screenshot'                  => 'true',
		'type'                        => 'jpeg',
		'waitForTimeout'              => 4500,
		'styles'                      => dwdp_capture_css(),
		// Loaded by URL: inline JavaScript in the query is blocked by the service's firewall.
		'scripts'                     => DWDP_URL . 'assets/capture-prep.js?ver=' . DWDP_VERSION,
		'viewport.width'              => $mobile ? 390 : $width,
		'viewport.height'             => $mobile ? 680 : 900, // 680 = what Safari shows on an iPhone between its status bar and address bar
		'viewport.deviceScaleFactor'  => $mobile || $hero ? 2 : 1,
	);
	if ( $hero ) {
		$params['type'] = 'png';
	}
	if ( $mobile ) {
		$params['viewport.isMobile'] = 'true';
		$params['viewport.hasTouch'] = 'true';
	} else {
		$params['fullPage'] = 'true';
	}
	$data = dwdp_microlink( $params );
	if ( is_wp_error( $data ) ) {
		wp_send_json_error( array( 'message' => $data->get_error_message() ) );
	}
	if ( empty( $data['screenshot']['url'] ) ) {
		wp_send_json_error( array( 'message' => 'The screenshot service did not return an image.' ) );
	}
	$id = dwdp_sideload(
		$data['screenshot']['url'],
		$post_id,
		$slug . ( $hero ? '-hero-2x.png' : ( $mobile ? '-mobile-capture.jpg' : '-full-page.jpg' ) ),
		$name . ( $hero ? ' hero capture' : ( $mobile ? ' mobile capture' : ' full page capture' ) )
	);
	if ( is_wp_error( $id ) ) {
		wp_send_json_error( array( 'message' => $id->get_error_message() ) );
	}
	if ( ! $hero ) {
		update_post_meta( $post_id, $mobile ? '_dwdp_mobileshot' : '_dwdp_fullshot', $id );
	}
	if ( ! $mobile && ! $hero ) {
		update_post_meta( $post_id, '_dwdp_url', $url );
	}
	$meta = wp_get_attachment_metadata( $id );
	wp_send_json_success(
		array(
			'id'     => $id,
			'url'    => dwdp_original_url( $id ),
			'width'  => isset( $meta['width'] ) ? $meta['width'] : 0,
			'height' => isset( $meta['height'] ) ? $meta['height'] : 0,
		)
	);
}

/** Receives one generated image (section, cover or mockup) from the browser. */
function dwdp_ajax_upload() {
	$post_id = dwdp_check_request();
	if ( empty( $_FILES['file'] ) ) {
		wp_send_json_error( array( 'message' => 'No image received.' ) );
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$title = sanitize_text_field( wp_unslash( isset( $_POST['title'] ) ? $_POST['title'] : '' ) );
	$alt   = sanitize_text_field( wp_unslash( isset( $_POST['alt'] ) ? $_POST['alt'] : '' ) );
	$id    = media_handle_upload( 'file', $post_id, $title ? array( 'post_title' => $title ) : array() );
	if ( is_wp_error( $id ) ) {
		wp_send_json_error( array( 'message' => $id->get_error_message() ) );
	}
	if ( $alt ) {
		update_post_meta( $id, '_wp_attachment_image_alt', $alt );
	}
	$thumb = wp_get_attachment_image_src( $id, 'medium' );
	wp_send_json_success(
		array(
			'id'    => $id,
			'url'   => wp_get_attachment_url( $id ),
			'thumb' => $thumb ? $thumb[0] : wp_get_attachment_url( $id ),
		)
	);
}
