<?php
defined( 'ABSPATH' ) || exit;

/* ---------- editor screen ---------- */

add_filter( 'enter_title_here', function ( $text, $post ) {
	return DWDP_CPT === $post->post_type ? 'Project name (e.g. Mojo’s Flight School)' : $text;
}, 10, 2 );

add_action( 'add_meta_boxes_' . DWDP_CPT, function () {
	add_meta_box( 'dwdp_capture', 'Website & screenshots', 'dwdp_box_capture', DWDP_CPT, 'normal', 'high' );
	add_meta_box( 'dwdp_details', 'Project details', 'dwdp_box_details', DWDP_CPT, 'normal', 'default' );
} );

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	$screen = get_current_screen();
	if ( ! $screen || DWDP_CPT !== $screen->post_type || ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
		return;
	}
	wp_enqueue_media();
	wp_enqueue_script( 'jquery-ui-sortable' );
	wp_enqueue_style( 'dwdp-admin', DWDP_URL . 'assets/admin.css', array(), DWDP_VERSION );
	wp_enqueue_script( 'dwdp-admin', DWDP_URL . 'assets/admin.js', array( 'jquery', 'jquery-ui-sortable' ), DWDP_VERSION, true );
	$post_id = get_the_ID();
	$full    = absint( dwdp_get( $post_id, 'fullshot' ) );
	$mobile  = absint( dwdp_get( $post_id, 'mobileshot' ) );
	$fmeta   = $full ? wp_get_attachment_metadata( $full ) : array();
	wp_localize_script(
		'dwdp-admin',
		'DWDP',
		array(
			'ajax'     => admin_url( 'admin-ajax.php' ),
			'nonce'    => wp_create_nonce( 'dwdp_edit' ),
			'postId'   => $post_id,
			'fullshot' => $full ? array( 'id' => $full, 'url' => dwdp_original_url( $full ), 'width' => isset( $fmeta['width'] ) ? $fmeta['width'] : 0, 'height' => isset( $fmeta['height'] ) ? $fmeta['height'] : 0 ) : null,
			'mobile'   => $mobile ? array( 'id' => $mobile, 'url' => dwdp_original_url( $mobile ) ) : null,
			'cuts'     => json_decode( (string) dwdp_get( $post_id, 'cuts' ), true ),
			'captureW' => max( 800, min( 2560, absint( dwdp_setting( 'capture_width' ) ) ) ),
		)
	);
} );

function dwdp_thumb_item( $id ) {
	$src = wp_get_attachment_image_src( $id, 'medium' );
	if ( ! $src ) {
		return '';
	}
	return sprintf(
		'<li class="dwdp-thumb" data-id="%1$d"><img src="%2$s" alt=""><button type="button" class="dwdp-x" title="Remove from this project" aria-label="Remove">&times;</button></li>',
		$id,
		esc_url( $src[0] )
	);
}

function dwdp_single_slot( $key, $label, $help ) {
	$id  = absint( dwdp_get( get_the_ID(), $key ) );
	$src = $id ? wp_get_attachment_image_src( $id, 'medium' ) : false;
	?>
	<div class="dwdp-slot" data-key="<?php echo esc_attr( $key ); ?>">
		<input type="hidden" name="dwdp[<?php echo esc_attr( $key ); ?>]" value="<?php echo esc_attr( $id ? $id : '' ); ?>">
		<strong><?php echo esc_html( $label ); ?></strong>
		<p class="description"><?php echo esc_html( $help ); ?></p>
		<div class="dwdp-slot-img"><?php echo $src ? '<img src="' . esc_url( $src[0] ) . '" alt="">' : '<span>None yet</span>'; ?></div>
		<button type="button" class="button dwdp-slot-pick">Choose image</button>
		<button type="button" class="button-link dwdp-slot-clear"<?php echo $id ? '' : ' hidden'; ?>>Remove</button>
	</div>
	<?php
}

