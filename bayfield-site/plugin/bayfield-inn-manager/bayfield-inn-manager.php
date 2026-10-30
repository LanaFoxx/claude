<?php
/**
 * Plugin Name: Bayfield Inn Manager
 * Description: Simple dashboard for the Bayfield Inn team to edit restaurant menus, the photo gallery and merchandise. The site's Elementor pages show whatever is saved here.
 * Version: 1.1.1
 * Author: Dream Web Digital
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'BI_MANAGER_VERSION', '1.1.1' );
define( 'BI_MANAGER_URL', plugin_dir_url( __FILE__ ) );
define( 'BI_MANAGER_DIR', plugin_dir_path( __FILE__ ) );
define( 'BI_MANAGER_CAP', 'edit_pages' ); // Administrators and Editors.

/* ------------------------------------------------------------------ data */

function bi_get_data( $kind ) {
	$data = get_option( 'bi_' . $kind, array() );
	return is_array( $data ) ? $data : array();
}

/** Keep only plain text (or limited HTML for descriptions) at every level. */
function bi_clean( $value, $key = '' ) {
	if ( is_array( $value ) ) {
		$out = array();
		foreach ( $value as $k => $v ) {
			$out[ is_int( $k ) ? $k : sanitize_key( $k ) ] = bi_clean( $v, is_int( $k ) ? $key : $k );
		}
		return $out;
	}
	if ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
		return $value;
	}
	if ( in_array( $key, array( 'url', 'pdf', 'link' ), true ) ) {
		return esc_url_raw( (string) $value );
	}
	if ( in_array( $key, array( 'desc', 'note', 'footer', 'notes' ), true ) ) {
		return sanitize_textarea_field( (string) $value );
	}
	return sanitize_text_field( (string) $value );
}

function bi_save_data( $kind, $data ) {
	if ( ! in_array( $kind, array( 'menus', 'galleries', 'products' ), true ) ) {
		return false;
	}
	update_option( 'bi_' . $kind, bi_clean( $data ), false );
	// Elementor caches rendered pages; clear it so changes show right away.
	if ( class_exists( '\Elementor\Plugin' ) ) {
		\Elementor\Plugin::$instance->files_manager->clear_cache();
	}
	do_action( 'bi_data_saved', $kind );
	if ( function_exists( 'sg_cachepress_purge_cache' ) ) {
		sg_cachepress_purge_cache();
	}
	return true;
}

/* ----------------------------------------------------------------- admin */

add_action( 'admin_menu', function () {
	add_menu_page( 'Bayfield Inn', 'Bayfield Inn', BI_MANAGER_CAP, 'bi-menus', 'bi_render_admin', 'dashicons-building', 3 );
	add_submenu_page( 'bi-menus', 'Restaurant Menus', 'Restaurant Menus', BI_MANAGER_CAP, 'bi-menus', 'bi_render_admin' );
	add_submenu_page( 'bi-menus', 'Gallery', 'Gallery', BI_MANAGER_CAP, 'bi-gallery', 'bi_render_admin' );
	add_submenu_page( 'bi-menus', 'Merchandise', 'Merchandise', BI_MANAGER_CAP, 'bi-merch', 'bi_render_admin' );
} );

