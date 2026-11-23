<?php
/**
 * Plugin Name: Pacific Tax Academy Student Area
 * Description: The student dashboard in My Account (its own menu and layout), course progress from Moodle, one-click course login, enrollment on purchase, CTEC ID and PTIN fields.
 * Version: 1.0.0
 * Author: Pacific Tax Academy
 * Requires Plugins: woocommerce
 * Requires PHP: 8.1
 * Text Domain: pta-student-area
 */

defined('ABSPATH') || exit;

define('PTA_SA_VERSION', '1.0.0');
define('PTA_SA_DIR', plugin_dir_path(__FILE__));
define('PTA_SA_URL', plugin_dir_url(__FILE__));

require_once PTA_SA_DIR . 'includes/class-settings.php';
require_once PTA_SA_DIR . 'includes/class-bridge.php';
require_once PTA_SA_DIR . 'includes/class-catalog.php';
require_once PTA_SA_DIR . 'includes/class-student.php';
require_once PTA_SA_DIR . 'includes/class-account.php';
require_once PTA_SA_DIR . 'includes/class-commerce.php';

add_action('plugins_loaded', static function () {
    if (!class_exists('WooCommerce')) {
        return;
    }
    PTA_SA_Settings::init();
    PTA_SA_Account::init();
    PTA_SA_Commerce::init();
});

register_activation_hook(__FILE__, static function () {
    PTA_SA_Account::add_endpoints();
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, 'flush_rewrite_rules');
