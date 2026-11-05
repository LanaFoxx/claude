<?php
/**
 * Front-end speed for visitors (PageSpeed).
 *
 * Every page is built from Elementor HTML widgets plus the site's own vanilla runtime, so the
 * Elementor/jQuery front-end scripts do nothing for visitors. They are removed for logged-out
 * visitors only; logged-in users (editors, the Elementor preview) keep the normal scripts.
 */
if (!defined('ABSPATH')) exit;

class TCFD_Perf {
    const HANDLES = [
        'elementor-frontend', 'elementor-frontend-modules', 'elementor-webpack-runtime',
        'elementor-pro-frontend', 'pro-elements-handlers', 'elementor-pro-webpack-runtime',
        'elementor-sticky', 'jquery-ui-core', 'hello-theme-frontend',
        'wp-i18n', 'wp-hooks', 'jquery', 'jquery-core', 'jquery-migrate',
    ];

    public static function init() {
        add_action('init', [__CLASS__, 'emoji']);
        add_action('wp_enqueue_scripts', [__CLASS__, 'styles'], 100);
        add_action('wp_head', [__CLASS__, 'strip'], 1);
        add_action('wp_print_scripts', [__CLASS__, 'strip'], 0);
        add_action('wp_print_footer_scripts', [__CLASS__, 'strip'], 0);
        add_action('wp_footer', [__CLASS__, 'strip'], 0);
        add_action('wp_footer', [__CLASS__, 'strip'], 19);
    }

    private static function active() {
        if (is_admin() || is_user_logged_in() || wp_doing_ajax() || is_customize_preview()) return false;
        if (defined('REST_REQUEST') && REST_REQUEST) return false;
        if (isset($_GET['elementor-preview']) || isset($_GET['preview'])) return false;
        return (bool) apply_filters('tcfd_perf_strip_scripts', true);
    }

    public static function strip() {
        if (!self::active()) return;
        $ws = wp_scripts();
        foreach (self::HANDLES as $h) {
            wp_dequeue_script($h);
        }
        // anything still queued that needs a removed script would pull it back in as a dependency:
        // drop those too (none are used by the site's pages).
        foreach ((array) $ws->queue as $h) {
            $deps = isset($ws->registered[$h]) ? (array) $ws->registered[$h]->deps : [];
            if (array_intersect($deps, self::HANDLES)) wp_dequeue_script($h);
        }
    }

    // Block editor styles: the pages are Elementor HTML widgets, no blocks.
    public static function styles() {
        if (!self::active()) return;
        foreach (['wp-block-library', 'wp-block-library-theme', 'classic-theme-styles'] as $h) wp_dequeue_style($h);
    }

    public static function emoji() {
        if (is_admin()) return;
        remove_action('wp_head', 'print_emoji_detection_script', 7);
        remove_action('wp_print_styles', 'print_emoji_styles');
        remove_action('wp_enqueue_scripts', 'wp_enqueue_emoji_styles');
        remove_filter('the_content_feed', 'wp_staticize_emoji');
        remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
    }
}
