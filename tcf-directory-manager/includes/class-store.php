<?php
defined('ABSPATH') || exit;

/** Reading/writing provider data and building the public payload. */
final class TCFD_Store {
    const CACHE_KEY = 'tcfd_providers_payload_v2';

    public static function flush_cache($post_id = 0): void {
        if ($post_id && is_numeric($post_id) && get_post_type((int) $post_id) === TCFD_Plugin::POST_TYPE) {
            self::sync_offering((int) $post_id);
        }
        delete_transient(self::CACHE_KEY);
    }

    /** Keep the CTEC Offering label in step with the two course switches. */
    private static function sync_offering(int $post_id): void {
        static $busy = false;
        if ($busy) return;
        $ce = (bool) self::raw($post_id, 'offers_20_hour_ce');
        $qe = (bool) self::raw($post_id, 'offers_60_hour_qe');
        $want = $ce && $qe ? 'QE + CE' : ($qe ? 'QE' : ($ce ? 'CE' : ''));
        if ((string) self::raw($post_id, 'ctec_offering') !== $want) {
            $busy = true;
            self::set($post_id, 'ctec_offering', $want === '' ? null : $want);
            $busy = false;
        }
    }

    /** Stored (unformatted) value. */
    public static function raw(int $post_id, string $name) {
        if (function_exists('get_field')) {
            return get_field(TCFD_Fields::key($name), $post_id, false);
        }
        return get_post_meta($post_id, $name, true);
    }

    /** Formatted value (dates Y-m-d, repeaters as rows keyed by sub-field name). */
    public static function get(int $post_id, string $name) {
        if (function_exists('get_field')) {
            return get_field(TCFD_Fields::key($name), $post_id);
        }
        return get_post_meta($post_id, $name, true);
    }

    public static function set(int $post_id, string $name, $value): void {
        if ($value === null || $value === '') {
            if (function_exists('delete_field')) delete_field(TCFD_Fields::key($name), $post_id);
            else delete_post_meta($post_id, $name);
            return;
        }
        if (function_exists('update_field')) update_field(TCFD_Fields::key($name), $value, $post_id);
        else update_post_meta($post_id, $name, $value);
    }

    public static function offers(int $post_id): array {
        $rows = self::get($post_id, 'provider_offers');
        return is_array($rows) ? array_values($rows) : [];
    }

    public static function aliases(int $post_id): array {
        $rows = self::get($post_id, 'provider_aliases');
        $out = [];
        if (is_array($rows)) foreach ($rows as $r) if (!empty($r['alias'])) $out[] = (string) $r['alias'];
        return $out;
    }

    public static function scope_code(string $scope): string {
        $s = strtolower($scope);
        if ($s === 'both' || (strpos($s, '20') !== false && strpos($s, '60') !== false)) return 'both';
        if (preg_match('/60|\bqe\b|qualifying/', $s)) return 'qe';
        if (preg_match('/20|\bce\b|continuing/', $s)) return 'ce';
        return 'other';
    }

    private static function num($v) {
        return ($v === '' || $v === null || !is_numeric($v)) ? null : 0 + $v;
    }

    private static function ymd($v): string {
        $v = (string) $v;
        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $v, $m)) return "$m[1]-$m[2]-$m[3]";
        return $v;
    }

    public static function public_payload(int $post_id): array {
        $logo_id = (int) (self::raw($post_id, 'provider_logo') ?: 0);
        $features = [];
        foreach (TCFD_Fields::feature_keys() as $k => $l) $features[$k] = (bool) self::raw($post_id, $k);

        $today = current_time('Ymd');
        $offers = [];
        foreach (self::offers($post_id) as $o) {
            if (empty($o['offer_active'])) continue;
            $exp = preg_replace('/\D/', '', (string) ($o['offer_expiration_date'] ?? ''));
            if ($exp && strlen($exp) >= 8 && substr($exp, 0, 8) < $today) continue;
            $start = preg_replace('/\D/', '', (string) ($o['offer_start_date'] ?? ''));
            if ($start && strlen($start) >= 8 && substr($start, 0, 8) > $today) continue;
            $o['scope'] = self::scope_code((string) ($o['offer_course_scope'] ?? ''));
            $offers[] = $o;
        }

        $price = function (string $p) use ($post_id): array {
            return [
                'current_price' => self::num(self::raw($post_id, $p . '_current_price')),
                'regular_price' => self::num(self::raw($post_id, $p . '_regular_price')),
                'display_price' => (string) (self::raw($post_id, $p . '_price_display_text') ?: ''),
                'price_type' => (string) (self::raw($post_id, $p . '_price_type') ?: ''),
                'price_status' => (string) (self::raw($post_id, $p . '_price_status') ?: ''),
                'course_url' => (string) (self::raw($post_id, $p . '_affiliate_url') ?: self::raw($post_id, $p . '_course_url') ?: ''),
            ];
        };

        $payload = [
            'id' => $post_id,
            'name' => (string) (self::raw($post_id, 'provider_display_name') ?: get_the_title($post_id)),
            'website' => (string) (self::raw($post_id, 'provider_website') ?: ''),
            'link_url' => (string) (self::raw($post_id, 'provider_affiliate_url') ?: self::raw($post_id, 'provider_website') ?: ''),
            'logo_id' => $logo_id,
            'logo_url' => $logo_id ? (string) wp_get_attachment_image_url($logo_id, 'medium') : '',
            'ctec_number' => (string) (self::raw($post_id, 'provider_ctec_number') ?: ''),
            'ctec_offering' => (string) (self::raw($post_id, 'ctec_offering') ?: ''),
            'verified' => (bool) self::raw($post_id, 'provider_verified'),
            'offers_20_hour_ce' => (bool) self::raw($post_id, 'offers_20_hour_ce'),
            'offers_60_hour_qe' => (bool) self::raw($post_id, 'offers_60_hour_qe'),
            'ce' => $price('ce'),
            'qe' => $price('qe'),
            'features' => $features,
            'offers' => $offers,
            'google' => null,
            'last_checked' => self::ymd(self::raw($post_id, 'provider_data_last_checked')),
        ];
        if ((string) self::raw($post_id, 'google_rating_status') === 'Verified' && self::num(self::raw($post_id, 'google_rating'))) {
            $payload['google'] = [
                'rating' => (float) self::raw($post_id, 'google_rating'),
                'review_count' => (int) self::raw($post_id, 'google_review_count'),
                'maps_url' => (string) (self::raw($post_id, 'google_maps_url') ?: ''),
            ];
        }
        return $payload;
    }

    public static function all_payload(): array {
        $cached = get_transient(self::CACHE_KEY);
        if (is_array($cached)) return $cached;
        $ids = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'publish', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC', 'fields' => 'ids']);
        $data = [];
        foreach ($ids as $id) $data[] = self::public_payload((int) $id);
        $out = ['providers' => $data, 'count' => count($data), 'generated_at' => current_time('c')];
        set_transient(self::CACHE_KEY, $out, 12 * HOUR_IN_SECONDS);
        return $out;
    }
}
