<?php
defined('ABSPATH') || exit;

/** Matching, preview diffs, applying imports, change log and undo. */
final class TCFD_Importer {
    const LOG_TABLE = 'tcf_data_change_log';
    const BATCH_TABLE = 'tcfd_import_batches';
    const TRANSIENT = 'tcfd_preview_';

    public static function install_tables(): void {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $c = $wpdb->get_charset_collate();
        $log = $wpdb->prefix . self::LOG_TABLE;
        $bat = $wpdb->prefix . self::BATCH_TABLE;
        dbDelta("CREATE TABLE {$log} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            batch_id varchar(64) NOT NULL,
            provider_id bigint(20) unsigned NOT NULL,
            provider_name text NOT NULL,
            field_name varchar(191) NOT NULL,
            old_value longtext NULL,
            new_value longtext NULL,
            source_url text NULL,
            source_checked varchar(32) NULL,
            imported_by bigint(20) unsigned NOT NULL DEFAULT 0,
            imported_at datetime NOT NULL,
            PRIMARY KEY  (id),
            KEY provider_id (provider_id),
            KEY batch_id (batch_id),
            KEY field_name (field_name)
        ) {$c};");
        dbDelta("CREATE TABLE {$bat} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            batch_id varchar(64) NOT NULL,
            label varchar(255) NOT NULL DEFAULT '',
            created_at datetime NOT NULL,
            user_id bigint(20) unsigned NOT NULL DEFAULT 0,
            providers_updated int(11) NOT NULL DEFAULT 0,
            providers_created int(11) NOT NULL DEFAULT 0,
            changes int(11) NOT NULL DEFAULT 0,
            status varchar(20) NOT NULL DEFAULT 'applied',
            PRIMARY KEY  (id),
            UNIQUE KEY batch_id (batch_id)
        ) {$c};");
        update_option('tcfd_db_version', TCFD_VERSION);
    }

    /* ---------------- matching ---------------- */

