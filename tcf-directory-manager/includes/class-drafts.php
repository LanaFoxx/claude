<?php
/**
 * "Save and finish later" for the provider forms (listing verification and school profile).
 *
 * The form script keeps answers on the provider's own device as they type. When they choose
 * "Save and finish later", the answers are also stored here under a random 32-character token, so the
 * link it gives them (/provider-application/?resume=TOKEN) reopens the answers on any device.
 * Drafts hold text answers only (no files), expire after 30 days and are deleted once the form is sent.
 */
if (!defined('ABSPATH')) exit;

class TCFD_Drafts {
    const PREFIX = 'tcfd_draft_';
    const DAYS = 30;
    const MAX_BYTES = 60000;

    public static function boot(): void {
        foreach (['save', 'load', 'delete'] as $a) {
            add_action('wp_ajax_tcfd_form_draft_' . $a, [__CLASS__, $a]);
            add_action('wp_ajax_nopriv_tcfd_form_draft_' . $a, [__CLASS__, $a]);
        }
        add_action('tcfd_drafts_cleanup', [__CLASS__, 'cleanup']);
        add_action('init', function () { if (!wp_next_scheduled('tcfd_drafts_cleanup')) wp_schedule_event(time() + 900, 'daily', 'tcfd_drafts_cleanup'); });
    }

    private static function token_in(): string {
        $t = strtolower((string) ($_REQUEST['token'] ?? ''));
        return preg_match('/^[a-f0-9]{32}$/', $t) ? $t : '';
    }

    private static function limited(): bool {  // at most 60 saves an hour from one address
        $k = 'tcfd_dr_' . substr(hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '') . wp_salt('nonce')), 0, 24);
        $n = (int) get_transient($k);
        if ($n >= 60) return true;
        set_transient($k, $n + 1, HOUR_IN_SECONDS);
        return false;
    }

    /** Keep only plain answers: field name => text, or a list of ticked values. */
    private static function clean($data): array {
        $out = ['fields' => [], 'toggles' => []];
        if (!is_array($data)) return $out;
        foreach ((array) ($data['fields'] ?? []) as $k => $v) {
            $k = (string) $k;
            if (!preg_match('/^[a-z0-9_]{1,40}(\[\])?$/', $k) || count($out['fields']) >= 120) continue;
            if (is_array($v)) $out['fields'][$k] = array_slice(array_values(array_map(function ($x) { return mb_substr(sanitize_text_field((string) $x), 0, 80); }, array_filter($v, 'is_scalar'))), 0, 30);
            elseif (is_scalar($v)) $out['fields'][$k] = mb_substr(sanitize_textarea_field((string) $v), 0, 5000);
        }
        foreach ((array) ($data['toggles'] ?? []) as $k => $v) {
            if (preg_match('/^[a-z0-9_]{1,40}$/', (string) $k) && count($out['toggles']) < 10) $out['toggles'][(string) $k] = (bool) $v;
        }
        return $out;
    }

    public static function save(): void {
        $kind = (string) ($_POST['kind'] ?? '');
        if (!in_array($kind, ['verify', 'profile'], true)) wp_send_json_error(['message' => 'Unknown form.'], 400);
        $raw = wp_unslash((string) ($_POST['data'] ?? ''));
        if ($raw === '' || strlen($raw) > self::MAX_BYTES) wp_send_json_error(['message' => 'Nothing to save.'], 400);
        if (self::limited()) wp_send_json_error(['message' => 'Too many saves. Please try again later.'], 429);
        $data = self::clean(json_decode($raw, true));
        $token = self::token_in();
        if ($token === '' || get_option(self::PREFIX . $token) === false) $token = bin2hex(random_bytes(16));
        $row = ['k' => $kind, 't' => time(), 's' => max(1, min(10, (int) ($_POST['step'] ?? 1))), 'd' => $data];
        if (get_option(self::PREFIX . $token) === false) add_option(self::PREFIX . $token, $row, '', 'no');
        else update_option(self::PREFIX . $token, $row, false);
        wp_send_json_success(['token' => $token, 'days' => self::DAYS]);
    }

    public static function load(): void {
        $token = self::token_in();
        $row = $token ? get_option(self::PREFIX . $token) : false;
        if (!is_array($row) || time() - (int) ($row['t'] ?? 0) > self::DAYS * DAY_IN_SECONDS) wp_send_json_error(['message' => 'This saved link has expired.'], 404);
        nocache_headers();
        wp_send_json_success(['kind' => $row['k'], 'step' => (int) $row['s'], 'saved' => (int) $row['t'], 'data' => $row['d']]);
    }

    public static function delete(): void {
        $token = self::token_in();
        if ($token) delete_option(self::PREFIX . $token);
        wp_send_json_success();
    }

    public static function cleanup(): void {
        global $wpdb;
        $names = $wpdb->get_col($wpdb->prepare("SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s LIMIT 500", $wpdb->esc_like(self::PREFIX) . '%'));
        foreach ($names as $n) {
            $row = get_option($n);
            if (!is_array($row) || time() - (int) ($row['t'] ?? 0) > self::DAYS * DAY_IN_SECONDS) delete_option($n);
        }
    }
}
