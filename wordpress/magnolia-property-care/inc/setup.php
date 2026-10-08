<?php
/**
 * Appearance → Magnolia Setup: moves the old pages to the Trash, imports the
 * design's photos into the Media Library and creates the five design pages.
 *
 * @package Magnolia
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'admin_menu',
	function () {
		add_theme_page( 'Magnolia Setup', 'Magnolia Setup', 'manage_options', 'magnolia-setup', 'magnolia_setup_screen' );
	}
);

// Point the admin at the setup screen until it has been run once.
add_action(
	'admin_notices',
	function () {
		if ( get_option( 'magnolia_pages' ) || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$screen = get_current_screen();
		if ( $screen && 'appearance_page_magnolia-setup' === $screen->id ) {
			return;
		}
		printf(
			'<div class="notice notice-info"><p><strong>Magnolia Property Care theme is active.</strong> <a href="%s">Finish setup</a> to create the site pages.</p></div>',
			esc_url( admin_url( 'themes.php?page=magnolia-setup' ) )
		);
	}
);

add_action( 'admin_post_magnolia_setup', 'magnolia_run_setup' );

/**
 * Pages that are not ours and not already in the Trash.
 */
function magnolia_existing_pages() {
	$ours = array_map( 'intval', array_values( get_option( 'magnolia_pages', array() ) ) );
	return get_posts(
		array(
			'post_type'      => 'page',
			'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
			'posts_per_page' => -1,
			'exclude'        => $ours,
			'orderby'        => 'title',
			'order'          => 'ASC',
		)
	);
}