    public static function norm_name(string $v): string {
        $v = html_entity_decode($v, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $v = strtolower($v);
        $v = preg_replace('/&/', ' and ', $v);
        $v = preg_replace('/[^a-z0-9 ]+/', ' ', $v);
        $v = preg_replace('/\b(inc|llc|ltd|corp|corporation|co|the|dba)\b/', ' ', $v);
        return trim(preg_replace('/\s+/', ' ', $v));
    }

    public static function domain(string $url): string {
        if ($url === '') return '';
        if (!preg_match('~^https?://~i', $url)) $url = 'https://' . $url;
        $h = strtolower((string) wp_parse_url($url, PHP_URL_HOST));
        return preg_replace('/^www\./', '', $h);
    }

    public static function index(): array {
        $posts = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => ['publish', 'draft', 'private', 'pending'], 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC']);
        $idx = ['ctec' => [], 'name' => [], 'domain' => [], 'titles' => []];
        foreach ($posts as $p) {
            $id = (int) $p->ID;
            $idx['titles'][$id] = $p->post_title . ($p->post_status !== 'publish' ? ' (' . $p->post_status . ')' : '');
            $names = array_merge([$p->post_title, (string) TCFD_Store::raw($id, 'provider_display_name')], TCFD_Store::aliases($id));
            foreach ($names as $n) { $k = self::norm_name((string) $n); if ($k !== '') $idx['name'][$k][$id] = $id; }
            $d = self::domain((string) TCFD_Store::raw($id, 'provider_website'));
            if ($d !== '') $idx['domain'][$d][$id] = $id;
            $c = strtolower(trim((string) TCFD_Store::raw($id, 'provider_ctec_number')));
            if ($c !== '') $idx['ctec'][$c][$id] = $id;
        }
        return $idx;
    }

    public static function match(array $rec, array $idx): array {
        $c = strtolower(trim($rec['ctec_number']));
        if ($c !== '' && !empty($idx['ctec'][$c]) && count($idx['ctec'][$c]) === 1) return ['status' => 'matched', 'post_id' => (int) current($idx['ctec'][$c]), 'method' => 'CTEC number'];
        $n = self::norm_name($rec['name']);
        if ($n !== '' && !empty($idx['name'][$n])) {
            if (count($idx['name'][$n]) === 1) return ['status' => 'matched', 'post_id' => (int) current($idx['name'][$n]), 'method' => 'name'];
            return ['status' => 'ambiguous', 'post_id' => 0, 'method' => 'several providers share this name', 'candidates' => array_values($idx['name'][$n])];
        }
        $d = self::domain($rec['website']);
        if ($d !== '' && !empty($idx['domain'][$d])) {
            if (count($idx['domain'][$d]) === 1) return ['status' => 'matched', 'post_id' => (int) current($idx['domain'][$d]), 'method' => 'website'];
            return ['status' => 'ambiguous', 'post_id' => 0, 'method' => 'several providers use ' . $d, 'candidates' => array_values($idx['domain'][$d])];
        }
        return ['status' => 'new', 'post_id' => 0, 'method' => 'not in the directory yet'];
    }

    /* ---------------- diffing ---------------- */

    private static function canon(string $name, $v): string {
        if ($v === null) return '';
        switch (TCFD_Fields::type($name)) {
            case 'bool': return ($v === '' ? '' : (empty($v) ? '0' : '1'));
            case 'number': return ($v === '' || !is_numeric($v)) ? '' : (string) (0 + $v);
            case 'date': return $v === '' ? '' : (TCFD_Normalizer::date($v) ?? (string) $v);
            default: return trim((string) $v);
        }
    }

    public static function display(string $name, $v): string {
        if ($v === null || $v === '') return '—';
        switch (TCFD_Fields::type($name)) {
            case 'bool': return empty($v) ? 'No' : 'Yes';
            case 'number': return is_numeric($v) ? (string) (0 + $v) : (string) $v;
            case 'date': $d = TCFD_Normalizer::date($v); return $d ? substr($d, 0, 4) . '-' . substr($d, 4, 2) . '-' . substr($d, 6, 2) : (string) $v;
            default: return (string) $v;
        }
    }

    /** Fill defaults on a brand-new offer row. */
    private static function finish_offer(array $c): array {
        if ($c['offer_active'] === '') $c['offer_active'] = 1;
        if ($c['offer_import_status'] === '') $c['offer_import_status'] = 'NEEDS REVIEW';
        return $c;
    }

    /** Same offer (code + course) is updated field by field; values the import leaves blank are kept. */
    private static function merge_offers(array $existing, array $incoming, bool $replace): array {
        $map = [];
        if (!$replace) foreach ($existing as $o) $map[TCFD_Normalizer::offer_identity($o)] = TCFD_Normalizer::canon_offer($o);
        foreach ($incoming as $o) {
            $id = TCFD_Normalizer::offer_identity($o);
            $c = TCFD_Normalizer::canon_offer($o);
            if (isset($map[$id])) {
                foreach ($c as $k => $val) if ($val !== '') $map[$id][$k] = $val;
            } else {
                $map[$id] = self::finish_offer($c);
            }
        }
        return array_values($map);
    }

    private static function offers_json(array $rows): string {
        return wp_json_encode(array_map([TCFD_Normalizer::class, 'canon_offer'], $rows));
    }

    /**
     * Changes a record would make to a provider (post 0 = new provider).
     * $opts: mode ('overwrite'|'fill_empty')
     */
    public static function diff(array $rec, int $post_id, array $opts): array {
        $changes = [];
        $fill = ($opts['mode'] ?? 'overwrite') === 'fill_empty';
        $labels = TCFD_Fields::scalars();
        foreach ($rec['fields'] as $name => $new) {
            $old = $post_id ? TCFD_Store::raw($post_id, $name) : null;
            $co = self::canon($name, $old);
            $cn = self::canon($name, $new);
            if ($co === $cn) continue;
            if (TCFD_Fields::type($name) === 'bool' && $co === '' && $cn === '0') continue;
            if ($fill && $co !== '' && !($co === '0' && TCFD_Fields::type($name) === 'bool')) continue;
            $changes[] = ['field' => $name, 'label' => $labels[$name][2] ?? $name, 'old' => $old, 'new' => $new];
        }
        foreach ($rec['clear'] as $name) {
            if (isset($rec['fields'][$name])) continue;
            $old = $post_id ? TCFD_Store::raw($post_id, $name) : null;
            if (self::canon($name, $old) === '') continue;
            $changes[] = ['field' => $name, 'label' => ($labels[$name][2] ?? $name) . ' (clear)', 'old' => $old, 'new' => null];
        }
        $offers = null;
        if (is_array($rec['offers'])) {
            $existing = $post_id ? TCFD_Store::offers($post_id) : [];
            $merged = self::merge_offers($existing, $rec['offers'], (bool) $rec['replace_offers']);
            if (self::offers_json($existing) !== self::offers_json($merged)) {
                $old_ids = array_map([TCFD_Normalizer::class, 'offer_identity'], $existing);
                $added = 0; $updated = 0;
                foreach ($rec['offers'] as $o) { in_array(TCFD_Normalizer::offer_identity($o), $old_ids, true) ? $updated++ : $added++; }
                $offers = ['old' => $existing, 'new' => $merged, 'added' => $added, 'updated' => $updated, 'removed' => max(0, count($existing) + $added - count($merged)), 'codes' => array_values(array_filter(array_map(fn($o) => $o['coupon_code'] ?? '', $rec['offers'])))];
            }
        }
        $aliases = [];
        if ($post_id) {
            $have = array_map([self::class, 'norm_name'], array_merge([get_the_title($post_id)], TCFD_Store::aliases($post_id)));
            foreach (array_merge([$rec['name']], $rec['aliases']) as $a) {
                if ($a !== '' && !in_array(self::norm_name($a), $have, true)) { $aliases[] = $a; $have[] = self::norm_name($a); }
            }
        } else {
            $aliases = $rec['aliases'];
        }
        $status = null;
        if ($post_id && $rec['listing'] === 'removed' && get_post_status($post_id) === 'publish') $status = 'draft';
        return ['fields' => $changes, 'offers' => $offers, 'aliases' => $aliases, 'status' => $status];
    }

    public static function count_changes(array $d): int {
        return count($d['fields']) + ($d['offers'] ? 1 : 0) + ($d['status'] ? 1 : 0) + (count($d['aliases']) ? 1 : 0);
    }

    /* ---------------- preview ---------------- */

    public static function preview(string $raw, string $label, array $opts): array {
        $parsed = TCFD_Normalizer::parse($raw);
        if ($parsed['errors']) return ['errors' => $parsed['errors']];
        $idx = self::index();
        $items = [];
        $seen = [];
        foreach ($parsed['records'] as $i => $rec) {
            $m = self::match($rec, $idx);
            $key = $m['post_id'] ? 'p' . $m['post_id'] : 'n' . self::norm_name($rec['name']);
            if (isset($seen[$key])) {
                $rec['warnings'][] = 'Appears more than once in this import; only the first copy is used.';
                $m = ['status' => 'duplicate', 'post_id' => 0, 'method' => 'duplicate'];
            }
            $seen[$key] = true;
            $items[] = ['rec' => $rec, 'match' => $m];
        }
        $batch = wp_generate_uuid4();
        set_transient(self::TRANSIENT . get_current_user_id() . '_' . $batch, ['items' => $items, 'label' => $label, 'opts' => $opts, 'warnings' => $parsed['warnings'], 'meta' => $parsed['meta']], 6 * HOUR_IN_SECONDS);
        return ['batch' => $batch];
    }

    public static function load_preview(string $batch): ?array {
        $d = get_transient(self::TRANSIENT . get_current_user_id() . '_' . sanitize_key($batch));
        return is_array($d) ? $d : null;
    }

    /* ---------------- apply ---------------- */

    /** $targets: item index => 'new' | 'skip' | post id */
    public static function apply(string $batch, array $targets): array {
        $pv = self::load_preview($batch);
        if (!$pv) return ['error' => 'This preview has expired. Paste the data again.'];
        $opts = $pv['opts'];
        $user = get_current_user_id();
        $res = ['updated' => 0, 'created' => 0, 'changes' => 0, 'skipped' => 0, 'drafted' => 0, 'batch' => $batch];
        $touched = [];
        $now = current_time('Y-m-d H:i:s');

        foreach ($pv['items'] as $i => $item) {
            $t = $targets[$i] ?? 'skip';
            $rec = $item['rec'];
            if ($t === 'skip' || $t === '' || $item['match']['status'] === 'duplicate') { $res['skipped']++; continue; }
            $post_id = 0;
            if ($t === 'new') {
                if (empty($opts['create'])) { $res['skipped']++; continue; }
                $title = $rec['name'] !== '' ? $rec['name'] : self::domain($rec['website']);
                $post_id = wp_insert_post(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'publish', 'post_title' => $title], true);
                if (is_wp_error($post_id)) { $res['skipped']++; continue; }
                $post_id = (int) $post_id;
                self::log($batch, $post_id, $title, '__created', '', (string) $post_id, $rec['website']);
                $res['created']++;
            } else {
                $post_id = (int) $t;
                if (get_post_type($post_id) !== TCFD_Plugin::POST_TYPE) { $res['skipped']++; continue; }
            }
            $touched[$post_id] = true;
            $name = get_the_title($post_id);
            $d = self::diff($rec, $post_id, $opts);
            $n = 0;
            foreach ($d['fields'] as $ch) {
                TCFD_Store::set($post_id, $ch['field'], $ch['new']);
                self::log($batch, $post_id, $name, $ch['field'], self::str($ch['old']), self::str($ch['new']), self::source_for($ch['field'], $rec));
                $n++;
            }
            if ($d['offers']) {
                TCFD_Store::set($post_id, 'provider_offers', $d['offers']['new'] ?: null);
                self::log($batch, $post_id, $name, 'provider_offers', wp_json_encode(array_map([TCFD_Normalizer::class, 'canon_offer'], $d['offers']['old'])), wp_json_encode($d['offers']['new']), '');
                $n++;
            }
            if ($d['aliases']) {
                $old = TCFD_Store::aliases($post_id);
                $rows = array_map(fn($a) => ['alias' => $a], array_merge($old, $d['aliases']));
                TCFD_Store::set($post_id, 'provider_aliases', $rows);
                self::log($batch, $post_id, $name, 'provider_aliases', wp_json_encode($old), wp_json_encode(array_merge($old, $d['aliases'])), '');
                $n++;
            }
            if ($d['status']) {
                $old = get_post_status($post_id);
                wp_update_post(['ID' => $post_id, 'post_status' => $d['status']]);
                self::log($batch, $post_id, $name, '__status', $old, $d['status'], '');
                $res['drafted']++;
                $n++;
            }
            if ($n) {
                TCFD_Store::set($post_id, 'last_chat_scan_at', $now);
                if ($t !== 'new') $res['updated']++;
            }
            $res['changes'] += $n;
            TCFD_Store::flush_cache($post_id);
        }

        if (!empty($opts['draft_missing'])) {
            $ids = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids']);
            foreach ($ids as $id) {
                if (isset($touched[$id])) continue;
                wp_update_post(['ID' => $id, 'post_status' => 'draft']);
                self::log($batch, (int) $id, get_the_title($id), '__status', 'publish', 'draft', 'not in import');
                $res['drafted']++;
                $res['changes']++;
            }
        }

        global $wpdb;
        $wpdb->replace($wpdb->prefix . self::BATCH_TABLE, [
            'batch_id' => $batch, 'label' => mb_substr($pv['label'], 0, 250), 'created_at' => current_time('mysql'), 'user_id' => $user,
            'providers_updated' => $res['updated'], 'providers_created' => $res['created'], 'changes' => $res['changes'], 'status' => 'applied',
        ]);
        delete_transient(self::TRANSIENT . $user . '_' . $batch);
        TCFD_Store::flush_cache();
        return $res;
    }