function dwdp_box_capture( $post ) {
	wp_nonce_field( 'dwdp_save', 'dwdp_nonce' );
	$url      = dwdp_get( $post->ID, 'url' );
	$sections = dwdp_ids( dwdp_get( $post->ID, 'sections' ) );
	?>
	<div class="dwdp-step">
		<label for="dwdp-url"><strong>Website address</strong></label>
		<div class="dwdp-row">
			<input type="url" id="dwdp-url" name="dwdp[url]" value="<?php echo esc_attr( $url ); ?>" placeholder="https://clientwebsite.com" class="regular-text">
			<button type="button" class="button button-primary button-hero" id="dwdp-capture">Capture screenshots</button>
		</div>
		<p class="dwdp-video-field" style="margin:14px 0 6px">
			<label for="dwdp-video"><strong>YouTube video walkthrough</strong></label><br>
			<input type="url" id="dwdp-video" name="dwdp[video]" value="<?php echo esc_attr( dwdp_get( $post->ID, 'video' ) ); ?>" placeholder="https://www.youtube.com/watch?v=..." class="regular-text">
			<span class="description">Paste the YouTube link (from Share or the address bar). It plays at the top of the project page. Leave empty for no video.</span>
		</p>
		<p class="dwdp-video-field" style="margin:10px 0 6px">
			<label for="dwdp-video-cover"><strong>Video cover image</strong> (optional)</label><br>
			<input type="url" id="dwdp-video-cover" name="dwdp[video_cover]" value="<?php echo esc_attr( dwdp_get( $post->ID, 'video_cover' ) ); ?>" placeholder="https://dreamwebdigital.com/wp-content/uploads/..." class="regular-text">
			<span class="description">Image shown on the video before it plays. Upload it in Media, copy its File URL and paste it here. Empty = the YouTube thumbnail.</span>
		</p>
		<p class="description">Paste the live site address and click <em>Capture screenshots</em>. The plugin takes a full-page desktop screenshot and a phone screenshot, then finds each section of the page. It takes about a minute.</p>
		<ol class="dwdp-progress" id="dwdp-progress" hidden></ol>
	</div>

	<div class="dwdp-editor" id="dwdp-editor" hidden>
		<div class="dwdp-editor-head">
			<div>
				<h3>Review the sections</h3>
				<p class="description">Each image below becomes a screenshot on the project page. Click <b>Skip</b> on any you don't want. To change where a section starts or ends, drag a blue line on the full page, click the page to add a cut, or click a line's &times; to remove it.</p>
			</div>
			<div class="dwdp-editor-actions">
				<button type="button" class="button" id="dwdp-reset">Reset cuts</button>
				<button type="button" class="button button-primary" id="dwdp-save-sections">Save selected images</button>
			</div>
		</div>
		<div class="dwdp-editor-body">
			<div class="dwdp-page-wrap"><div class="dwdp-page" id="dwdp-page"></div></div>
			<div class="dwdp-previews">
				<div class="dwdp-count" id="dwdp-count"></div>
				<ul id="dwdp-previews"></ul>
				<div class="dwdp-extras" id="dwdp-extras"></div>
			</div>
		</div>
	</div>

	<div class="dwdp-gallery-box">
		<h3>Images on the project page <span class="dwdp-badge" id="dwdp-gallery-count"><?php echo count( $sections ); ?></span></h3>
		<p class="description">Shown top to bottom on the case-study page. Drag to reorder, &times; to remove, or add your own.</p>
		<input type="hidden" name="dwdp[sections]" id="dwdp-sections" value="<?php echo esc_attr( implode( ',', $sections ) ); ?>">
		<ul class="dwdp-gallery" id="dwdp-gallery"><?php foreach ( $sections as $id ) { echo dwdp_thumb_item( $id ); } ?></ul>
		<button type="button" class="button" id="dwdp-add-images">Add images from library</button>
		<div class="dwdp-slots">
			<?php dwdp_single_slot( 'cover', 'Cover image', 'Used on the Portfolio page card and the homepage carousel.' ); ?>
			<?php dwdp_single_slot( 'mockup', 'Phone mockup', 'Shown under the screenshots on the project page.' ); ?>
		</div>
	</div>
	<?php
}