function magnolia_setup_screen() {
	$existing = magnolia_existing_pages();
	$done     = get_option( 'magnolia_pages' );
	$email    = get_option( 'magnolia_estimate_email', get_option( 'admin_email' ) );
	?>
	<div class="wrap">
		<h1>Magnolia Property Care — Setup</h1>
		<?php if ( isset( $_GET['magnolia'] ) && 'done' === $_GET['magnolia'] ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="notice notice-success"><p>Setup finished. <a href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank">View the site</a>.</p></div>
		<?php endif; ?>

		<p>This creates the pages from the Claude Design project — <strong>Home, About Us, Services, Past Projects and Contact</strong> — imports the logos and photos into the Media Library, and sets Home as the front page.</p>
		<?php if ( $done ) : ?>
			<p>Setup has already been run. Running it again resets the five Magnolia pages to the original design content (other changes you made to those pages will be overwritten).</p>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="magnolia_setup">
			<?php wp_nonce_field( 'magnolia_setup' ); ?>

			<h2>Existing pages (<?php echo count( $existing ); ?>)</h2>
			<?php if ( $existing ) : ?>
				<ul style="list-style:disc;margin-left:20px">
					<?php foreach ( $existing as $page ) : ?>
						<li><?php echo esc_html( $page->post_title ? $page->post_title : '(no title)' ); ?> <span style="color:#777">— <?php echo esc_html( $page->post_status ); ?></span></li>
					<?php endforeach; ?>
				</ul>
				<p><label><input type="checkbox" name="trash_existing" value="1" checked> Move all of these pages to the Trash</label><br>
				<span class="description">They stay in Pages → Trash and can be restored until the Trash is emptied.</span></p>
			<?php else : ?>
				<p>None.</p>
			<?php endif; ?>

			<h2>Options</h2>
			<p><label><input type="checkbox" name="site_title" value="1" checked> Set the site title to “Magnolia Property Care” and the tagline to “Care for Every Corner.”</label></p>
			<p><label>Send estimate requests to <input type="email" name="estimate_email" value="<?php echo esc_attr( $email ); ?>" class="regular-text"></label></p>

			<?php submit_button( $done ? 'Run setup again' : 'Set up Magnolia site' ); ?>
		</form>
	</div>
	<?php
}

/**
 * Imports a theme asset into the Media Library once; returns its attachment ID.
 */
function magnolia_import_asset( $name, &$media ) {
	if ( ! empty( $media[ $name ] ) && get_post( $media[ $name ] ) ) {
		return (int) $media[ $name ];
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$tmp = wp_tempnam( basename( $name ) );
	copy( get_template_directory() . '/assets/' . $name, $tmp );
	$id = media_handle_sideload(
		array(
			'name'     => basename( $name ),
			'tmp_name' => $tmp,
		),
		0
	);
	if ( is_wp_error( $id ) ) {
		@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		wp_die( esc_html( 'Could not import ' . $name . ': ' . $id->get_error_message() ) );
	}
	$media[ $name ] = $id;
	return $id;
}

function magnolia_run_setup() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Not allowed.' );
	}
	check_admin_referer( 'magnolia_setup' );
	set_time_limit( 300 );

	// 1. Old pages to the Trash.
	if ( ! empty( $_POST['trash_existing'] ) ) {
		foreach ( magnolia_existing_pages() as $page ) {
			wp_trash_post( $page->ID );
		}
	}

	// 2. Create (or find) the five pages so their URLs exist before content is written.
	$pages = get_option( 'magnolia_pages', array() );
	foreach ( magnolia_screens() as $screen => $info ) {
		$id = isset( $pages[ $screen ] ) ? (int) $pages[ $screen ] : 0;
		if ( $id && get_post( $id ) ) {
			if ( 'trash' === get_post_status( $id ) ) {
				wp_untrash_post( $id );
			}
		} else {
			$id = wp_insert_post(
				array(
					'post_type'   => 'page',
					'post_status' => 'draft',
					'post_title'  => $info['title'],
					'post_name'   => $info['slug'],
				),
				true
			);
			if ( is_wp_error( $id ) ) {
				wp_die( esc_html( $id->get_error_message() ) );
			}
		}
		$pages[ $screen ] = $id;
	}
	update_option( 'magnolia_pages', $pages );

	// Pretty permalinks, so links read /about-us/ rather than ?page_id=.
	if ( ! get_option( 'permalink_structure' ) ) {
		update_option( 'permalink_structure', '/%postname%/' );
		flush_rewrite_rules();
	}

	// 3. Fill in content, swapping image and link placeholders for real URLs.
	$media = get_option( 'magnolia_media', array() );
	foreach ( $pages as $screen => $id ) {
		$html = file_get_contents( get_template_directory() . '/content/' . $screen . '.html' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$html = preg_replace_callback(
			'/%%MPC_IMG:([a-z0-9\/._-]+)%%/',
			function ( $m ) use ( &$media ) {
				return esc_url( wp_get_attachment_url( magnolia_import_asset( $m[1], $media ) ) );
			},
			$html
		);
		$html = preg_replace_callback(
			'/%%MPC_URL:([a-z]+)%%/',
			function ( $m ) use ( $pages ) {
				return esc_url( 'home' === $m[1] ? home_url( '/' ) : get_permalink( $pages[ $m[1] ] ) );
			},
			$html
		);
		$info = magnolia_screens()[ $screen ];
		wp_update_post(
			wp_slash(
				array(
					'ID'           => $id,
					'post_title'   => $info['title'],
					'post_name'    => $info['slug'],
					'post_status'  => 'publish',
					'post_content' => "<!-- wp:html -->\n" . $html . "<!-- /wp:html -->",
				)
			)
		);
		update_post_meta( $id, '_magnolia_screen', $screen );
	}
	update_option( 'magnolia_media', $media );

	// 4. Front page and settings.
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', $pages['home'] );
	if ( ! empty( $_POST['site_title'] ) ) {
		update_option( 'blogname', 'Magnolia Property Care' );
		update_option( 'blogdescription', 'Care for Every Corner.' );
	}
	if ( isset( $_POST['estimate_email'] ) && is_email( wp_unslash( $_POST['estimate_email'] ) ) ) {
		update_option( 'magnolia_estimate_email', sanitize_email( wp_unslash( $_POST['estimate_email'] ) ) );
	}

	wp_safe_redirect( admin_url( 'themes.php?page=magnolia-setup&magnolia=done' ) );
	exit;
}