    private static function str($v): string {
        if ($v === null) return '';
        if (is_bool($v)) return $v ? '1' : '0';
        if (is_array($v)) return wp_json_encode($v);
        return (string) $v;
    }

    private static function source_for(string $field, array $rec): string {
        $f = $rec['fields'];
        if (str_starts_with($field, 'ce_')) return (string) ($f['ce_price_source_url'] ?? '');
        if (str_starts_with($field, 'qe_')) return (string) ($f['qe_price_source_url'] ?? '');
        if (str_starts_with($field, 'google_')) return (string) ($f['google_maps_url'] ?? '');
        if (isset(TCFD_Fields::feature_keys()[$field])) return (string) ($f['features_source_url'] ?? $rec['website']);
        return $rec['website'];
    }

    private static function log(string $batch, int $post_id, string $name, string $field, string $old, string $new, string $source): void {
        global $wpdb;
        $wpdb->insert($wpdb->prefix . self::LOG_TABLE, [
            'batch_id' => $batch, 'provider_id' => $post_id, 'provider_name' => $name, 'field_name' => $field,
            'old_value' => $old, 'new_value' => $new, 'source_url' => $source, 'source_checked' => current_time('Y-m-d'),
            'imported_by' => get_current_user_id(), 'imported_at' => current_time('mysql'),
        ], ['%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s']);
    }