function dwdp_box_details( $post ) {
	$v = function ( $k ) use ( $post ) {
		return get_post_meta( $post->ID, '_dwdp_' . $k, true );
	};
	$on_home = '' === $v( 'on_home' ) ? '1' : $v( 'on_home' );
	// New projects start with the default "Working together" note; older ones keep what they have.
	$together = ( '' === $v( 'together' ) && 'auto-draft' === $post->post_status ) ? dwdp_setting( 'def_together' ) : $v( 'together' );
	?>
	<table class="form-table dwdp-details">
		<tr><th><label for="dwdp-industry">Industry label</label></th><td><input id="dwdp-industry" name="dwdp[industry]" class="regular-text" value="<?php echo esc_attr( $v( 'industry' ) ); ?>" placeholder="Flight school"><p class="description">Shown as “01 · Flight school”. The number comes from the project order.</p></td></tr>
		<tr><th><label for="dwdp-summary">Short description</label></th><td><textarea id="dwdp-summary" name="dwdp[summary]" rows="3" class="large-text" placeholder="Flight training school with course info and enrollment. Built to get new students booking intro flights."><?php echo esc_textarea( $v( 'summary' ) ); ?></textarea></td></tr>
		<tr><th><label for="dwdp-together">Working together</label></th><td><textarea id="dwdp-together" name="dwdp[together]" rows="4" class="large-text" placeholder="How the project went, in your words."><?php echo esc_textarea( $together ); ?></textarea></td></tr>
		<tr><th><label for="dwdp-review">Client review</label></th><td><textarea id="dwdp-review" name="dwdp[review]" rows="3" class="large-text" placeholder="Leave empty to hide the review box."><?php echo esc_textarea( $v( 'review' ) ); ?></textarea></td></tr>
		<tr><th><label for="dwdp-review_by">Review by</label></th><td><input id="dwdp-review_by" name="dwdp[review_by]" class="regular-text" value="<?php echo esc_attr( $v( 'review_by' ) ); ?>" placeholder="Defaults to the project name"></td></tr>
		<?php
		foreach ( array( 'platform' => 'Platform', 'scope' => 'Scope', 'responsive' => 'Responsive', 'aftercare' => 'Aftercare' ) as $k => $label ) {
			printf(
				'<tr><th><label for="dwdp-%1$s">%2$s</label></th><td><input id="dwdp-%1$s" name="dwdp[%1$s]" class="large-text" value="%3$s"></td></tr>',
				esc_attr( $k ),
				esc_html( $label ),
				esc_attr( dwdp_get( $post->ID, $k ) )
			);
		}
		?>
		<tr><th>Homepage</th><td><label><input type="hidden" name="dwdp[on_home]" value="0"><input type="checkbox" name="dwdp[on_home]" value="1" <?php checked( '1', (string) $on_home ); ?>> Show in the homepage carousel</label></td></tr>
		<tr><th>Pin</th><td><label><input type="hidden" name="dwdp[pinned]" value="0"><input type="checkbox" name="dwdp[pinned]" value="1" <?php checked( '1', (string) $v( 'pinned' ) ); ?>> Always show first in the portfolio and homepage carousel</label></td></tr>
	</table>
	<p class="description">Working together, Platform, Scope, Responsive and Aftercare start with your defaults (change them under Projects → Settings). Industry and Short description are filled in from the client's site when you capture screenshots; the client review is always yours to add.</p>
	<p class="description">Set the position in the portfolio with <strong>Order</strong> in the Project Attributes box (lowest first). New projects go to the top, under any pinned project.</p>
	<?php
}

