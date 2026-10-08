<?php
/**
 * Plugin Name: Magnolia Property Care – Site Importer
 * Description: Builds the Magnolia Property Care site in Elementor Pro (Hello Elementor theme): pages, Theme Builder header and footer, estimate form, global colours and fonts, site name and favicon. Run it from Tools → Magnolia Importer, then deactivate and delete this plugin.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Dream Web Digital
 * Text Domain: magnolia-importer
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const MAGNOLIA_IMPORTER_SITE_NAME = 'Magnolia Property Care';
const MAGNOLIA_IMPORTER_TAGLINE   = 'Care for Every Corner.';

/**
 * Design screens and the pages they become, in menu order.
 */
function magnolia_importer_pages() {
	return array(
		'home'     => array( 'title' => 'Home', 'slug' => 'home', 'file' => 'page-home' ),
		'about'    => array( 'title' => 'About Us', 'slug' => 'about-us', 'file' => 'page-about' ),
		'services' => array( 'title' => 'Services', 'slug' => 'services', 'file' => 'page-services' ),
		'projects' => array( 'title' => 'Past Projects', 'slug' => 'past-projects', 'file' => 'page-projects' ),
		'contact'  => array( 'title' => 'Contact', 'slug' => 'contact', 'file' => 'page-contact' ),
	);
}

add_action(
	'admin_menu',
	function () {
		add_management_page( 'Magnolia Importer', 'Magnolia Importer', 'manage_options', 'magnolia-importer', 'magnolia_importer_screen' );
	}
);