    /* ---------------- history / undo ---------------- */

    public static function batches(int $limit = 50): array {
        global $wpdb;
        $t = $wpdb->prefix . self::BATCH_TABLE;
        return $wpdb->get_results($wpdb->prepare("SELECT * FROM {$t} ORDER BY id DESC LIMIT %d", $limit));
    }

    public static function batch_rows(string $batch): array {
        global $wpdb;
        $t = $wpdb->prefix . self::LOG_TABLE;
        return $wpdb->get_results($wpdb->prepare("SELECT * FROM {$t} WHERE batch_id = %s ORDER BY id DESC", $batch));
    }

    public static function undo(string $batch): array {
        global $wpdb;
        $rows = self::batch_rows($batch);
        $n = 0;
        foreach ($rows as $r) {
            $id = (int) $r->provider_id;
            if (!get_post($id)) continue;
            switch ($r->field_name) {
                case '__created':
                    wp_trash_post($id);
                    break;
                case '__status':
                    wp_update_post(['ID' => $id, 'post_status' => $r->old_value ?: 'publish']);
                    break;
                case 'provider_offers':
                    $old = json_decode((string) $r->old_value, true);
                    TCFD_Store::set($id, 'provider_offers', is_array($old) && $old ? $old : null);
                    break;
                case 'provider_aliases':
                    $old = json_decode((string) $r->old_value, true);
                    TCFD_Store::set($id, 'provider_aliases', is_array($old) && $old ? array_map(fn($a) => ['alias' => $a], $old) : null);
                    break;
                default:
                    if (!isset(TCFD_Fields::scalars()[$r->field_name])) continue 2;
                    TCFD_Store::set($id, $r->field_name, $r->old_value === '' ? null : $r->old_value);
            }
            $n++;
        }
        $wpdb->update($wpdb->prefix . self::BATCH_TABLE, ['status' => 'undone'], ['batch_id' => $batch]);
        TCFD_Store::flush_cache();
        return ['reverted' => $n];
    }

