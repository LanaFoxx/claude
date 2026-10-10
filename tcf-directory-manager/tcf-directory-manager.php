<?php
/**
 * Plugin Name: Tax Course Finder – Directory Manager
 * Description: Manage every CTEC provider listing (20-hour CE and 60-hour QE): prices, coupons and sales, course format, materials, support and device features. Import research from ChatGPT (JSON or CSV) with a preview, change log and one-click undo, or edit any listing by hand. Feeds the site directory through /wp-json/tcf/v1/providers.
 * Version: 2.1.0
 * Author: Tax Course Finder
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * Text Domain: tcf-directory
 */

defined('ABSPATH') || exit;

define('TCFD_VERSION', '2.1.0');
define('TCFD_FILE', __FILE__);
define('TCFD_DIR', plugin_dir_path(__FILE__));
define('TCFD_URL', plugin_dir_url(__FILE__));

require_once TCFD_DIR . 'includes/class-fields.php';
require_once TCFD_DIR . 'includes/class-store.php';
require_once TCFD_DIR . 'includes/class-normalizer.php';
require_once TCFD_DIR . 'includes/class-importer.php';
require_once TCFD_DIR . 'includes/class-rest.php';
require_once TCFD_DIR . 'includes/class-schema.php';
require_once TCFD_DIR . 'includes/class-admin.php';

final class TCFD_Plugin {
    const POST_TYPE = 'tcf_provider';
    const LEGACY_PLUGIN = 'tax-course-finder-data-manager/tax-course-finder-data-manager.php';

    public static function boot(): void {
        add_action('init', [__CLASS__, 'register_post_type']);
        add_action('acf/init', ['TCFD_Fields', 'register']);
        add_action('rest_api_init', ['TCFD_Rest', 'register']);
        TCFD_Schema::boot();
        add_action('save_post_' . self::POST_TYPE, ['TCFD_Store', 'flush_cache']);
        add_action('trashed_post', ['TCFD_Store', 'flush_cache']);
        add_action('untrashed_post', ['TCFD_Store', 'flush_cache']);
        add_action('deleted_post', ['TCFD_Store', 'flush_cache']);
        add_action('acf/save_post', ['TCFD_Store', 'flush_cache'], 20);
        if (is_admin()) {
            TCFD_Admin::boot();
        }
    }

    public static function activate(): void {
        // The legacy Data Manager registers the same post type, fields and REST route; this plugin replaces it.
        if (!function_exists('deactivate_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        if (is_plugin_active(self::LEGACY_PLUGIN)) {
            deactivate_plugins(self::LEGACY_PLUGIN, true);
        }
        TCFD_Importer::install_tables();
        self::register_post_type();
        TCFD_Store::flush_cache();
    }

    public static function register_post_type(): void {
        if (post_type_exists(self::POST_TYPE)) {
            return;
        }
        register_post_type(self::POST_TYPE, [
            'labels' => [
                'name' => 'Providers',
                'singular_name' => 'Provider',
                'add_new' => 'Add Provider',
                'add_new_item' => 'Add Provider',
                'edit_item' => 'Edit Provider',
                'new_item' => 'New Provider',
                'view_item' => 'View Provider',
                'search_items' => 'Search Providers',
                'not_found' => 'No providers found',
                'not_found_in_trash' => 'No providers in Trash',
                'all_items' => 'All Providers',
                'menu_name' => 'Providers',
            ],
            'public' => false,
            'publicly_queryable' => false,
            'exclude_from_search' => true,
            'show_ui' => true,
            'show_in_menu' => true,
            'show_in_rest' => true,
            'has_archive' => false,
            'rewrite' => false,
            'query_var' => false,
            'supports' => ['title'],
            'menu_icon' => 'dashicons-welcome-learn-more',
            'menu_position' => 25,
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ]);
    }
}

register_activation_hook(__FILE__, ['TCFD_Plugin', 'activate']);
TCFD_Plugin::boot();
