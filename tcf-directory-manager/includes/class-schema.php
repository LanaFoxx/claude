<?php
defined('ABSPATH') || exit;

/**
 * Structured data built from the live provider listings:
 * - an ItemList of Course entries on the 20-hour and 60-hour course pages
 * - topical hints on Yoast's Organization piece for search and AI engines
 */
final class TCFD_Schema {

    /** Page slug => course type. */
    public static function pages(): array {
        return apply_filters('tcfd_schema_pages', ['ctec-20-hour-course' => 'ce', 'ctec-60-hour-course' => 'qe']);
    }

    public static function boot(): void {
        add_action('wp_head', [__CLASS__, 'course_list'], 30);
        add_filter('wpseo_schema_organization', [__CLASS__, 'organization']);
    }

    public static function organization($data) {
        if (!is_array($data)) return $data;
        $data['knowsAbout'] = ['20 hour CTEC course', '60 hour CTEC course', 'CTEC continuing education', 'CTEC qualifying education', 'California Registered Tax Preparer (CRTP) requirements'];
        $data['areaServed'] = ['@type' => 'State', 'name' => 'California'];
        return $data;
    }

    private static function anchor(string $name): string {
        return trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($name)), '-');
    }

    public static function course_list(): void {
        if (!is_page()) return;
        $slug = (string) get_post_field('post_name', get_queried_object_id());
        $type = self::pages()[$slug] ?? null;
        if (!$type) return;
        $page_url = get_permalink(get_queried_object_id());
        $data = TCFD_Store::all_payload();
        $ce = $type === 'ce';
        $course_name = $ce ? 'CTEC 20 Hour Continuing Education Course' : 'CTEC 60 Hour Qualifying Education Course';
        $desc = $ce
            ? 'CTEC-approved 20 hour continuing education course for California Registered Tax Preparers: 10 hours federal tax law, 3 hours federal tax updates, 2 hours ethics and 5 hours California tax law. Required every year to renew CTEC registration by October 31.'
            : 'CTEC-approved 60 hour qualifying education course for new California tax preparers: 45 hours of federal tax law (including 2 hours of ethics) and 15 hours of California tax law. Required once before registering as a CTEC Registered Tax Preparer (CRTP).';

        $items = [];
        $pos = 0;
        foreach ($data['providers'] as $p) {
            if (!($ce ? $p['offers_20_hour_ce'] : $p['offers_60_hour_qe'])) continue;
            $price = $ce ? $p['ce'] : $p['qe'];
            $f = $p['features'] ?? [];
            $course = [
                '@type' => 'Course',
                'name' => $course_name . ' – ' . $p['name'],
                'description' => $desc,
                'url' => $page_url . '#provider-' . self::anchor($p['name']),
                'provider' => array_filter(['@type' => 'Organization', 'name' => $p['name'], 'sameAs' => $p['website'] ?: null]),
                'inLanguage' => 'en',
                'educationalCredentialAwarded' => $ce ? 'CTEC continuing education credit (20 hours)' : 'CTEC qualifying education certificate (60 hours)',
                'timeRequired' => $ce ? 'PT20H' : 'PT60H',
            ];
            $modes = [];
            if (!empty($f['online_course_available'])) $modes[] = 'Online';
            if (!empty($f['in_person_course_available'])) $modes[] = 'Onsite';
            $instance = ['@type' => 'CourseInstance', 'courseWorkload' => $ce ? 'PT20H' : 'PT60H'];
            if ($modes) $instance['courseMode'] = count($modes) > 1 ? 'Blended' : $modes[0];
            $course['hasCourseInstance'] = [$instance];
            if (($price['price_status'] ?? '') === 'VERIFIED' && is_numeric($price['current_price'] ?? null)) {
                $course['offers'] = [[
                    '@type' => 'Offer',
                    'category' => (float) $price['current_price'] > 0 ? 'Paid' : 'Free',
                    'price' => round((float) $price['current_price'], 2),
                    'priceCurrency' => 'USD',
                    'url' => $price['course_url'] ?: ($p['website'] ?: $page_url),
                ]];
            }
            $items[] = ['@type' => 'ListItem', 'position' => ++$pos, 'item' => $course];
        }
        if (!$items) return;
        $list = [
            '@context' => 'https://schema.org',
            '@type' => 'ItemList',
            '@id' => $page_url . '#course-list',
            'name' => ($ce ? '20 Hour CTEC Courses' : '60 Hour CTEC Courses') . ' in California',
            'description' => 'Every CTEC-approved provider of the ' . ($ce ? '20 hour CTEC continuing education course' : '60 hour CTEC qualifying education course') . ', compared by California Tax Course Finder.',
            'numberOfItems' => count($items),
            'itemListOrder' => 'https://schema.org/ItemListUnordered',
            'mainEntityOfPage' => $page_url,
            'itemListElement' => $items,
        ];
        echo "\n<script type=\"application/ld+json\" class=\"tcfd-course-list\">" . str_replace('</', '<\\/', (string) wp_json_encode($list, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) . "</script>\n";
    }
}
