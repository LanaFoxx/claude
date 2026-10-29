<?php
/**
 * "Upwork portfolio" box on the project editor: ready-to-paste text that fits Upwork's limits
 * (title 70, role 100, description 600 characters, 5 skills) and the images to upload: a
 * laptop + phone thumbnail and the full homepage split into two halves. The images are built
 * in the browser (assets/upwork.js) from the project's own screenshots.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'add_meta_boxes_' . DWDP_CPT, function () {
	add_meta_box( 'dwdp_upwork', 'Upwork portfolio export', 'dwdp_box_upwork', DWDP_CPT, 'normal', 'low' );
} );

/** Trim to a character limit on a word (or sentence) boundary. */
function dwdp_fit( $text, $max ) {
	$text = trim( preg_replace( '/\s+/u', ' ', (string) $text ) );
	if ( mb_strlen( $text ) <= $max ) {
		return $text;
	}
	$cut  = mb_substr( $text, 0, $max );
	$stop = max( mb_strrpos( $cut, '. ' ), mb_strrpos( $cut, '! ' ), mb_strrpos( $cut, '? ' ) );
	if ( $stop && $stop > $max * 0.6 ) {
		return mb_substr( $cut, 0, $stop + 1 );
	}
	return rtrim( mb_substr( $cut, 0, mb_strrpos( $cut, ' ' ) ), ' ,;:-' ) . '…';
}

/** Upwork text for a project. */
function dwdp_upwork_text( $post_id ) {
	$name     = get_the_title( $post_id );
	$industry = dwdp_get( $post_id, 'industry' );
	$summary  = dwdp_get( $post_id, 'summary' );
	$together = dwdp_get( $post_id, 'together' );
	$platform = dwdp_get( $post_id, 'platform' );

	$title = $name . ( $industry ? ' | ' . $industry . ' Website Design' : ' | Custom Website Design' );
	if ( mb_strlen( $title ) > 70 ) {
		$title = $name . ' | Custom Website';
	}

	$desc = trim( $summary . ' ' . $together );
	$desc .= ' Custom design, fully responsive on desktop, tablet and mobile, with security setup and 1-on-1 training.';

	$skills = array( 'Web Design', 'WordPress' );
	foreach ( array( 'WooCommerce', 'Moodle', 'Elementor' ) as $s ) {
		if ( false !== stripos( $platform . ' ' . $summary, $s ) ) {
			$skills[] = $s;
		}
	}
	foreach ( array( 'Responsive Design', 'Landing Page', 'Website Redesign' ) as $s ) {
		$skills[] = $s;
	}

	return array(
		'title'  => dwdp_fit( $title, 70 ),
		'role'   => 'Web Designer & WordPress Developer (design, development, hosting and training)',
		'desc'   => dwdp_fit( $desc, 600 ),
		'skills' => array_slice( array_values( array_unique( $skills ) ), 0, 5 ),
		'url'    => dwdp_get( $post_id, 'url' ),
	);
}

function dwdp_box_upwork( $post ) {
	$t = dwdp_upwork_text( $post->ID );
	$field = function ( $label, $value, $max, $rows = 1 ) {
		$id = 'dwdp-up-' . sanitize_title( $label );
		?>
		<div class="dwdp-up-field">
			<div class="dwdp-up-label"><strong><?php echo esc_html( $label ); ?></strong>
				<span class="dwdp-up-count" data-max="<?php echo (int) $max; ?>"></span>
				<button type="button" class="button button-small dwdp-up-copy" data-target="<?php echo esc_attr( $id ); ?>">Copy</button>
			</div>
			<?php if ( $rows > 1 ) : ?>
				<textarea id="<?php echo esc_attr( $id ); ?>" rows="<?php echo (int) $rows; ?>" class="large-text dwdp-up-text" maxlength="<?php echo (int) $max; ?>"><?php echo esc_textarea( $value ); ?></textarea>
			<?php else : ?>
				<input id="<?php echo esc_attr( $id ); ?>" class="large-text dwdp-up-text" maxlength="<?php echo (int) $max; ?>" value="<?php echo esc_attr( $value ); ?>">
			<?php endif; ?>
		</div>
		<?php
	};
	?>
	<p class="description">Everything Upwork's “Add a new portfolio project” form asks for. Edit the text here if you like (it isn't saved), copy each field across, then download the images and drag them into Upwork's “Add content” area: the thumbnail first, then the two homepage halves.</p>
	<?php
	$field( 'Project title', $t['title'], 70 );
	$field( 'Your role', $t['role'], 100 );
	$field( 'Project description', $t['desc'], 600, 6 );
	$field( 'Skills and deliverables', implode( ', ', $t['skills'] ), 200 );
	?>
	<p class="description">Skills: add them one at a time in Upwork (5 max). <?php echo $t['url'] ? 'Live site to add as a link: ' . esc_html( $t['url'] ) : ''; ?></p>
	<div class="dwdp-up-images">
		<button type="button" class="button button-primary" id="dwdp-up-build">Build Upwork images</button>
		<span class="dwdp-up-status" id="dwdp-up-status"></span>
		<ul class="dwdp-up-list" id="dwdp-up-list"></ul>
	</div>
	<?php
}

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	$screen = get_current_screen();
	if ( ! $screen || DWDP_CPT !== $screen->post_type || ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
		return;
	}
	$id    = get_the_ID();
	$url   = function ( $att ) {
		$att = absint( $att );
		return $att ? dwdp_original_url( $att ) : '';
	};
	wp_enqueue_script( 'dwdp-upwork', DWDP_URL . 'assets/upwork.js', array( 'jquery' ), DWDP_VERSION, true );
	wp_add_inline_script( 'dwdp-upwork', 'window.DWDP_UP_FRAME=' . wp_json_encode( DWDP_URL . 'assets/upwork-thumb.png' ) . ';', 'before' );
	wp_localize_script(
		'dwdp-upwork',
		'DWDPUP',
		array(
			'slug'     => sanitize_title( get_the_title( $id ) ),
			'cover'    => $url( dwdp_get( $id, 'cover' ) ),
			'mockup'   => $url( dwdp_get( $id, 'mockup' ) ),
			'fullshot' => $url( dwdp_get( $id, 'fullshot' ) ),
			'sections' => array_values( array_filter( array_map( $url, dwdp_ids( dwdp_get( $id, 'sections' ) ) ) ) ),
		)
	);
	wp_add_inline_style(
		'dwdp-admin',
		'.dwdp-up-field{margin:14px 0}.dwdp-up-label{display:flex;align-items:center;gap:10px;margin-bottom:5px}.dwdp-up-count{color:#646970;font-size:12px;margin-left:auto}.dwdp-up-count.is-over{color:#d63638;font-weight:600}'
		. '.dwdp-up-images{margin-top:18px;padding-top:16px;border-top:1px solid #dcdcde}.dwdp-up-status{margin-left:10px;color:#646970}'
		. '.dwdp-up-list{display:flex;flex-wrap:wrap;gap:16px;margin:16px 0 0}.dwdp-up-list li{width:220px;margin:0}.dwdp-up-list img{display:block;width:100%;height:150px;object-fit:cover;object-position:top;border:1px solid #dcdcde;border-radius:4px;background:#fff}.dwdp-up-list a{display:block;margin-top:6px}'
	);
} );