function bi_render_admin() {
	$page  = isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : '';
	$kind  = array( 'bi-gallery' => 'galleries', 'bi-merch' => 'products' )[ $page ] ?? 'menus';
	$title = array( 'menus' => 'Restaurant Menus', 'galleries' => 'Gallery', 'products' => 'Merchandise' )[ $kind ];
	$data  = bi_get_data( $kind );
	$thumbs = array();
	if ( 'menus' !== $kind ) {
		// Give the editor thumbnails for every saved image.
		$ids = array();
		array_walk_recursive( $data, function ( $v, $k ) use ( &$ids ) {
			if ( is_int( $v ) || ( is_string( $v ) && ctype_digit( $v ) ) ) {
				$ids[] = (int) $v;
			}
		} );
		foreach ( array_unique( $ids ) as $aid ) {
			$src = wp_get_attachment_image_src( $aid, 'thumbnail' );
			if ( $src ) {
				$thumbs[ $aid ] = $src[0];
			}
		}
	}
	?>
	<div class="wrap bi-wrap">
		<h1><?php echo esc_html( $title ); ?></h1>
		<p class="bi-lead">
			<?php if ( 'menus' === $kind ) : ?>
				Edit each restaurant's menu here. Drag <span class="dashicons dashicons-move"></span> to reorder. Click <strong>Save changes</strong> when you're done and the website updates right away.
			<?php elseif ( 'products' === $kind ) : ?>
				Each item shows on the Merchandise page with a <strong>Buy now</strong> button. Create a payment link for the item in Square (Online › Payment links), paste it here, add photos, and click <strong>Save changes</strong>. Drag <span class="dashicons dashicons-move"></span> to reorder.
			<?php else : ?>
				Add, remove and drag photos in each section. Sections with sub-sections (like Rooms) show their photos in the sub-sections. Click <strong>Save changes</strong> when you're done.
			<?php endif; ?>
		</p>
		<div id="bi-app" data-kind="<?php echo esc_attr( $kind ); ?>"></div>
		<script type="application/json" id="bi-data"><?php echo wp_json_encode( $data ); ?></script>
		<?php if ( 'menus' !== $kind ) : ?>
			<script type="application/json" id="bi-thumbs"><?php echo wp_json_encode( (object) $thumbs ); ?></script>
		<?php endif; ?>
	</div>
	<?php
}

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( false === strpos( $hook, 'bi-menus' ) && false === strpos( $hook, 'bi-gallery' ) && false === strpos( $hook, 'bi-merch' ) ) {
		return;
	}
	wp_enqueue_media();
	wp_enqueue_style( 'bi-admin', BI_MANAGER_URL . 'assets/admin.css', array(), BI_MANAGER_VERSION );
	wp_enqueue_script( 'bi-admin', BI_MANAGER_URL . 'assets/admin.js', array( 'jquery', 'jquery-ui-sortable' ), BI_MANAGER_VERSION, true );
	wp_localize_script( 'bi-admin', 'BI', array(
		'ajax'  => admin_url( 'admin-ajax.php' ),
		'nonce' => wp_create_nonce( 'bi_save' ),
	) );
} );

add_action( 'wp_ajax_bi_save', function () {
	check_ajax_referer( 'bi_save', 'nonce' );
	if ( ! current_user_can( BI_MANAGER_CAP ) ) {
		wp_send_json_error( 'Not allowed', 403 );
	}
	$kind = isset( $_POST['kind'] ) ? sanitize_key( wp_unslash( $_POST['kind'] ) ) : '';
	$data = isset( $_POST['data'] ) ? json_decode( wp_unslash( $_POST['data'] ), true ) : null;
	if ( ! is_array( $data ) || ! bi_save_data( $kind, $data ) ) {
		wp_send_json_error( 'Could not save', 400 );
	}
	wp_send_json_success();
} );

/* Admins can load starter content through the REST API (used once at setup). */
add_action( 'rest_api_init', function () {
	register_rest_route( 'bayfield/v1', '/data/(?P<kind>menus|galleries|products)', array(
		array(
			'methods'             => 'GET',
			'permission_callback' => function () { return current_user_can( BI_MANAGER_CAP ); },
			'callback'            => function ( $req ) { return bi_get_data( $req['kind'] ); },
		),
		array(
			'methods'             => 'POST',
			'permission_callback' => function () { return current_user_can( 'manage_options' ); },
			'callback'            => function ( $req ) {
				$body = $req->get_json_params();
				if ( ! is_array( $body ) ) {
					return new WP_Error( 'bad', 'JSON body required', array( 'status' => 400 ) );
				}
				if ( empty( $body['force'] ) && bi_get_data( $req['kind'] ) ) {
					return array( 'saved' => false, 'reason' => 'already has data' );
				}
				bi_save_data( $req['kind'], $body['data'] ?? array() );
				return array( 'saved' => true );
			},
		),
	) );
} );

/* -------------------------------------------------------------- frontend */

add_action( 'wp_enqueue_scripts', function () {
	wp_register_style( 'bi-front', BI_MANAGER_URL . 'assets/front.css', array(), BI_MANAGER_VERSION );
	wp_register_script( 'bi-front', BI_MANAGER_URL . 'assets/front.js', array(), BI_MANAGER_VERSION, true );
} );

add_action( 'elementor/widgets/register', function ( $widgets ) {
	require_once BI_MANAGER_DIR . 'widgets/class-bi-menu-widget.php';
	require_once BI_MANAGER_DIR . 'widgets/class-bi-gallery-widget.php';
	require_once BI_MANAGER_DIR . 'widgets/class-bi-shop-widget.php';
	$widgets->register( new BI_Menu_Widget() );
	$widgets->register( new BI_Gallery_Widget() );
	$widgets->register( new BI_Shop_Widget() );
} );

add_action( 'elementor/elements/categories_registered', function ( $manager ) {
	$manager->add_category( 'bayfield', array( 'title' => 'Bayfield Inn', 'icon' => 'fa fa-plug' ) );
} );