add_action( 'save_post_' . DWDP_CPT, function ( $post_id ) {
	if ( ! isset( $_POST['dwdp_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['dwdp_nonce'] ), 'dwdp_save' ) ) {
		return;
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE || ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	$in = isset( $_POST['dwdp'] ) ? wp_unslash( (array) $_POST['dwdp'] ) : array(); // phpcs:ignore
	foreach ( array( 'industry', 'review_by', 'platform', 'scope', 'responsive', 'aftercare' ) as $k ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, sanitize_text_field( $in[ $k ] ) );
		}
	}
	foreach ( array( 'summary', 'together', 'review' ) as $k ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, sanitize_textarea_field( $in[ $k ] ) );
		}
	}
	if ( isset( $in['url'] ) ) {
		update_post_meta( $post_id, '_dwdp_url', esc_url_raw( $in['url'] ) );
	}
	foreach ( array( 'video', 'video_cover' ) as $k ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, esc_url_raw( $in[ $k ] ) );
		}
	}
	foreach ( array( 'on_home', 'pinned' ) as $k ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, '1' === (string) $in[ $k ] ? '1' : '0' );
		}
	}
	if ( isset( $in['sections'] ) ) {
		update_post_meta( $post_id, '_dwdp_sections', implode( ',', dwdp_ids( $in['sections'] ) ) );
	}
	foreach ( array( 'cover', 'mockup' ) as $k ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, absint( $in[ $k ] ) ? absint( $in[ $k ] ) : '' );
		}
	}
} );

/** New projects go to the top of the portfolio; everything else keeps its order. */
add_filter( 'wp_insert_post_data', function ( $data, $postarr ) {
	if ( DWDP_CPT === $data['post_type'] && empty( $postarr['ID'] ) && empty( $data['menu_order'] ) ) {
		global $wpdb;
		// Pinned projects don't count: new ones go right under them, above everything else.
		$min                = $wpdb->get_var( $wpdb->prepare( "SELECT MIN(p.menu_order) FROM {$wpdb->posts} p LEFT JOIN {$wpdb->postmeta} m ON m.post_id = p.ID AND m.meta_key = '_dwdp_pinned' WHERE p.post_type = %s AND p.post_status NOT IN ('trash','auto-draft') AND ( m.meta_value IS NULL OR m.meta_value <> '1' )", DWDP_CPT ) );
		$data['menu_order'] = null === $min ? 1 : (int) $min - 1;
	}
	return $data;
}, 10, 2 );

/** Save the text details of a project from the editor or a script (same rules as the Update button). */
add_action( 'wp_ajax_dwdp_set_fields', function () {
	$post_id = dwdp_check_request();
	$in      = isset( $_POST['fields'] ) ? (array) json_decode( wp_unslash( $_POST['fields'] ), true ) : array(); // phpcs:ignore
	foreach ( array( 'industry', 'review_by', 'platform', 'scope', 'responsive', 'aftercare' ) as $k ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, sanitize_text_field( $in[ $k ] ) );
		}
	}
	foreach ( array( 'summary', 'together', 'review' ) as $k ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, sanitize_textarea_field( $in[ $k ] ) );
		}
	}
	if ( isset( $in['url'] ) ) {
		update_post_meta( $post_id, '_dwdp_url', esc_url_raw( $in['url'] ) );
	}
	foreach ( array( 'video', 'video_cover' ) as $k ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, esc_url_raw( $in[ $k ] ) );
		}
	}
	foreach ( array( 'on_home', 'pinned' ) as $k ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, '1' === (string) $in[ $k ] ? '1' : '0' );
		}
	}
	foreach ( array( 'seo_title' => '_yoast_wpseo_title', 'seo_desc' => '_yoast_wpseo_metadesc', 'seo_kw' => '_yoast_wpseo_focuskw' ) as $k => $meta ) {
		if ( isset( $in[ $k ] ) ) {
			update_post_meta( $post_id, $meta, sanitize_text_field( $in[ $k ] ) );
		}
	}
	wp_send_json_success();
} );

/** Keep the image list saved even before the user clicks Update. */
add_action( 'wp_ajax_dwdp_set_media', function () {
	$post_id = dwdp_check_request();
	if ( isset( $_POST['sections'] ) ) {
		update_post_meta( $post_id, '_dwdp_sections', implode( ',', dwdp_ids( wp_unslash( $_POST['sections'] ) ) ) ); // phpcs:ignore
	}
	foreach ( array( 'cover', 'mockup' ) as $k ) {
		if ( isset( $_POST[ $k ] ) ) {
			update_post_meta( $post_id, '_dwdp_' . $k, absint( $_POST[ $k ] ) ? absint( $_POST[ $k ] ) : '' );
		}
	}
	if ( isset( $_POST['cuts'] ) ) {
		$cuts = array_map( 'absint', (array) json_decode( wp_unslash( $_POST['cuts'] ), true ) ); // phpcs:ignore
		update_post_meta( $post_id, '_dwdp_cuts', wp_json_encode( array_values( $cuts ) ) );
	}
	wp_send_json_success();
} );