add_action(
	'admin_notices',
	function () {
		if ( get_option( 'magnolia_importer_done' ) || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$screen = get_current_screen();
		if ( $screen && 'tools_page_magnolia-importer' === $screen->id ) {
			return;
		}
		printf(
			'<div class="notice notice-info"><p><strong>Magnolia Property Care:</strong> <a href="%s">run the site importer</a> to build the pages in Elementor.</p></div>',
			esc_url( admin_url( 'tools.php?page=magnolia-importer' ) )
		);
	}
);

add_action( 'admin_post_magnolia_importer', 'magnolia_importer_run' );

/**
 * Requirement checks: [ label, ok, help ].
 */
function magnolia_importer_requirements() {
	$theme = wp_get_theme();
	return array(
		array( 'Hello Elementor theme active', 'hello-elementor' === $theme->get_template(), 'Appearance → Themes → activate Hello Elementor.' ),
		array( 'Elementor active', defined( 'ELEMENTOR_VERSION' ), 'Plugins → activate Elementor.' ),
		array( 'Elementor Pro active', defined( 'ELEMENTOR_PRO_VERSION' ), 'Plugins → activate Elementor Pro (needed for the header, footer, menu and form).' ),
	);
}

/**
 * Pages that are not ours and not already in the Trash.
 */
function magnolia_importer_existing_pages() {
	$ours = array_map( 'intval', array_values( get_option( 'magnolia_importer_page_ids', array() ) ) );
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

function magnolia_importer_screen() {
	$requirements = magnolia_importer_requirements();
	$ready        = defined( 'ELEMENTOR_VERSION' ) && 'hello-elementor' === wp_get_theme()->get_template();
	$existing     = magnolia_importer_existing_pages();
	$done         = get_option( 'magnolia_importer_done' );
	?>
	<div class="wrap">
		<h1>Magnolia Property Care — Site Importer</h1>

		<?php if ( isset( $_GET['magnolia'] ) && 'done' === $_GET['magnolia'] ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="notice notice-success">
				<p><strong>Done.</strong> <a href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank">View the site</a> · <a href="<?php echo esc_url( admin_url( 'edit.php?post_type=page' ) ); ?>">Edit pages in Elementor</a></p>
				<?php foreach ( (array) get_transient( 'magnolia_importer_warnings' ) as $warning ) : ?>
					<p>⚠️ <?php echo esc_html( $warning ); ?></p>
				<?php endforeach; ?>
				<p>You can now deactivate and delete this plugin — everything it built lives in Elementor.</p>
			</div>
		<?php endif; ?>

		<h2>Requirements</h2>
		<ul>
			<?php foreach ( $requirements as $req ) : ?>
				<li><?php echo $req[1] ? '✅' : '❌'; ?> <?php echo esc_html( $req[0] ); ?><?php echo $req[1] ? '' : ' — ' . esc_html( $req[2] ); ?></li>
			<?php endforeach; ?>
		</ul>

		<p>This builds the site from the Claude Design project with native Elementor widgets:</p>
		<ul style="list-style:disc;margin-left:20px">
			<li>Pages: <strong>Home, About Us, Services, Past Projects, Contact</strong> (Home becomes the front page)</li>
			<li>Theme Builder <strong>header</strong> (sticky, with mobile/tablet menu) and <strong>footer</strong>, shown on the entire site</li>
			<li>“Request an Estimate” <strong>Elementor Pro form</strong> on the Contact page</li>
			<li>Global colours and fonts (Marcellus + Jost) in Site Settings</li>
			<li>Logos and photos imported into the Media Library</li>
			<li>Site title <strong>Magnolia Property Care</strong> and the magnolia icon as the favicon</li>
		</ul>
		<?php if ( $done ) : ?>
			<p><em>The importer has already been run. Running it again rebuilds the Magnolia pages, header and footer from the original design, overwriting edits made to them.</em></p>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="magnolia_importer">
			<?php wp_nonce_field( 'magnolia_importer' ); ?>

			<h2>Existing pages (<?php echo count( $existing ); ?>)</h2>
			<?php if ( $existing ) : ?>
				<ul style="list-style:disc;margin-left:20px">
					<?php foreach ( $existing as $page ) : ?>
						<li><?php echo esc_html( $page->post_title ? $page->post_title : '(no title)' ); ?> <span style="color:#777">— <?php echo esc_html( $page->post_status ); ?></span></li>
					<?php endforeach; ?>
				</ul>
				<p><label><input type="checkbox" name="trash_existing" value="1" checked> Delete all of these pages (moved to Pages → Trash, where they can be restored until the Trash is emptied)</label></p>
			<?php else : ?>
				<p>None.</p>
			<?php endif; ?>

			<h2>Estimate form</h2>
			<p><label>Send estimate requests to <input type="email" name="estimate_email" class="regular-text" value="<?php echo esc_attr( get_option( 'magnolia_importer_email', get_option( 'admin_email' ) ) ); ?>"></label></p>

			<?php submit_button( $done ? 'Rebuild the site' : 'Build the site', 'primary', 'submit', true, $ready ? array() : array( 'disabled' => 'disabled' ) ); ?>
		</form>
	</div>
	<?php
}

/**
 * Imports a bundled asset into the Media Library once; returns its attachment ID.
 */
function magnolia_importer_asset( $name, &$media ) {
	if ( ! empty( $media[ $name ] ) && get_post( $media[ $name ] ) ) {
		return (int) $media[ $name ];
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$tmp = wp_tempnam( basename( $name ) );
	copy( plugin_dir_path( __FILE__ ) . 'assets/' . $name, $tmp );
	$id = media_handle_sideload(
		array(
			'name'     => 'magnolia-' . basename( $name ),
			'tmp_name' => $tmp,
		),
		0,
		ucwords( str_replace( array( '-', '.jpg', '.png' ), array( ' ', '', '' ), basename( $name ) ) )
	);
	if ( is_wp_error( $id ) ) {
		@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		wp_die( esc_html( 'Could not import ' . $name . ': ' . $id->get_error_message() ) );
	}
	$media[ $name ] = $id;
	return $id;
}

/**
 * Resolves the %%…%% placeholders in the generated Elementor data.
 */
function magnolia_importer_resolve( $value, $ctx, &$media ) {
	if ( is_array( $value ) ) {
		foreach ( $value as $k => $v ) {
			$value[ $k ] = magnolia_importer_resolve( $v, $ctx, $media );
		}
		return $value;
	}
	if ( ! is_string( $value ) || false === strpos( $value, '%%' ) ) {
		return $value;
	}
	if ( preg_match( '/^%%IMGID:([a-z0-9\/._-]+)%%$/', $value, $m ) ) {
		return magnolia_importer_asset( $m[1], $media );
	}
	return preg_replace_callback(
		'/%%(IMG|URL|MENU|PLACEHOLDER|ESTIMATE_EMAIL)(?::([a-z0-9\/._-]+))?%%/',
		function ( $m ) use ( $ctx, &$media ) {
			switch ( $m[1] ) {
				case 'IMG':
					return wp_get_attachment_url( magnolia_importer_asset( $m[2], $media ) );
				case 'URL':
					return 'home' === $m[2] ? home_url( '/' ) : get_permalink( $ctx['pages'][ $m[2] ] );
				case 'MENU':
					return $ctx['menu'];
				case 'PLACEHOLDER':
					return \Elementor\Utils::get_placeholder_image_src();
				case 'ESTIMATE_EMAIL':
					return $ctx['email'];
			}
			return $m[0];
		},
		$value
	);
}

function magnolia_importer_data( $file, $ctx, &$media ) {
	$json = file_get_contents( plugin_dir_path( __FILE__ ) . 'data/' . $file . '.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	return magnolia_importer_resolve( json_decode( $json, true ), $ctx, $media );
}

/**
 * Saves Elementor data on a post through Elementor's own document API.
 */
function magnolia_importer_save_document( $post_id, $elements, $settings = array() ) {
	update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );
	$document = \Elementor\Plugin::$instance->documents->get( $post_id, false );
	$document->save(
		array(
			'elements' => $elements,
			'settings' => $settings,
		)
	);
}

/**
 * Creates (or reuses) a Theme Builder header/footer shown on the entire site.
 */
function magnolia_importer_theme_part( $type, $title, $elements, &$warnings ) {
	$ids = get_option( 'magnolia_importer_parts', array() );
	$id  = isset( $ids[ $type ] ) ? (int) $ids[ $type ] : 0;
	if ( ! $id || ! get_post( $id ) || 'trash' === get_post_status( $id ) ) {
		$document = \Elementor\Plugin::$instance->documents->create(
			$type,
			array(
				'post_title'  => $title,
				'post_status' => 'publish',
			)
		);
		if ( is_wp_error( $document ) || ! $document ) {
			$warnings[] = 'Could not create the ' . $type . ' template.';
			return;
		}
		$id = $document->get_main_id();
	}
	wp_update_post(
		array(
			'ID'          => $id,
			'post_status' => 'publish',
		)
	);
	magnolia_importer_save_document( $id, $elements );

	$ids[ $type ] = $id;
	update_option( 'magnolia_importer_parts', $ids );

	update_post_meta( $id, '_elementor_conditions', array( 'include/general' ) );
	try {
		\ElementorPro\Modules\ThemeBuilder\Module::instance()->get_conditions_manager()->save_conditions(
			$id,
			array(
				array(
					'type'     => 'include',
					'name'     => 'general',
					'sub_name' => '',
					'sub_id'   => '',
				),
			)
		);
	} catch ( \Throwable $e ) {
		$warnings[] = 'Display conditions for ' . $title . ': ' . $e->getMessage() . ' (' . basename( $e->getFile() ) . ':' . $e->getLine() . ')';
	}
}

function magnolia_importer_run() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Not allowed.' );
	}
	check_admin_referer( 'magnolia_importer' );
	if ( ! defined( 'ELEMENTOR_VERSION' ) ) {
		wp_die( 'Elementor must be active.' );
	}
	set_time_limit( 300 );
	$warnings = array();
	$has_pro  = defined( 'ELEMENTOR_PRO_VERSION' );

	// 1. Delete (trash) the existing pages.
	if ( ! empty( $_POST['trash_existing'] ) ) {
		foreach ( magnolia_importer_existing_pages() as $page ) {
			wp_trash_post( $page->ID );
		}
	}

	// 2. Create the pages so their URLs exist before any links are written.
	$pages = get_option( 'magnolia_importer_page_ids', array() );
	foreach ( magnolia_importer_pages() as $key => $info ) {
		$id = isset( $pages[ $key ] ) ? (int) $pages[ $key ] : 0;
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
		wp_update_post(
			array(
				'ID'          => $id,
				'post_title'  => $info['title'],
				'post_name'   => $info['slug'],
				'post_status' => 'publish',
			)
		);
		update_post_meta( $id, '_wp_page_template', 'elementor_header_footer' );
		$pages[ $key ] = $id;
	}
	update_option( 'magnolia_importer_page_ids', $pages );

	// 3. Site identity, front page, permalinks.
	update_option( 'blogname', MAGNOLIA_IMPORTER_SITE_NAME );
	update_option( 'blogdescription', MAGNOLIA_IMPORTER_TAGLINE );
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', $pages['home'] );
	if ( ! get_option( 'permalink_structure' ) ) {
		update_option( 'permalink_structure', '/%postname%/' );
	}
	flush_rewrite_rules();

	$media = get_option( 'magnolia_importer_media', array() );
	$icon  = magnolia_importer_asset( 'site-icon.png', $media );
	update_option( 'site_icon', $icon );

	// 4. Main menu (used by the header's Nav Menu widget).
	$menu = wp_get_nav_menu_object( 'Magnolia Main' );
	$menu_id = $menu ? $menu->term_id : wp_create_nav_menu( 'Magnolia Main' );
	foreach ( wp_get_nav_menu_items( $menu_id ) ? wp_get_nav_menu_items( $menu_id ) : array() as $item ) {
		wp_delete_post( $item->ID, true );
	}
	$position = 1;
	foreach ( magnolia_importer_pages() as $key => $info ) {
		wp_update_nav_menu_item(
			$menu_id,
			0,
			array(
				'menu-item-title'     => $info['title'],
				'menu-item-object'    => 'page',
				'menu-item-object-id' => $pages[ $key ],
				'menu-item-type'      => 'post_type',
				'menu-item-status'    => 'publish',
				'menu-item-position'  => $position++,
			)
		);
	}
	$locations           = get_theme_mod( 'nav_menu_locations', array() );
	$locations['menu-1'] = $menu_id;
	set_theme_mod( 'nav_menu_locations', $locations );

	$email = isset( $_POST['estimate_email'] ) ? sanitize_email( wp_unslash( $_POST['estimate_email'] ) ) : '';
	if ( ! is_email( $email ) ) {
		$email = get_option( 'admin_email' );
	}
	update_option( 'magnolia_importer_email', $email );

	$ctx = array(
		'pages' => $pages,
		'menu'  => get_term( $menu_id )->slug,
		'email' => $email,
	);

	// 5. Site Settings (global colours, fonts, custom CSS, identity).
	$kit = \Elementor\Plugin::$instance->kits_manager->get_active_kit();
	if ( $kit && $kit->get_id() ) {
		$kit_settings = array_merge(
			(array) $kit->get_meta( '_elementor_page_settings' ),
			magnolia_importer_data( 'kit', $ctx, $media ),
			array(
				'site_name'        => MAGNOLIA_IMPORTER_SITE_NAME,
				'site_description' => MAGNOLIA_IMPORTER_TAGLINE,
				'site_favicon'     => array(
					'id'  => $icon,
					'url' => wp_get_attachment_url( $icon ),
				),
			)
		);
		$kit->save( array( 'settings' => $kit_settings ) );
		// Saving the kit syncs these back to WordPress; set them again to be certain.
		update_option( 'blogname', MAGNOLIA_IMPORTER_SITE_NAME );
		update_option( 'site_icon', $icon );
	} else {
		$warnings[] = 'No active Elementor kit found, so global colours and fonts were not set.';
	}

	// 6. Pages.
	foreach ( magnolia_importer_pages() as $key => $info ) {
		magnolia_importer_save_document(
			$pages[ $key ],
			magnolia_importer_data( $info['file'], $ctx, $media ),
			array(
				'hide_title' => 'yes',
				'template'   => 'elementor_header_footer',
			)
		);
	}

	// 7. Theme Builder header and footer. Older headers/footers would compete with
	// ours for the "entire site" condition, so they go to the Trash (restorable).
	if ( $has_pro ) {
		$ours = array_map( 'intval', array_values( get_option( 'magnolia_importer_parts', array() ) ) );
		$old  = get_posts(
			array(
				'post_type'      => 'elementor_library',
				'post_status'    => array( 'publish', 'draft', 'private' ),
				'posts_per_page' => -1,
				'exclude'        => $ours,
				'meta_key'       => '_elementor_template_type', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => array( 'header', 'footer' ), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'meta_compare'   => 'IN',
			)
		);
		foreach ( $old as $template ) {
			wp_trash_post( $template->ID );
		}

		foreach ( array( 'header' => 'Magnolia Header', 'footer' => 'Magnolia Footer' ) as $type => $title ) {
			try {
				magnolia_importer_theme_part( $type, $title, magnolia_importer_data( $type, $ctx, $media ), $warnings );
			} catch ( \Throwable $e ) {
				$warnings[] = $title . ' failed: ' . $e->getMessage() . ' (' . basename( $e->getFile() ) . ':' . $e->getLine() . ')';
			}
		}
		try {
			$manager = \ElementorPro\Modules\ThemeBuilder\Module::instance()->get_conditions_manager();
			if ( method_exists( $manager, 'get_cache' ) ) {
				$manager->get_cache()->regenerate();
			}
		} catch ( \Throwable $e ) {
			$warnings[] = 'Conditions cache: ' . $e->getMessage() . ' (' . basename( $e->getFile() ) . ':' . $e->getLine() . ')';
		}
	} else {
		$warnings[] = 'Elementor Pro is not active, so the header, footer and estimate form were not built. Activate Elementor Pro and run the importer again.';
	}

	update_option( 'magnolia_importer_media', $media );
	update_option( 'magnolia_importer_done', time() );
	\Elementor\Plugin::$instance->files_manager->clear_cache();

	set_transient( 'magnolia_importer_warnings', $warnings, HOUR_IN_SECONDS );
	wp_safe_redirect( admin_url( 'tools.php?page=magnolia-importer&magnolia=done' ) );
	exit;
}