    /* ---------------- export ---------------- */

    public static function export_records(bool $include_drafts = true): array {
        $posts = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => $include_drafts ? ['publish', 'draft', 'private'] : 'publish', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC']);
        $out = [];
        foreach ($posts as $p) {
            $id = (int) $p->ID;
            $r = fn($n) => TCFD_Store::raw($id, $n);
            $num = fn($v) => ($v === '' || $v === null || !is_numeric($v)) ? null : 0 + $v;
            $date = fn($v) => $v ? self::display('provider_data_last_checked', $v) : null;
            $price = function ($p) use ($r, $num, $date) {
                return ['price' => $num($r($p . '_current_price')), 'regular_price' => $num($r($p . '_regular_price')), 'display_price' => $r($p . '_price_display_text') ?: null,
                        'price_type' => $r($p . '_price_type') ?: null, 'price_status' => $r($p . '_price_status') ?: null, 'course_url' => $r($p . '_course_url') ?: null,
                        'source_url' => $r($p . '_price_source_url') ?: null, 'notes' => $r($p . '_price_notes') ?: null, 'last_checked' => $date($r($p . '_price_last_checked'))];
            };
            $features = [];
            foreach (TCFD_Fields::feature_keys() as $k => $l) { $v = $r($k); $features[$k] = $v === '' || $v === null ? null : (bool) $v; }
            $offers = array_map(function ($o) use ($num) {
                $c = TCFD_Normalizer::canon_offer($o);
                $d = fn($v) => $v ? substr($v, 0, 4) . '-' . substr($v, 4, 2) . '-' . substr($v, 6, 2) : null;
                return ['type' => $c['offer_type'], 'scope' => $c['offer_course_scope'], 'title' => $c['offer_title'], 'coupon_code' => $c['coupon_code'] ?: null,
                        'discount_type' => $c['discount_type'] ?: null, 'discount_amount' => $num($c['discount_amount']), 'regular_price' => $num($c['offer_regular_price']),
                        'sale_price' => $num($c['offer_sale_price']), 'description' => $c['offer_description'] ?: null, 'start_date' => $d($c['offer_start_date']),
                        'expires' => $d($c['offer_expiration_date']), 'source_url' => $c['offer_source_url'] ?: null, 'last_verified' => $d($c['offer_last_verified']),
                        'status' => $c['offer_import_status'], 'active' => (bool) $c['offer_active']];
            }, TCFD_Store::offers($id));
            $out[] = [
                'provider_name' => $p->post_title,
                'display_name' => $r('provider_display_name') ?: null,
                'aliases' => TCFD_Store::aliases($id),
                'ctec_provider_number' => $r('provider_ctec_number') ?: null,
                'website' => $r('provider_website') ?: null,
                'listing_status' => $p->post_status === 'publish' ? 'active' : 'hidden',
                'offers_20_hour_ce' => (bool) $r('offers_20_hour_ce'),
                'offers_60_hour_qe' => (bool) $r('offers_60_hour_qe'),
                'ce' => $price('ce'),
                'qe' => $price('qe'),
                'features' => $features,
                'offers' => $offers,
                'google' => ['rating' => $num($r('google_rating')), 'review_count' => $num($r('google_review_count')), 'maps_url' => $r('google_maps_url') ?: null,
                             'profile_name' => $r('google_business_profile_name') ?: null, 'status' => $r('google_rating_status') ?: null, 'last_checked' => $date($r('google_rating_last_checked'))],
                'last_checked' => $date($r('provider_data_last_checked')),
            ];
        }
        return $out;
    }
}
