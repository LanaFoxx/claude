<?php
/**
 * Visitor page cache (stored in the persistent object cache, i.e. Redis via Object Cache Pro).
 *
 * The host's page cache is not active on this site, so every page view rebuilt the page with the full
 * plugin stack (~0.6 s of PHP). This stores each finished visitor page and serves it on the next request,
 * as soon as this plugin file loads (before Elementor, Yoast and the theme do their work).
 *
 * Only anonymous GET requests without a query string are cached, and only complete 200 HTML responses.
 * Logged-in users, previews, forms with query strings (receipts, private profile links), REST, AJAX,
 * cron, feeds, sitemaps and errors always go to WordPress. Any content change clears the whole cache.
 */
if (!defined('ABSPATH')) exit;

class TCFD_Page_Cache {
    const GROUP = 'tcfd_pc';
    const TTL = 21600; // 6 hours; any content change clears it sooner
    const VER = 'tcfd_pc_ver';

    private static function eligible_request(): bool {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') return false;
        if (!empty($_GET) || strpos((string) ($_SERVER['REQUEST_URI'] ?? ''), '?') !== false) return false;
        foreach (['WP_ADMIN', 'DOING_AJAX', 'DOING_CRON', 'REST_REQUEST', 'XMLRPC_REQUEST', 'WP_CLI', 'IFRAME_REQUEST', 'DONOTCACHEPAGE'] as $c) {
            if (defined($c) && constant($c)) return false;
        }
        $path = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
        if ($path === '' || preg_match('#^/(wp-admin|wp-json|wp-login|wp-cron|wp-content|wp-includes|xmlrpc|feed)|\.(php|xml|txt|xsl)$|/feed/?$#i', $path)) return false;
        foreach (array_keys($_COOKIE) as $k) {
            if (preg_match('/^(wordpress_logged_in_|wordpress_sec_|wp-postpass_|comment_author_|wp-settings-|tcfd_nocache)/', (string) $k)) return false;
        }
        return function_exists('wp_using_ext_object_cache') && wp_using_ext_object_cache();
    }

    private static function key(): string {
        $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
        $path = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        return md5(($https ? 'https' : 'http') . '://' . $host . $path) . '_' . self::version();
    }

    private static function version(): string {
        $v = wp_cache_get(self::VER, self::GROUP);
        if ($v === false) { $v = (string) get_option(self::VER, '1'); wp_cache_set(self::VER, $v, self::GROUP, self::TTL); }
        return (string) $v;
    }

    /** Called when this plugin file loads: serve a stored page and stop. */
    public static function serve(): void {
        if (!self::eligible_request()) return;
        $hit = wp_cache_get(self::key(), self::GROUP);
        if (!is_array($hit) || empty($hit['html'])) return;
        if (!headers_sent()) {
            header('Content-Type: text/html; charset=UTF-8');
            header('Cache-Control: public, max-age=60');
            header('X-TCF-Cache: HIT ' . self::version());
            if (!empty($hit['t'])) header('Last-Modified: ' . gmdate('D, d M Y H:i:s', (int) $hit['t']) . ' GMT');
        }
        echo $hit['html'];
        exit;
    }

    public static function init(): void {
        add_action('template_redirect', [__CLASS__, 'start'], 0);
        // keep the cache warm: rebuild every public page shortly after a clear, and hourly (entries last 6 hours)
        add_action('tcfd_pc_warm', [__CLASS__, 'warm']);
        add_action('init', function () { if (!wp_next_scheduled('tcfd_pc_warm_hourly')) wp_schedule_event(time() + 300, 'hourly', 'tcfd_pc_warm_hourly'); });
        add_action('tcfd_pc_warm_hourly', [__CLASS__, 'warm']);
        // anything that can change a page clears the whole cache
        foreach (['save_post', 'deleted_post', 'trashed_post', 'untrashed_post', 'edited_term', 'created_term', 'delete_term',
                  'switch_theme', 'activated_plugin', 'deactivated_plugin', 'upgrader_process_complete', 'acf/save_post',
                  'wp_update_nav_menu', 'elementor/core/files/clear_cache', 'customize_save_after',
                  'redirection_redirect_updated', 'redirection_redirect_deleted'] as $h) {
            add_action($h, [__CLASS__, 'clear'], 99);
        }
        foreach (['added_post_meta', 'updated_post_meta', 'deleted_post_meta'] as $h) {
            // school fields are plain meta keys; underscore keys are bookkeeping (Yoast, edit locks, ACF references)
            add_action($h, function ($mid, $post_id, $meta_key) {
                if ($meta_key !== '' && $meta_key[0] !== '_' && get_post_type($post_id) === TCFD_Plugin::POST_TYPE) self::clear();
            }, 99, 3);
        }
        add_action('updated_option', function ($name) {
            if (in_array($name, ['blogname', 'blogdescription', 'permalink_structure', 'show_on_front', 'page_on_front', 'wpseo', 'wpseo_titles'], true)
                || (strpos($name, 'tcfd_') === 0 && strpos($name, 'tcfd_sk_') !== 0 && $name !== self::VER)) self::clear();
        });
    }

    public static function clear(): void {
        static $done = false;
        if ($done) return;
        $done = true;
        $v = (string) (time() . wp_rand(100, 999));
        update_option(self::VER, $v, true);
        wp_cache_set(self::VER, $v, self::GROUP, self::TTL);
        if (!wp_next_scheduled('tcfd_pc_warm')) wp_schedule_single_event(time() + 30, 'tcfd_pc_warm');
    }

    /** Request every public page once (anonymous, no cookies) so visitors get stored copies. */
    public static function warm(): void {
        if (!wp_using_ext_object_cache()) return;
        $urls = [home_url('/')];
        foreach (get_posts(['post_type' => 'page', 'post_status' => 'publish', 'numberposts' => 200, 'fields' => 'ids']) as $id) $urls[] = get_permalink($id);
        if (class_exists('TCFD_School')) {
            foreach (get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids']) as $id) {
                if (TCFD_School::is_live((int) $id)) $urls[] = TCFD_School::url((int) $id);
            }
        }
        $start = microtime(true);
        foreach (array_unique(array_filter($urls)) as $u) {
            if (microtime(true) - $start > 50) break;  // stay well inside a cron run
            wp_remote_get($u, ['timeout' => 15, 'redirection' => 0, 'cookies' => [], 'user-agent' => 'TCF cache warmer', 'blocking' => true]);
        }
    }

    /** Store this page once WordPress has built it (visitor page views only). */
    public static function start(): void {
        if (!self::eligible_request() || is_user_logged_in() || is_admin() || is_404() || is_search() || is_feed() || is_preview() || is_robots()) return;
        $key = self::key();
        ob_start(function ($html) use ($key) {
            $ok = http_response_code() === 200 && strlen($html) > 2000 && stripos($html, '</html>') !== false && !defined('DONOTCACHEPAGE');
            if ($ok) foreach (headers_list() as $h) { if (stripos($h, 'set-cookie:') === 0 || stripos($h, 'location:') === 0) { $ok = false; break; } }
            if ($ok) {
                wp_cache_set($key, ['html' => $html, 't' => time()], self::GROUP, self::TTL);
                if (!headers_sent()) header('X-TCF-Cache: MISS ' . self::version());
            }
            return $html;
        });
    }
}
