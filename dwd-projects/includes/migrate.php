<?php
/**
 * One-time content updates, applied once in the admin and then remembered.
 * 2026-10 copy update: project taglines, "Working together" text, SEO titles and
 * descriptions, Finesse by Witney spelling and address, and the Charlotte, NC business profile.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'admin_init', 'dwdp_migrate_copy_2026_10' );

function dwdp_migrate_copy_2026_10() {
	if ( get_option( 'dwdp_copy_2026_10' ) || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$file = DWDP_DIR . 'data/copy-2026-10.json';
	$data = is_readable( $file ) ? json_decode( file_get_contents( $file ), true ) : null; // phpcs:ignore
	if ( ! is_array( $data ) ) {
		return;
	}
	$log = array();

	foreach ( $data['projects'] as $slug => $p ) {
		$found = get_posts( array( 'post_type' => DWDP_CPT, 'name' => $slug, 'post_status' => 'any', 'posts_per_page' => 1 ) );
		if ( ! $found ) {
			$log[] = 'missing ' . $slug;
			continue;
		}
		$id = $found[0]->ID;
		foreach ( array( 'industry', 'summary', 'together' ) as $k ) {
			if ( isset( $p[ $k ] ) ) {
				update_post_meta( $id, '_dwdp_' . $k, $p[ $k ] );
			}
		}
		if ( ! empty( $p['remove_review'] ) ) {
			update_post_meta( $id, '_dwdp_review', '' );
			update_post_meta( $id, '_dwdp_review_by', '' );
		}
		if ( isset( $p['review_by'] ) ) {
			update_post_meta( $id, '_dwdp_review_by', $p['review_by'] );
		}
		update_post_meta( $id, '_yoast_wpseo_title', $p['seo_title'] );
		update_post_meta( $id, '_yoast_wpseo_metadesc', $p['seo_desc'] );
		if ( ! empty( $p['seo_kw'] ) ) {
			update_post_meta( $id, '_yoast_wpseo_focuskw', $p['seo_kw'] );
		}
		// New title or address: WordPress keeps the old address and redirects it (301) to the new one.
		$update = array( 'ID' => $id );
		if ( ! empty( $p['title'] ) ) {
			$update['post_title'] = $p['title'];
		}
		if ( ! empty( $p['new_slug'] ) ) {
			$update['post_name'] = $p['new_slug'];
		}
		if ( count( $update ) > 1 ) {
			wp_update_post( $update );
		}
		if ( ! empty( $p['fix_spelling'] ) ) {
			list( $from, $to ) = $p['fix_spelling'];
			$media = get_posts( array( 'post_type' => 'attachment', 'post_parent' => $id, 'post_status' => 'any', 'posts_per_page' => -1 ) );
			foreach ( $media as $m ) {
				$alt = (string) get_post_meta( $m->ID, '_wp_attachment_image_alt', true );
				if ( false !== strpos( $alt, $from ) ) {
					update_post_meta( $m->ID, '_wp_attachment_image_alt', str_replace( $from, $to, $alt ) );
				}
				if ( false !== strpos( $m->post_title, $from ) ) {
					wp_update_post( array( 'ID' => $m->ID, 'post_title' => str_replace( $from, $to, $m->post_title ) ) );
				}
			}
		}
		$log[] = 'updated ' . $slug;
	}

	// Business profile now lives in Charlotte, NC: replace saved Florida values with the new defaults.
	$saved = get_option( 'dwdp_settings', array() );
	if ( is_array( $saved ) ) {
		foreach ( array( 'biz_summary', 'biz_city', 'biz_areas' ) as $k ) {
			if ( isset( $saved[ $k ] ) && preg_match( '/Stuart|Florida|FL\b/', $saved[ $k ] ) ) {
				unset( $saved[ $k ] );
				$log[] = 'reset ' . $k;
			}
		}
		update_option( 'dwdp_settings', $saved );
	}

	update_option( 'dwdp_copy_2026_10', array( 'time' => time(), 'log' => $log ), false );
}

/* 2026-10 tone pass: saved settings still holding the old call-to-action wording get the new defaults. */
add_action( 'admin_init', function () {
	if ( get_option( 'dwdp_copy_2026_10_tone' ) || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$old   = array(
		'cta_title'    => 'Yours could be next.',
		'cta_text'     => 'Every one of these started with a quick Zoom call. Tell me what you have in mind.',
		'def_together' => 'Client was a pleasure to work with. Had all the assets needed to get the job done and was quick to reply when I needed them.',
	);
	$saved = get_option( 'dwdp_settings', array() );
	if ( is_array( $saved ) ) {
		foreach ( $old as $k => $v ) {
			if ( isset( $saved[ $k ] ) && trim( $saved[ $k ] ) === $v ) {
				unset( $saved[ $k ] );
			}
		}
		update_option( 'dwdp_settings', $saved );
	}
	update_option( 'dwdp_copy_2026_10_tone', time(), false );
} );

/* Onboarding form: ask for 3–4 websites the client likes and what they like about each (style read). Runs once. */
add_action( 'admin_init', function () {
	if ( get_option( 'dwdp_mig_onb_inspiration' ) ) {
		return;
	}
	$id  = 2993;
	$raw = get_post_meta( $id, '_elementor_data', true );
	$d   = is_string( $raw ) ? json_decode( $raw, true ) : null;
	if ( ! is_array( $d ) ) {
		update_option( 'dwdp_mig_onb_inspiration', 'no-data', false );
		return;
	}
	$hit  = 0;
	$walk = function ( &$els ) use ( &$walk, &$hit ) {
		foreach ( $els as &$el ) {
			if ( ! empty( $el['settings']['form_fields'] ) && is_array( $el['settings']['form_fields'] ) ) {
				foreach ( $el['settings']['form_fields'] as &$f ) {
					if ( 'inspiration' === ( $f['custom_id'] ?? '' ) ) {
						$f['field_label'] = 'List 3–4 websites you like, and what you like about each one';
						$f['placeholder'] = 'Paste each link, then a line on what you like about it: the layout, colors, fonts, photos, or the overall feel. Any kind of business is fine; it is about the style.';
						$f['rows']        = 6;
						$hit++;
					}
				}
				unset( $f );
			}
			if ( ! empty( $el['elements'] ) ) {
				$walk( $el['elements'] );
			}
		}
		unset( $el );
	};
	$walk( $d );
	if ( $hit ) {
		update_post_meta( $id, '_elementor_data', wp_slash( wp_json_encode( $d ) ) );
		delete_post_meta( $id, '_elementor_css' );
		delete_post_meta( $id, '_elementor_element_cache' );
		if ( class_exists( '\Elementor\Plugin' ) ) {
			\Elementor\Plugin::$instance->files_manager->clear_cache();
		}
	}
	update_option( 'dwdp_mig_onb_inspiration', $hit ? 'done' : 'not-found', false );
} );