/* ---------- list table ---------- */

add_filter( 'manage_' . DWDP_CPT . '_posts_columns', function ( $cols ) {
	$new = array();
	foreach ( $cols as $k => $label ) {
		if ( 'title' === $k ) {
			$new['dwdp_cover'] = '';
		}
		$new[ $k ] = $label;
		if ( 'title' === $k ) {
			$new['dwdp_order']    = 'Order';
			$new['dwdp_industry'] = 'Industry';
			$new['dwdp_images']   = 'Images';
			$new['dwdp_home']     = 'Homepage';
		}
	}
	unset( $new['date'] );
	return $new;
} );

add_action( 'manage_' . DWDP_CPT . '_posts_custom_column', function ( $col, $post_id ) {
	switch ( $col ) {
		case 'dwdp_cover':
			$c = absint( dwdp_get( $post_id, 'cover' ) );
			echo $c ? wp_get_attachment_image( $c, array( 120, 68 ), false, array( 'style' => 'width:120px;height:68px;object-fit:cover;object-position:top;border-radius:4px' ) ) : '';
			break;
		case 'dwdp_order':
			echo esc_html( dwdp_number( $post_id ) );
			break;
		case 'dwdp_industry':
			echo esc_html( dwdp_get( $post_id, 'industry' ) ) . ( '1' === (string) dwdp_get( $post_id, 'pinned' ) ? ' <strong>· Pinned first</strong>' : '' );
			break;
		case 'dwdp_images':
			echo count( dwdp_ids( dwdp_get( $post_id, 'sections' ) ) );
			break;
		case 'dwdp_home':
			echo '1' === (string) dwdp_get( $post_id, 'on_home' ) ? '✓' : '—';
			break;
	}
}, 10, 2 );

add_action( 'pre_get_posts', function ( $q ) {
	if ( is_admin() && $q->is_main_query() && DWDP_CPT === $q->get( 'post_type' ) && ! $q->get( 'orderby' ) ) {
		$q->set( 'orderby', array( 'menu_order' => 'ASC', 'date' => 'ASC' ) );
	}
} );

/** In the admin list, pinned projects come first too, matching the site. */
add_filter( 'the_posts', function ( $posts, $q ) {
	if ( ! is_admin() || ! $q->is_main_query() || DWDP_CPT !== $q->get( 'post_type' ) || ! in_array( $q->get( 'orderby' ), array( '', array( 'menu_order' => 'ASC', 'date' => 'ASC' ) ), true ) ) {
		return $posts;
	}
	$pinned = array_filter( $posts, function ( $p ) { return '1' === (string) dwdp_get( $p->ID, 'pinned' ); } );
	return array_merge( array_values( $pinned ), array_values( array_diff_key( $posts, $pinned ) ) );
}, 10, 2 );

/* ---------- settings ---------- */

add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=' . DWDP_CPT, 'Projects settings', 'Settings', 'manage_options', 'dwdp-settings', 'dwdp_settings_page' );
} );

add_action( 'admin_init', function () {
	register_setting(
		'dwdp_settings',
		'dwdp_settings',
		array(
			'sanitize_callback' => function ( $in ) {
				$out = array();
				foreach ( (array) $in as $k => $val ) {
					$out[ sanitize_key( $k ) ] = ( in_array( $k, array( 'cta_text', 'def_together' ), true ) || 0 === strpos( $k, 'biz_' ) ) ? sanitize_textarea_field( $val ) : sanitize_text_field( $val );
				}
				$out['capture_width'] = max( 800, min( 2560, absint( isset( $out['capture_width'] ) ? $out['capture_width'] : 1440 ) ) );
				if ( isset( $out['base_slug'] ) && sanitize_title( $out['base_slug'] ) !== dwdp_base_slug() ) {
					update_option( 'dwdp_flush', 1 );
				}
				return $out;
			},
		)
	);
	if ( get_option( 'dwdp_flush' ) ) {
		delete_option( 'dwdp_flush' );
		flush_rewrite_rules();
	}
} );

