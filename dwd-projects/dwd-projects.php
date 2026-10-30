<?php
/**
 * Plugin Name: DWD Projects Portfolio
 * Description: Add a website project once (name, URL, details) and it appears on the Portfolio page, the homepage carousel and its own case-study page. Captures full-page screenshots from the URL and cuts them into section images automatically. Also styles blog posts to match the site.
 * Version: 2.4.8
 * Author: Dream Web Digital
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: dwd-projects
 */

defined( 'ABSPATH' ) || exit;

define( 'DWDP_VERSION', '2.4.8' );
define( 'DWDP_FILE', __FILE__ );
define( 'DWDP_DIR', plugin_dir_path( __FILE__ ) );
define( 'DWDP_URL', plugin_dir_url( __FILE__ ) );
define( 'DWDP_CPT', 'dwd_project' );

require_once DWDP_DIR . 'includes/helpers.php';
require_once DWDP_DIR . 'includes/frontend.php';
require_once DWDP_DIR . 'includes/capture.php';
require_once DWDP_DIR . 'includes/blog.php';
require_once DWDP_DIR . 'includes/ai-seo.php';
require_once DWDP_DIR . 'includes/spam.php';
add_action( 'plugins_loaded', function () {
	if ( class_exists( 'WooCommerce' ) ) {
		require_once DWDP_DIR . 'includes/woo.php';
	}
} );
if ( is_admin() ) {
	require_once DWDP_DIR . 'includes/admin.php';
	require_once DWDP_DIR . 'includes/importer.php';
	require_once DWDP_DIR . 'includes/autofill.php';
	require_once DWDP_DIR . 'includes/migrate.php';
	require_once DWDP_DIR . 'includes/upwork.php';
}

add_action( 'init', 'dwdp_register_post_type' );
function dwdp_register_post_type() {
	register_post_type(
		DWDP_CPT,
		array(
			'labels'             => array(
				'name'               => 'Projects',
				'singular_name'      => 'Project',
				'add_new'            => 'Add Project',
				'add_new_item'       => 'Add New Project',
				'edit_item'          => 'Edit Project',
				'new_item'           => 'New Project',
				'view_item'          => 'View Project',
				'search_items'       => 'Search Projects',
				'not_found'          => 'No projects yet',
				'all_items'          => 'All Projects',
				'menu_name'          => 'Projects',
			),
			'public'             => true,
			'show_in_rest'       => false, // classic screen with our own fields
			'menu_icon'          => 'dashicons-portfolio',
			'menu_position'      => 21,
			'supports'           => array( 'title', 'page-attributes' ),
			'has_archive'        => false,
			'rewrite'            => array(
				'slug'       => dwdp_base_slug(),
				'with_front' => false,
			),
		)
	);
}

register_activation_hook( __FILE__, 'dwdp_activate' );
function dwdp_activate() {
	dwdp_register_post_type();
	flush_rewrite_rules();
}

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
