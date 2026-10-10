<?php
defined('ABSPATH') || exit;

/**
 * Turns pasted/uploaded research (JSON schema 2.0, legacy schema 1.0, or CSV) into
 * normalized provider records:
 *   name, website, ctec_number, aliases[], fields[name=>value], offers[]|null,
 *   replace_offers, clear[], listing ('active'|'removed'|null), notes, warnings[]
 * A null value means "unknown – leave the existing value alone".
 */
final class TCFD_Normalizer {

    /** Friendly import keys => feature meta keys. */
    public static function feature_aliases(): array {
        $map = [];
        foreach (TCFD_Fields::feature_keys() as $k => $label) {
            $map[$k] = $k;
            $map[self::slug($label)] = $k;
            $map[preg_replace('/_available$/', '', $k)] = $k;
        }
        $map += [
            'online' => 'online_course_available', 'in_person' => 'in_person_course_available', 'inperson' => 'in_person_course_available',
            'classroom' => 'in_person_course_available', 'live' => 'live_instruction_available', 'live_online' => 'live_instruction_available',
            'live_class' => 'live_instruction_available', 'webinar' => 'live_instruction_available', 'self_paced_course' => 'self_paced',
            'physical_book' => 'physical_book_available', 'printed_book' => 'physical_book_available', 'print_book' => 'physical_book_available', 'textbook' => 'physical_book_available',
            'digital_book' => 'digital_book_available', 'ebook' => 'digital_book_available', 'e_book' => 'digital_book_available', 'pdf' => 'downloadable_materials',
            'downloadable' => 'downloadable_materials', 'video' => 'video_lessons_available', 'videos' => 'video_lessons_available', 'video_lessons' => 'video_lessons_available',
            'text' => 'text_based_course_available', 'text_based' => 'text_based_course_available', 'reading' => 'text_based_course_available',
            'audio' => 'audio_content_available', 'podcast' => 'audio_content_available', 'phone' => 'phone_support', 'email' => 'email_support',
            'chat' => 'live_chat_support', 'live_chat' => 'live_chat_support', 'practice_exam' => 'practice_exams', 'practice_tests' => 'practice_exams',
            'progress' => 'progress_tracking', 'mobile' => 'mobile_friendly', 'mobile_app' => 'mobile_friendly', 'desktop' => 'desktop_access',
        ];
        return $map;
    }

    public static function slug(string $s): string {
        return trim(preg_replace('/[^a-z0-9]+/', '_', strtolower($s)), '_');
    }

    /** Parse raw text (JSON or CSV). Returns ['records'=>[], 'errors'=>[], 'warnings'=>[], 'format'=>string, 'meta'=>[]]. */
    public static function parse(string $raw): array {
        $raw = trim(preg_replace('/^\xEF\xBB\xBF/', '', $raw));
        $out = ['records' => [], 'errors' => [], 'warnings' => [], 'format' => '', 'meta' => []];
        if ($raw === '') {
            $out['errors'][] = 'Nothing to import – paste the data from ChatGPT or choose a file.';
            return $out;
        }
        // ChatGPT often wraps output in ``` fences or adds a sentence before/after.
        if (preg_match('/```(?:json|csv)?\s*(.*?)```/is', $raw, $m)) $raw = trim($m[1]);

        $first = $raw[0];
        if ($first !== '{' && $first !== '[') {
            $js = self::extract_json($raw);
            if ($js !== null) $raw = $js;
        }
        if ($raw !== '' && ($raw[0] === '{' || $raw[0] === '[')) {
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                $out['errors'][] = 'The JSON could not be read (' . json_last_error_msg() . '). Ask ChatGPT to “return only valid JSON”, or check the end of the paste was not cut off.';
                return $out;
            }
            $out['format'] = 'json';
            $list = $data;
            if (isset($data['providers']) && is_array($data['providers'])) {
                $list = $data['providers'];
                $out['meta'] = array_diff_key($data, ['providers' => 1]);
            } elseif (!array_is_list($data)) {
                $list = [$data];
            }
            foreach ($list as $i => $row) {
                if (!is_array($row)) { $out['warnings'][] = 'Item #' . ($i + 1) . ' is not an object and was ignored.'; continue; }
                $rec = isset($row['fields']) && is_array($row['fields']) ? self::from_v1($row) : self::from_v2($row);
                if ($rec['name'] === '' && $rec['website'] === '' && $rec['ctec_number'] === '') {
                    $out['warnings'][] = 'Item #' . ($i + 1) . ' has no provider_name, website or CTEC number and was ignored.';
                    continue;
                }
                $out['records'][] = $rec;
            }
            return $out;
        }