function dwdp_settings_page() {
	$s      = dwdp_settings();
	$fields = array(
		'Screenshots'          => array(
			'microlink_key' => array( 'Microlink API key (optional)', 'Free use allows about 16 project captures per day. Add a key from microlink.io for more.' ),
			'capture_width' => array( 'Desktop capture width (px)', 'Default 1440.' ),
		),
		'Pages'                => array(
			'base_slug'     => array( 'Project page address', 'Projects live at /<this>/project-name/.' ),
			'portfolio_url' => array( '“Back to portfolio” link', '' ),
		),
		'Default project notes' => array(
			'def_together'   => array( 'Working together', 'Filled in on every new project. Edit per project as needed.' ),
			'def_platform'   => array( 'Platform', '' ),
			'def_scope'      => array( 'Scope', '' ),
			'def_responsive' => array( 'Responsive', '' ),
			'def_aftercare'  => array( 'Aftercare', '' ),
		),
		'Business profile (AI search)' => array(
			'biz_summary'    => array( 'Business summary', 'How AI assistants and search engines describe you. Used in structured data and llms.txt — not shown on pages.' ),
			'biz_city'       => array( 'City', '' ),
			'biz_areas'      => array( 'Local service areas', 'One per line. Nationwide service is always included.' ),
			'biz_industries' => array( 'Industries', 'One per line.' ),
			'biz_services'   => array( 'Services', 'One per line.' ),
			'biz_promises'   => array( 'What every project includes', 'One per line.' ),
		),
		'Call to action band'  => array(
			'cta_title'  => array( 'Heading', '' ),
			'cta_text'   => array( 'Text', '' ),
			'cta_button' => array( 'Button text', '' ),
			'cta_url'    => array( 'Button link', '' ),
			'cta_phone'  => array( 'Phone number', 'Leave empty to hide.' ),
		),
	);
	?>
	<div class="wrap">
		<h1>Projects settings</h1>
		<form method="post" action="options.php">
			<?php settings_fields( 'dwdp_settings' ); ?>
			<?php foreach ( $fields as $group => $items ) : ?>
				<h2><?php echo esc_html( $group ); ?></h2>
				<table class="form-table">
					<?php foreach ( $items as $k => $f ) : ?>
						<tr>
							<th><label for="dwdp-s-<?php echo esc_attr( $k ); ?>"><?php echo esc_html( $f[0] ); ?></label></th>
							<td>
								<?php if ( 'cta_text' === $k || 'def_together' === $k || ( 0 === strpos( $k, 'biz_' ) && 'biz_city' !== $k ) ) : ?>
									<textarea id="dwdp-s-<?php echo esc_attr( $k ); ?>" name="dwdp_settings[<?php echo esc_attr( $k ); ?>]" rows="<?php echo in_array( $k, array( 'cta_text', 'def_together' ), true ) ? 3 : 5; ?>" class="large-text"><?php echo esc_textarea( $s[ $k ] ); ?></textarea>
								<?php else : ?>
									<input id="dwdp-s-<?php echo esc_attr( $k ); ?>" name="dwdp_settings[<?php echo esc_attr( $k ); ?>]" value="<?php echo esc_attr( $s[ $k ] ); ?>" class="regular-text" <?php echo 'microlink_key' === $k ? 'type="password" autocomplete="off"' : ''; ?>>
								<?php endif; ?>
								<?php if ( $f[1] ) : ?><p class="description"><?php echo esc_html( $f[1] ); ?></p><?php endif; ?>
							</td>
						</tr>
					<?php endforeach; ?>
				</table>
			<?php endforeach; ?>
			<h2>Where projects appear</h2>
			<p>Add these shortcodes with Elementor's <em>Shortcode</em> widget:</p>
			<ul>
				<li><code>[dwd_portfolio]</code> — the project grid (Portfolio page)</li>
				<li><code>[dwd_project_slider]</code> — the homepage browser carousel</li>
				<li><code>[dwd_projects_cta]</code> — the “Yours could be next” band</li>
			</ul>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}