        $rows = self::csv_rows($raw);
        if (count($rows) < 2) {
            $out['errors'][] = 'This does not look like JSON or a CSV with a header row.';
            return $out;
        }
        $out['format'] = 'csv';
        $head = array_map(fn($h) => self::slug((string) $h), array_shift($rows));
        if (!in_array('provider_name', $head, true) && !in_array('name', $head, true)) {
            $out['errors'][] = 'The CSV needs a “provider_name” column.';
            return $out;
        }
        foreach ($rows as $n => $cells) {
            if (!array_filter($cells, fn($c) => trim((string) $c) !== '')) continue;
            $row = [];
            foreach ($head as $i => $h) if ($h !== '') $row[$h] = isset($cells[$i]) ? trim((string) $cells[$i]) : '';
            $rec = self::from_v2(self::csv_to_v2($row));
            if ($rec['name'] === '' && $rec['website'] === '') { $out['warnings'][] = 'CSV row ' . ($n + 2) . ' has no provider name and was ignored.'; continue; }
            $out['records'][] = $rec;
        }
        return $out;
    }

    private static function extract_json(string $s): ?string {
        $a = strpos($s, '{'); $b = strpos($s, '[');
        $start = $a === false ? $b : ($b === false ? $a : min($a, $b));
        if ($start === false) return null;
        $end = max(strrpos($s, '}') ?: 0, strrpos($s, ']') ?: 0);
        if ($end <= $start) return null;
        $cand = substr($s, $start, $end - $start + 1);
        return is_array(json_decode($cand, true)) ? $cand : null;
    }

    private static function csv_rows(string $raw): array {
        $fh = fopen('php://temp', 'r+');
        fwrite($fh, $raw);
        rewind($fh);
        $first = strtok($raw, "\n");
        $delim = substr_count($first, "\t") > substr_count($first, ',') ? "\t" : (substr_count($first, ';') > substr_count($first, ',') ? ';' : ',');
        $rows = [];
        while (($r = fgetcsv($fh, 0, $delim, '"', '\\')) !== false) $rows[] = $r;
        fclose($fh);
        return $rows;
    }

    /** Flat CSV row => schema 2.0 object. */
    private static function csv_to_v2(array $r): array {
        $o = [];
        $take = function (string $k) use ($r) { return isset($r[$k]) && $r[$k] !== '' ? $r[$k] : null; };
        foreach (['provider_name', 'name', 'display_name', 'website', 'ctec_provider_number', 'offers_20_hour_ce', 'offers_60_hour_qe', 'last_checked', 'notes', 'listing_status', 'aliases', 'features_source_url', 'replace_offers'] as $k) {
            if ($take($k) !== null) $o[$k] = $take($k);
        }
        if (isset($o['aliases'])) $o['aliases'] = array_map('trim', preg_split('/[|;]/', $o['aliases']));
        foreach (['ce', 'qe'] as $p) {
            foreach (['price', 'regular_price', 'display_price', 'price_type', 'price_status', 'course_url', 'source_url', 'notes', 'last_checked'] as $k) {
                if ($take($p . '_' . $k) !== null) $o[$p][$k] = $take($p . '_' . $k);
            }
        }
        foreach (['rating', 'review_count', 'maps_url', 'profile_name', 'status', 'last_checked'] as $k) {
            if ($take('google_' . $k) !== null) $o['google'][$k] = $take('google_' . $k);
        }
        $fa = self::feature_aliases();
        foreach ($r as $k => $v) {
            $kk = preg_replace('/^feature_/', '', $k);
            if (isset($fa[$kk]) && $v !== '') $o['features'][$kk] = $v;
        }
        for ($i = 1; $i <= 10; $i++) {
            $off = [];
            foreach (['type', 'scope', 'title', 'coupon_code', 'discount_type', 'discount_amount', 'regular_price', 'sale_price', 'description', 'start_date', 'expires', 'source_url', 'last_verified', 'verified', 'status', 'active'] as $k) {
                $v = $take('offer' . $i . '_' . $k);
                if ($v !== null) $off[$k] = $v;
            }
            if ($off) $o['offers'][] = $off;
        }
        return $o;
    }

    private static function blank_record(): array {
        return ['name' => '', 'display_name' => null, 'website' => '', 'ctec_number' => '', 'aliases' => [], 'fields' => [], 'offers' => null,
                'replace_offers' => false, 'clear' => [], 'listing' => null, 'notes' => '', 'warnings' => []];
    }

    public static function bool($v): ?bool {
        if (is_bool($v)) return $v;
        if ($v === null || $v === '') return null;
        if (is_numeric($v)) return ((float) $v) > 0;
        $s = strtolower(trim((string) $v));
        if (in_array($s, ['yes', 'y', 'true', 't', 'on', 'x', '✓', 'available', 'offered', 'included'], true)) return true;
        if (in_array($s, ['no', 'n', 'false', 'f', 'off', 'none', 'not available', 'not offered'], true)) return false;
        return null; // "unknown", "n/a", "unclear" ...
    }

    public static function money($v): ?float {
        if ($v === null || $v === '' || is_bool($v)) return null;
        if (is_numeric($v)) return round((float) $v, 2);
        $s = str_replace([',', '$', 'USD', ' '], '', (string) $v);
        return is_numeric($s) ? round((float) $s, 2) : null;
    }

    public static function date($v): ?string {
        if ($v === null || $v === '') return null;
        $s = trim((string) $v);
        if (preg_match('/^\d{8}$/', $s)) return $s;
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})/', $s, $m)) return sprintf('%04d%02d%02d', $m[1], $m[2], $m[3]);
        if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})$#', $s, $m)) return sprintf('%04d%02d%02d', $m[3], $m[1], $m[2]);
        $t = strtotime($s);
        return $t ? gmdate('Ymd', $t) : null;
    }

    public static function url($v): ?string {
        if ($v === null || $v === '' || !is_string($v)) return null;
        $s = trim($v);
        if (!preg_match('~^https?://~i', $s)) {
            if (!preg_match('/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i', $s)) return null;
            $s = 'https://' . $s;
        }
        $s = esc_url_raw($s);
        return $s !== '' ? $s : null;
    }

    private static function text($v): ?string {
        if ($v === null || is_array($v) || is_bool($v)) return null;
        $s = sanitize_text_field((string) $v);
        return $s === '' ? null : $s;
    }

    private static function textarea($v): ?string {
        if ($v === null || is_array($v) || is_bool($v)) return null;
        $s = sanitize_textarea_field((string) $v);
        return $s === '' ? null : $s;
    }

    private static function choice($v, array $choices, array $loose = []): ?string {
        if ($v === null || $v === '') return null;
        $s = trim((string) $v);
        foreach ($choices as $k => $l) if (strcasecmp($k, $s) === 0 || strcasecmp($l, $s) === 0) return $k;
        $slug = self::slug($s);
        foreach ($choices as $k => $l) if (self::slug($k) === $slug || self::slug($l) === $slug) return $k;
        return $loose[$slug] ?? null;
    }

    /** Store one scalar after type coercion; returns warning text if the value was unusable. */
    private static function put(array &$rec, string $name, $value): void {
        if ($value === null || $value === '') return;
        $type = TCFD_Fields::type($name);
        $clean = null;
        switch ($type) {
            case 'bool': $clean = self::bool($value); if ($clean !== null) $clean = $clean ? 1 : 0; break;
            case 'number': $clean = self::money($value); break;
            case 'date': $clean = self::date($value); break;
            case 'url': $clean = self::url($value); break;
            case 'textarea': $clean = self::textarea($value); break;
            case 'select':
                $choices = [
                    'ce_price_type' => TCFD_Fields::CE_PRICE_TYPES, 'qe_price_type' => TCFD_Fields::QE_PRICE_TYPES,
                    'ce_price_status' => TCFD_Fields::PRICE_STATUS, 'qe_price_status' => TCFD_Fields::PRICE_STATUS,
                    'google_rating_status' => TCFD_Fields::GOOGLE_STATUS, 'google_match_confidence' => ['HIGH' => 'HIGH', 'MEDIUM' => 'MEDIUM', 'LOW' => 'LOW'],
                    'ctec_offering' => ['QE + CE' => 'QE + CE', 'QE' => 'QE', 'CE' => 'CE'],
                ][$name] ?? [];
                $loose = ['verified' => 'VERIFIED', 'confirmed' => 'VERIFIED', 'needs_review' => 'REVIEW', 'unverified' => 'REVIEW', 'needs_rescan' => 'NEEDS_RESCAN',
                          'unknown' => 'NEEDS_RESCAN', 'complete_package' => 'package', 'flat' => 'package', 'sale' => 'package_sale', 'no_public_price' => 'not_public',
                          'not_published' => 'not_public', 'hidden' => 'Do Not Display', 'do_not_display' => 'Do Not Display', 'manual' => 'Manual Review',
                          'qe_ce' => 'QE + CE', 'ce_qe' => 'QE + CE', 'both' => 'QE + CE'];
                $clean = self::choice($value, $choices, $loose);
                if ($clean === null && in_array($name, ['ce_price_type', 'qe_price_type'], true)) $clean = 'other';
                break;
            default: $clean = self::text($value);
        }
        if ($clean === null) {
            $rec['warnings'][] = TCFD_Fields::scalars()[$name][2] . ': could not use “' . (is_scalar($value) ? (string) $value : json_encode($value)) . '”';
            return;
        }
        $rec['fields'][$name] = $clean;
    }

    /** Legacy schema 1.0 record (provider_name, website, fields{}, offers[], clear_fields[], replace_offers). */
    private static function from_v1(array $row): array {
        $rec = self::blank_record();
        $rec['name'] = self::text($row['provider_name'] ?? '') ?? '';
        $rec['website'] = self::url($row['website'] ?? null) ?? '';
        $known = TCFD_Fields::scalars();
        foreach ($row['fields'] as $k => $v) {
            $k = sanitize_key($k);
            if (isset($known[$k])) self::put($rec, $k, $v);
            else $rec['warnings'][] = 'Unknown field “' . $k . '” ignored.';
        }
        if (!empty($row['features']) && is_array($row['features'])) self::features($rec, $row['features']);
        if ($rec['website'] !== '' && empty($rec['fields']['provider_website'])) $rec['fields']['provider_website'] = $rec['website'];
        $rec['ctec_number'] = (string) ($rec['fields']['provider_ctec_number'] ?? '');
        if (isset($row['offers']) && is_array($row['offers'])) $rec['offers'] = self::offers($rec, $row['offers']);
        $rec['replace_offers'] = !empty($row['replace_offers']);
        $rec['clear'] = isset($row['clear_fields']) && is_array($row['clear_fields']) ? array_values(array_intersect(array_map('sanitize_key', $row['clear_fields']), array_keys($known))) : [];
        if (!empty($rec['fields']['provider_display_name'])) $rec['display_name'] = $rec['fields']['provider_display_name'];
        return $rec;
    }

    /** Schema 2.0 record (see the ChatGPT prompt). */
    private static function from_v2(array $row): array {
        $rec = self::blank_record();
        $g = fn($k) => $row[$k] ?? null;
        $rec['name'] = self::text($g('provider_name') ?? $g('name') ?? '') ?? '';
        $rec['website'] = self::url($g('website')) ?? '';
        $rec['ctec_number'] = self::text($g('ctec_provider_number') ?? $g('ctec_number')) ?? '';
        if ($rec['website'] !== '') $rec['fields']['provider_website'] = $rec['website'];
        if ($rec['ctec_number'] !== '') $rec['fields']['provider_ctec_number'] = $rec['ctec_number'];
        if ($g('display_name')) { self::put($rec, 'provider_display_name', $g('display_name')); $rec['display_name'] = $rec['fields']['provider_display_name'] ?? null; }
        if (is_array($g('aliases'))) $rec['aliases'] = array_values(array_filter(array_map(fn($a) => self::text($a), $g('aliases'))));
        self::put($rec, 'offers_20_hour_ce', $g('offers_20_hour_ce') ?? $g('offers_ce'));
        self::put($rec, 'offers_60_hour_qe', $g('offers_60_hour_qe') ?? $g('offers_qe'));
        self::put($rec, 'provider_data_last_checked', $g('last_checked'));
        self::put($rec, 'features_source_url', $g('features_source_url'));

        foreach (['ce', 'qe'] as $p) {
            $c = $g($p);
            if (!is_array($c)) continue;
            self::put($rec, $p . '_current_price', $c['price'] ?? $c['current_price'] ?? null);
            self::put($rec, $p . '_regular_price', $c['regular_price'] ?? null);
            self::put($rec, $p . '_price_display_text', $c['display_price'] ?? null);
            self::put($rec, $p . '_price_type', $c['price_type'] ?? null);
            self::put($rec, $p . '_price_status', $c['price_status'] ?? null);
            self::put($rec, $p . '_course_url', $c['course_url'] ?? null);
            self::put($rec, $p . '_price_source_url', $c['source_url'] ?? null);
            self::put($rec, $p . '_price_notes', $c['notes'] ?? null);
            $has_price_info = false;
            foreach (['price', 'current_price', 'regular_price', 'display_price', 'price_type', 'price_status'] as $pk) if (isset($c[$pk]) && $c[$pk] !== '' && $c[$pk] !== null) $has_price_info = true;
            self::put($rec, $p . '_price_last_checked', $c['last_checked'] ?? ($has_price_info ? $g('last_checked') : null));
            // A price with no display text still needs something to show.
            if (isset($rec['fields'][$p . '_current_price']) && !isset($rec['fields'][$p . '_price_display_text'])) {
                $v = $rec['fields'][$p . '_current_price'];
                $rec['fields'][$p . '_price_display_text'] = '$' . (floor($v) == $v ? number_format($v, 0, '.', '') : number_format($v, 2, '.', ''));
            }
            if (isset($rec['fields'][$p . '_current_price']) && !isset($rec['fields'][$p . '_price_status'])) {
                $rec['fields'][$p . '_price_status'] = !empty($rec['fields'][$p . '_price_source_url']) ? 'VERIFIED' : 'REVIEW';
            }
        }
        if (is_array($g('features'))) self::features($rec, $g('features'));
        $gg = $g('google');
        if (is_array($gg)) {
            self::put($rec, 'google_rating', $gg['rating'] ?? null);
            self::put($rec, 'google_review_count', $gg['review_count'] ?? $gg['reviews'] ?? null);
            self::put($rec, 'google_maps_url', $gg['maps_url'] ?? $gg['url'] ?? null);
            self::put($rec, 'google_business_profile_name', $gg['profile_name'] ?? null);
            self::put($rec, 'google_rating_last_checked', $gg['last_checked'] ?? $g('last_checked'));
            $status = $gg['status'] ?? (isset($rec['fields']['google_rating']) ? (self::bool($gg['verified'] ?? null) === true ? 'Verified' : 'Manual Review') : null);
            self::put($rec, 'google_rating_status', $status);
        }
        if (array_key_exists('offers', $row) && is_array($row['offers'])) $rec['offers'] = self::offers($rec, $row['offers']);
        $rec['replace_offers'] = self::bool($g('replace_offers')) === true;
        $ls = strtolower((string) ($g('listing_status') ?? ''));
        if ($ls !== '') $rec['listing'] = preg_match('/remov|delist|inactive|not_listed|closed/', $ls) ? 'removed' : 'active';
        if (($n = self::textarea($g('notes'))) !== null) $rec['notes'] = $n;
        if (is_array($g('clear_fields'))) $rec['clear'] = array_values(array_intersect(array_map('sanitize_key', $g('clear_fields')), array_keys(TCFD_Fields::scalars())));
        return $rec;
    }

    private static function features(array &$rec, array $in): void {
        $map = self::feature_aliases();
        // Also accept a list of names: ["Online Course", "Self-Paced"] = those are true (others unknown).
        if (array_is_list($in)) {
            foreach ($in as $name) {
                $k = $map[self::slug((string) $name)] ?? null;
                if ($k) $rec['fields'][$k] = 1; else $rec['warnings'][] = 'Unknown feature “' . $name . '” ignored.';
            }
            return;
        }
        foreach ($in as $name => $v) {
            if (is_array($v)) { // grouped: {"delivery_format": {"online_course": true}}
                self::features($rec, $v);
                continue;
            }
            $k = $map[self::slug((string) $name)] ?? null;
            if (!$k) { if (!in_array(self::slug((string) $name), ['source_url', 'last_checked'], true)) $rec['warnings'][] = 'Unknown feature “' . $name . '” ignored.'; continue; }
            $b = self::bool($v);
            if ($b !== null) $rec['fields'][$k] = $b ? 1 : 0;
        }
        if (isset($in['source_url'])) self::put($rec, 'features_source_url', $in['source_url']);
        if (isset($in['last_checked'])) self::put($rec, 'features_last_checked', $in['last_checked']);
    }

    /** Offers in either schema => ACF row arrays (sub-field names, dates Ymd). */
    public static function offers(array &$rec, array $list): array {
        $out = [];
        foreach ($list as $o) {
            if (!is_array($o)) continue;
            $v = function (...$keys) use ($o) {
                foreach ($keys as $k) if (isset($o[$k]) && $o[$k] !== '') return $o[$k];
                return null;
            };
            $type = self::choice($v('offer_type', 'type'), TCFD_Fields::OFFER_TYPES, ['coupon' => 'Coupon Code', 'code' => 'Coupon Code', 'promo_code' => 'Coupon Code', 'discount' => 'Special Offer', 'member' => 'Member Offer', 'bundle' => 'Special Offer', 'free' => 'Special Offer']) ?? (self::text($v('coupon_code', 'code')) ? 'Coupon Code' : 'Special Offer');
            $scope_in = (string) ($v('offer_course_scope', 'scope', 'applies_to') ?? '');
            $sc = TCFD_Store::scope_code($scope_in);
            $scope = ['ce' => '20-Hour CE', 'qe' => '60-Hour QE', 'both' => 'Both', 'other' => 'Other'][$sc];
            if ($scope_in === '') $scope = 'Both';
            $code = self::text($v('coupon_code', 'code'));
            $source = self::url($v('offer_source_url', 'source_url'));
            // '' = not stated: keeps an existing offer's status, new offers become NEEDS REVIEW.
            $status = $v('offer_import_status', 'status');
            $verified = self::bool($v('verified'));
            if ($status !== null) {
                $status = strtoupper(sanitize_text_field((string) $status));
                if (!isset(TCFD_Fields::OFFER_STATUSES[$status])) $status = str_starts_with($status, 'VERIFIED') ? 'VERIFIED' : 'NEEDS REVIEW';
            } elseif ($verified === true && $source) {
                $status = $type === 'Member Offer' ? 'VERIFIED MEMBER OFFER' : ($code ? 'VERIFIED PUBLIC CODE' : 'VERIFIED PUBLIC OFFER');
            } elseif ($verified === false) {
                $status = 'NEEDS REVIEW';
            } else {
                $status = '';
            }
            if ($code && !$source) $rec['warnings'][] = 'Coupon ' . $code . ' has no source URL – saved as NEEDS REVIEW (hidden) until you check it.';
            $row = [
                'offer_active' => ($act = self::bool($v('offer_active', 'active'))) === null ? '' : ($act ? 1 : 0),
                'offer_type' => $type,
                'offer_course_scope' => $scope,
                'offer_title' => self::text($v('offer_title', 'title')) ?? ($code ? $code . ' coupon' : $type),
                'coupon_code' => $code ?? '',
                'discount_type' => self::choice($v('discount_type'), TCFD_Fields::DISCOUNT_TYPES, ['percentage' => 'Percent', 'pct' => 'Percent', 'amount' => 'Dollar', 'fixed' => 'Dollar', 'sale' => 'Sale Price', 'text' => 'Text Offer']) ?? '',
                'discount_amount' => self::money($v('discount_amount', 'discount')),
                'offer_regular_price' => self::money($v('offer_regular_price', 'regular_price')),
                'offer_sale_price' => self::money($v('offer_sale_price', 'sale_price', 'price_with_offer')),
                'offer_description' => self::textarea($v('offer_description', 'description', 'terms')) ?? '',
                'offer_start_date' => self::date($v('offer_start_date', 'start_date')) ?? '',
                'offer_expiration_date' => self::date($v('offer_expiration_date', 'expires', 'expiration_date', 'expiry')) ?? '',
                'offer_source_url' => $source ?? '',
                'offer_last_verified' => self::date($v('offer_last_verified', 'last_verified', 'last_checked')) ?? '',
                'offer_import_status' => $status,
            ];
            if ($row['discount_type'] === '' && $row['offer_sale_price'] !== null) $row['discount_type'] = 'Sale Price';
            foreach (['discount_amount', 'offer_regular_price', 'offer_sale_price'] as $k) if ($row[$k] === null) $row[$k] = '';
            $out[] = $row;
        }
        return $out;
    }

    /** Canonical form of an offer row for comparison and matching. */
    public static function canon_offer(array $o): array {
        $keys = ['offer_active', 'offer_type', 'offer_course_scope', 'offer_title', 'coupon_code', 'discount_type', 'discount_amount', 'offer_regular_price',
                 'offer_sale_price', 'offer_description', 'offer_start_date', 'offer_expiration_date', 'offer_source_url', 'offer_last_verified', 'offer_import_status'];
        $c = [];
        foreach ($keys as $k) {
            $v = $o[$k] ?? '';
            if ($k === 'offer_active') $v = ($v === '' || $v === null) ? '' : (empty($v) ? 0 : 1);
            elseif (in_array($k, ['discount_amount', 'offer_regular_price', 'offer_sale_price'], true)) $v = ($v === '' || $v === null || !is_numeric($v)) ? '' : (string) (0 + $v);
            elseif (in_array($k, ['offer_start_date', 'offer_expiration_date', 'offer_last_verified'], true)) $v = $v ? (self::date($v) ?? '') : '';
            else $v = trim((string) $v);
            $c[$k] = $v;
        }
        return $c;
    }

    public static function offer_identity(array $o): string {
        $c = self::canon_offer($o);
        $code = strtolower($c['coupon_code']);
        if ($code !== '') return 'code:' . $code . '|' . TCFD_Store::scope_code($c['offer_course_scope']);
        return 'offer:' . strtolower($c['offer_type']) . '|' . TCFD_Store::scope_code($c['offer_course_scope']) . '|' . strtolower(preg_replace('/\W+/', '', $c['offer_title']));
    }
}
