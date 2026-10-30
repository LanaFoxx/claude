<?php
defined('ABSPATH') || exit;

/**
 * School pages: one template for every provider, served at /schools/{slug}/.
 * A page is public only when the provider post is published AND school_page_live is on;
 * otherwise it 404s for visitors (editors see a preview), stays noindex and out of the sitemap.
 */
final class TCFD_School {
    const FORMATS = ['video' => 'Video lessons', 'reading' => 'Online reading', 'pdf' => 'Downloadable PDF', 'textbook' => 'Physical textbook', 'live_online' => 'Live online classes', 'classroom' => 'Classroom', 'audio' => 'Audio'];
    const PACE = ['self_paced' => 'Self-paced', 'scheduled' => 'Scheduled classes', 'both' => 'Self-paced or scheduled'];
    const START = ['immediately' => 'Start immediately after enrolling', 'next_session' => 'Starts at the next scheduled session', 'by_request' => 'Start date arranged with the school'];
    const AFTER = ['materials_remain' => 'Materials stay available after you finish', 'until_expiry' => 'Materials stay available until your access period ends', 'permanent' => 'Materials stay available permanently', 'access_ends' => 'Access ends when you finish the course', 'download' => 'Materials can be downloaded to keep'];
    const EXAMS = ['quizzes_final' => 'Chapter quizzes plus a final exam', 'final_only' => 'One final exam', 'chapter_only' => 'Chapter quizzes only', 'none' => 'No exam'];
    const TIMERS = ['none' => 'No timed tests and no lesson timers', 'lesson' => 'Lesson timers apply', 'exam' => 'Timed exams', 'both' => 'Timed exams and lesson timers'];
    const WHO = ['school' => 'The school reports your completion to CTEC.', 'school_irs' => 'The school reports your completion to CTEC and the IRS.', 'student' => 'You submit proof of completion yourself.'];
    const REPORTING = ['same_day' => ['Same day', 'Same', 'day'], '24h' => ['Within 24 hours', '24', 'hours'], 'next_day' => ['Next business day', '1', 'business day'], '1_2_days' => ['1–2 business days', '1–2', 'business days'],
                       '3_5_days' => ['3–5 business days', '3–5', 'business days'], 'weekly' => ['Weekly', '7', 'days'], 'longer' => ['More than a week', '7+', 'days']];
    const CERT = ['immediate' => 'Certificate available immediately after the final exam', 'emailed' => 'Certificate emailed after completion', 'mailed' => 'Certificate mailed after completion', '24h' => 'Certificate available within 24 hours', 'after_report' => 'Certificate issued after the school reports to CTEC', 'none' => 'No certificate issued'];
    const CHAT = ['staffed' => 'Live chat with staff', 'automated' => 'Automated chat', 'none' => 'No live chat'];

    public static function boot(): void {
        add_action('acf/init', [__CLASS__, 'register_fields'], 20);
        add_action('template_redirect', [__CLASS__, 'gate'], 1);
        add_filter('template_include', [__CLASS__, 'template'], 99);
        add_filter('wpseo_robots', [__CLASS__, 'robots']);
        add_filter('wp_robots', [__CLASS__, 'wp_robots']);
        add_filter('wpseo_exclude_from_sitemap_by_post_ids', [__CLASS__, 'sitemap_exclude']);
        add_filter('wpseo_title', [__CLASS__, 'seo_title']);
        add_filter('wpseo_opengraph_title', [__CLASS__, 'seo_title']);
        add_filter('wpseo_metadesc', [__CLASS__, 'seo_desc']);
        add_filter('wpseo_opengraph_desc', [__CLASS__, 'seo_desc']);
        add_action('wp_head', [__CLASS__, 'schema'], 31);
        add_filter('bulk_actions-edit-' . TCFD_Plugin::POST_TYPE, [__CLASS__, 'bulk_actions']);
        add_filter('handle_bulk_actions-edit-' . TCFD_Plugin::POST_TYPE, [__CLASS__, 'bulk_live'], 10, 3);
        add_action('admin_notices', [__CLASS__, 'bulk_notice']);
    }

    /** Provider list bulk actions: switch school pages on or off. */
    public static function bulk_actions(array $actions): array {
        $actions['tcfd_school_live_on'] = 'Turn school pages on';
        $actions['tcfd_school_live_off'] = 'Turn school pages off';
        return $actions;
    }

    public static function bulk_live(string $redirect, string $action, array $ids): string {
        if (!in_array($action, ['tcfd_school_live_on', 'tcfd_school_live_off'], true)) return $redirect;
        $on = $action === 'tcfd_school_live_on';
        $n = 0;
        foreach ($ids as $id) {
            if (!current_user_can('edit_post', (int) $id)) continue;
            TCFD_Store::set((int) $id, 'school_page_live', $on ? 1 : null);
            $n++;
        }
        TCFD_Store::flush_cache();
        return add_query_arg(['tcfd_live' => $on ? 'on' : 'off', 'tcfd_live_n' => $n], $redirect);
    }

    public static function bulk_notice(): void {
        if (empty($_GET['tcfd_live']) || !isset($_GET['tcfd_live_n'])) return;
        $n = (int) $_GET['tcfd_live_n'];
        echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($n . ' school page' . ($n === 1 ? '' : 's') . ' turned ' . ($_GET['tcfd_live'] === 'on' ? 'on.' : 'off.')) . '</p></div>';
    }

    public static function is_live(int $id): bool {
        return get_post_status($id) === 'publish' && (bool) TCFD_Store::raw($id, 'school_page_live');
    }

    public static function url(int $id): string {
        return self::is_live($id) ? (string) get_permalink($id) : '';
    }

    private static function current(): int {
        return is_singular(TCFD_Plugin::POST_TYPE) ? (int) get_queried_object_id() : 0;
    }

    /* ---------------- gating / SEO ---------------- */

    public static function gate(): void {
        $id = self::current();
        if (!$id || self::is_live($id) || current_user_can('edit_post', $id)) return;
        global $wp_query;
        $wp_query->set_404();
        status_header(404);
        nocache_headers();
    }

    public static function robots($robots) {
        $id = self::current();
        return ($id && !self::is_live($id)) ? 'noindex, nofollow' : $robots;
    }

    public static function wp_robots(array $robots): array {
        $id = self::current();
        if ($id && !self::is_live($id)) { $robots['noindex'] = true; $robots['nofollow'] = true; unset($robots['index'], $robots['follow']); }
        return $robots;
    }

    public static function sitemap_exclude($ids) {
        $ids = is_array($ids) ? $ids : [];
        $all = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids']);
        foreach ($all as $p) if (!self::is_live((int) $p)) $ids[] = (int) $p;
        return $ids;
    }

    private static function courses_phrase(int $id): string {
        $ce = (bool) TCFD_Store::raw($id, 'offers_20_hour_ce');
        $qe = (bool) TCFD_Store::raw($id, 'offers_60_hour_qe');
        return $ce && $qe ? '20 Hour & 60 Hour CTEC Courses' : ($qe ? '60 Hour CTEC Course' : '20 Hour CTEC Course');
    }

    public static function seo_title($title) {
        $id = self::current();
        if (!$id) return $title;
        $name = (string) (TCFD_Store::raw($id, 'provider_display_name') ?: get_the_title($id));
        return $name . ': ' . self::courses_phrase($id) . ' | Tax Course Finder';
    }

    public static function seo_desc($desc) {
        $id = self::current();
        if (!$id) return $desc;
        $name = (string) (TCFD_Store::raw($id, 'provider_display_name') ?: get_the_title($id));
        $intro = trim((string) TCFD_Store::raw($id, 'school_intro'));
        if ($intro !== '') return wp_html_excerpt($intro, 155, '…');
        return wp_html_excerpt($name . ' ' . strtolower(self::courses_phrase($id)) . ': price, coupons, course format, student support, how fast completions reach CTEC, and refund policy.', 155, '…');
    }

    /* ---------------- rendering ---------------- */

    public static function template($template) {
        if (!self::current()) return $template;
        if (is_404()) return $template;
        return TCFD_DIR . 'templates/single-school.php';
    }

    private static function lines($v): array {
        return array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', (string) $v)), 'strlen'));
    }

    private static function course(int $id, string $c): array {
        $g = TCFD_Store::get($id, 'school_' . $c);
        $g = is_array($g) ? $g : [];
        $g['included'] = self::lines($g['included'] ?? '');
        $g['hours_breakdown'] = self::lines($g['hours_breakdown'] ?? '');
        $g['formats'] = array_values((array) ($g['formats'] ?? []));
        $g['accessibility'] = array_values((array) ($g['accessibility'] ?? []));
        $g['price_last_checked'] = TCFD_Importer::display($c . '_price_last_checked', TCFD_Store::raw($id, $c . '_price_last_checked'));
        if ($g['price_last_checked'] === '—') $g['price_last_checked'] = '';
        return $g;
    }

    public static function data(int $id): array {
        $r = fn($n) => TCFD_Store::raw($id, $n);
        $p_name = get_the_title($id);
        $faqs = [];
        foreach ((array) TCFD_Store::get($id, 'school_faqs') as $row) {
            if (!empty($row['q']) && !empty($row['a'])) $faqs[] = ['q' => (string) $row['q'], 'a' => (string) $row['a']];
        }
        $shots = [];
        foreach ((array) TCFD_Store::get($id, 'school_screenshots') as $img) {
            $iid = is_array($img) ? (int) ($img['ID'] ?? 0) : (int) $img;
            if ($iid) $shots[] = ['src' => (string) wp_get_attachment_image_url($iid, 'large'), 'alt' => (string) get_post_meta($iid, '_wp_attachment_image_alt', true) ?: 'Course screenshot from ' . $p_name];
        }
        return [
            'provider' => TCFD_Store::public_payload($id),
            'school' => [
                'intro' => (string) $r('school_intro'), 'about' => (string) $r('school_about'), 'instructors' => (string) $r('school_instructors'),
                'support_phone' => (string) $r('support_phone'), 'support_email' => (string) $r('support_email'), 'live_chat' => (string) $r('live_chat'),
                'support_hours' => (string) $r('support_hours'), 'support_tz' => (string) $r('support_tz'), 'email_response_time' => (string) $r('email_response_time'),
                'instructional_help' => (string) $r('instructional_help'), 'account_help' => (string) $r('account_help'),
                'support_phone_verified' => (bool) $r('support_phone_verified'), 'support_email_verified' => (bool) $r('support_email_verified'), 'live_chat_verified' => (bool) $r('live_chat_verified'),
                'photo' => ($pid = (int) $r('school_photo')) ? ['src' => (string) wp_get_attachment_image_url($pid, 'large'), 'alt' => (string) get_post_meta($pid, '_wp_attachment_image_alt', true) ?: 'Photo of ' . $p_name] : null,
                'sample_lesson_url' => (string) $r('sample_lesson_url'), 'external_rating_url' => (string) $r('external_rating_url'), 'faqs' => array_slice($faqs, 0, 5), 'screenshots' => array_slice($shots, 0, 3),
            ],
            'courses' => ['ce' => self::course($id, 'ce'), 'qe' => self::course($id, 'qe')],
            'labels' => ['formats' => self::FORMATS, 'pace' => self::PACE, 'start' => self::START, 'after' => self::AFTER, 'exams' => self::EXAMS, 'timers' => self::TIMERS,
                         'who' => self::WHO, 'reporting' => self::REPORTING, 'cert' => self::CERT, 'chat' => self::CHAT],
            'live' => self::is_live($id),
            'links' => ['directory' => home_url('/#find-schools'), 'report' => home_url('/provider-rights/#correction'), 'verify' => home_url('/provider-application/')],
        ];
    }

    public static function render(int $id): string {
        $tpl = (string) @file_get_contents(TCFD_DIR . 'templates/school-template.html');
        $js = (string) @file_get_contents(TCFD_DIR . 'assets/school.js');
        $data = self::data($id);
        $p = $data['provider'];
        $name = esc_html($p['name']);
        // Server-rendered summary for crawlers and no-JS visitors; replaced by the full page on load.
        $ssr = '<div style="max-width:1200px;margin:0 auto;padding:110px 56px 80px"><p><a href="' . esc_url($data['links']['directory']) . '">All CTEC providers</a> / ' . $name . '</p>'
             . '<h1 style="font:200 52px/1.05 Manrope,sans-serif;margin:0 0 16px">' . $name . '</h1>'
             . '<p style="font-size:22px;line-height:1.6;color:#23272A;max-width:760px">' . esc_html($data['school']['intro'] ?: $p['name'] . ' is a CTEC-approved education provider.') . '</p></div>';
        $banner = $data['live'] ? '' : '<div style="background:#E0A82E;color:#23272A;text-align:center;padding:10px 16px;font:700 17px Manrope,sans-serif">Preview only – this school page is not live. Visitors get a 404 until “School page live” is switched on.</div>';
        $css = '<style id="tcfd-school-css">'
             . '@media (max-width:900px){.tcf-p-school .tcfd-hero-spacer{display:none!important}'
             . '.tcf-p-school .tcfd-card-wrap{margin-top:0!important;order:-1}'
             . '.tcf-p-school .tcfd-card{position:static!important;width:100%!important}'
             . '.tcf-p-school .tcfd-tabs{flex-wrap:wrap}'
             . '.tcf-p-school .tcfd-subnav-bar{top:76px!important}'
             . '.tcf-p-school .tcfd-subnav{overflow-x:auto;white-space:nowrap;padding:0 12px!important;-webkit-overflow-scrolling:touch;scrollbar-width:none}'
             . '.tcf-p-school .tcfd-subnav>a{flex:none}}</style>';
        return $css . $banner . '<div class="tcf-page tcf-scope tcf-p-school"><div id="tcf-school-root" class="tcf-root">' . $ssr . '</div></div>'
            . '<template id="tcf-school-tpl">' . $tpl . '</template>'
            . '<script>window.TCF_SCHOOL=' . str_replace('</', '<\\/', (string) wp_json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) . ';</script>'
            . '<script>' . $js . '</script>';
    }

    public static function schema(): void {
        $id = self::current();
        if (!$id || !self::is_live($id)) return;
        $p = TCFD_Store::public_payload($id);
        $url = get_permalink($id);
        $org = array_filter(['@type' => 'EducationalOrganization', '@id' => $url . '#school', 'name' => $p['name'], 'url' => $p['website'] ?: null, 'logo' => $p['logo_url'] ?: null,
                             'identifier' => $p['ctec_number'] ? ['@type' => 'PropertyValue', 'propertyID' => 'CTEC provider number', 'value' => $p['ctec_number']] : null]);
        $courses = [];
        foreach (['ce' => ['offers_20_hour_ce', 'CTEC 20 Hour Continuing Education Course', 'PT20H'], 'qe' => ['offers_60_hour_qe', 'CTEC 60 Hour Qualifying Education Course', 'PT60H']] as $c => [$flag, $label, $dur]) {
            if (empty($p[$flag])) continue;
            $course = ['@type' => 'Course', 'name' => $label . ' – ' . $p['name'], 'url' => $url . '?course=' . ($c === 'ce' ? '20-hour' : '60-hour'), 'provider' => ['@id' => $url . '#school'],
                       'hasCourseInstance' => [['@type' => 'CourseInstance', 'courseWorkload' => $dur, 'courseMode' => 'Online']]];
            if (($p[$c]['price_status'] ?? '') === 'VERIFIED' && is_numeric($p[$c]['current_price'] ?? null)) {
                $course['offers'] = [['@type' => 'Offer', 'category' => 'Paid', 'price' => round((float) $p[$c]['current_price'], 2), 'priceCurrency' => 'USD', 'url' => $p[$c]['course_url'] ?: $p['website']]];
            }
            $courses[] = $course;
        }
        $graph = ['@context' => 'https://schema.org', '@graph' => array_merge([$org], $courses)];
        echo "\n<script type=\"application/ld+json\" class=\"tcfd-school\">" . str_replace('</', '<\\/', (string) wp_json_encode($graph, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) . "</script>\n";
    }

    /* ---------------- fields ---------------- */

    private static function f(string $key, string $label, string $name, string $type, array $extra = []): array {
        return array_merge(['key' => $key, 'label' => $label, 'name' => $name, 'type' => $type], $extra);
    }

    private static function course_fields(string $c): array {
        $k = 'field_tcfd_sc_' . $c . '_';
        $w = fn($n) => ['wrapper' => ['width' => (string) $n]];
        return [
            self::f($k . 'package_kind', 'Package', 'package_kind', 'select', ['choices' => ['complete' => 'Complete package (all required hours)', 'partial' => 'Partial (some hours only)'], 'allow_null' => 1] + $w(34)),
            self::f($k . 'edition', 'Edition', 'edition', 'text', ['placeholder' => '2026 edition (2025 tax year)'] + $w(33)),
            self::f($k . 'beginner_friendly', 'Beginner friendly', 'beginner_friendly', 'select', ['choices' => ['yes' => 'Yes', 'no' => 'No – assumes prior knowledge'], 'allow_null' => 1] + $w(33)),
            self::f($k . 'included', 'What’s included (one per line)', 'included', 'textarea', ['rows' => 4] + $w(50)),
            self::f($k . 'hours_breakdown', 'Hours breakdown (one per line)', 'hours_breakdown', 'textarea', ['rows' => 4, 'instructions' => 'Blank = the official CTEC breakdown is shown.'] + $w(50)),
            self::f($k . 'extra_book', 'Printed book', 'extra_book', 'text', ['placeholder' => 'Included / $29.95'] + $w(33)),
            self::f($k . 'extra_retake', 'Exam retake', 'extra_retake', 'text', ['placeholder' => 'Free / $10'] + $w(33)),
            self::f($k . 'extra_cert', 'Certificate', 'extra_cert', 'text', ['placeholder' => 'Included'] + $w(34)),
            self::f($k . 'formats', 'Formats', 'formats', 'checkbox', ['choices' => self::FORMATS, 'layout' => 'horizontal']),
            self::f($k . 'pace', 'Pace', 'pace', 'select', ['choices' => self::PACE, 'allow_null' => 1] + $w(25)),
            self::f($k . 'start_now', 'Start', 'start_now', 'select', ['choices' => self::START, 'allow_null' => 1] + $w(25)),
            self::f($k . 'access_period', 'Access period', 'access_period', 'text', ['placeholder' => '12 months'] + $w(25)),
            self::f($k . 'after_completion', 'After completion', 'after_completion', 'select', ['choices' => self::AFTER, 'allow_null' => 1] + $w(25)),
            self::f($k . 'live_sessions', 'Live sessions', 'live_sessions', 'text', ['placeholder' => 'None / Weekly Zoom Q&A'] + $w(50)),
            self::f($k . 'languages', 'Languages', 'languages', 'text', ['placeholder' => 'English, Spanish'] + $w(25)),
            self::f($k . 'accessibility', 'Accessibility', 'accessibility', 'checkbox', ['choices' => ['captions' => 'Video captions', 'mobile' => 'Mobile friendly', 'printable' => 'Printable lessons'], 'layout' => 'horizontal'] + $w(25)),
            self::f($k . 'syllabus', 'Syllabus summary', 'syllabus', 'textarea', ['rows' => 3]),
            self::f($k . 'exam_structure', 'Exams', 'exam_structure', 'select', ['choices' => self::EXAMS, 'allow_null' => 1] + $w(25)),
            self::f($k . 'passing_score', 'Passing score', 'passing_score', 'text', ['placeholder' => '70%'] + $w(25)),
            self::f($k . 'attempts', 'Attempts', 'attempts', 'text', ['placeholder' => 'Unlimited, free'] + $w(25)),
            self::f($k . 'timers', 'Timers', 'timers', 'select', ['choices' => self::TIMERS, 'allow_null' => 1] + $w(25)),
            self::f($k . 'who_reports', 'Who reports to CTEC', 'who_reports', 'select', ['choices' => self::WHO, 'allow_null' => 1] + $w(34)),
            self::f($k . 'reporting_time', 'Reporting speed', 'reporting_time', 'select', ['choices' => array_map(fn($x) => $x[0], self::REPORTING), 'allow_null' => 1] + $w(33)),
            self::f($k . 'certificate', 'Certificate', 'certificate', 'select', ['choices' => self::CERT, 'allow_null' => 1] + $w(33)),
            self::f($k . 'weekend_note', 'Reporting note', 'weekend_note', 'text', ['placeholder' => 'Weekend completions report the next business day'] + $w(100)),
            self::f($k . 'refund_window', 'Refund window', 'refund_window', 'text', ['placeholder' => '30 days'] + $w(25)),
            self::f($k . 'refund_url', 'Refund policy URL', 'refund_url', 'url', $w(35)),
            self::f($k . 'refund_conditions', 'Refund conditions', 'refund_conditions', 'text', $w(40)),
            self::f($k . 'last_checked', 'This course record last checked', 'last_checked', 'date_picker', ['display_format' => 'm/d/Y', 'return_format' => 'Y-m-d'] + $w(34)),
        ];
    }

    public static function register_fields(): void {
        if (!function_exists('acf_add_local_field_group')) return;
        $w = fn($n) => ['wrapper' => ['width' => (string) $n]];
        $fields = [
            ['key' => 'field_tcfd_sp_tab_status', 'label' => 'Status', 'type' => 'tab'],
            self::f('field_tcfd_school_page_live', 'School page live', 'school_page_live', 'true_false', ['ui' => 1, 'default_value' => 0,
                'instructions' => 'Off = the page at /schools/… returns 404 to visitors, stays out of Google and the directory does not link to it. Turn on only after this school’s details are verified. Editors can always preview it.']),
            ['key' => 'field_tcfd_sp_msg', 'label' => '', 'type' => 'message', 'message' => 'Any field left empty shows “Not confirmed” on the page. Prices, coupons, Google rating and course features come from the other tabs.'],
            ['key' => 'field_tcfd_sp_tab_school', 'label' => 'School details', 'type' => 'tab'],
            self::f('field_tcfd_school_intro', 'Intro (2–3 sentences)', 'school_intro', 'textarea', ['rows' => 3]),
            self::f('field_tcfd_school_about', 'About the school', 'school_about', 'textarea', ['rows' => 5]),
            self::f('field_tcfd_school_instructors', 'Instructors', 'school_instructors', 'text'),
            self::f('field_tcfd_sample_lesson_url', 'Sample lesson URL', 'sample_lesson_url', 'url', $w(50)),
            self::f('field_tcfd_external_rating_url', 'External rating URL', 'external_rating_url', 'url', $w(50)),
            self::f('field_tcfd_school_screenshots', 'Screenshots (max 3)', 'school_screenshots', 'gallery', ['max' => 3, 'return_format' => 'id', 'preview_size' => 'thumbnail']),
            self::f('field_tcfd_school_photo', 'School photo (About section)', 'school_photo', 'image', ['return_format' => 'id', 'preview_size' => 'thumbnail']),
            self::f('field_tcfd_school_faqs', 'School FAQs (max 5)', 'school_faqs', 'repeater', ['max' => 5, 'layout' => 'block', 'button_label' => 'Add FAQ', 'sub_fields' => [
                self::f('field_tcfd_school_faq_q', 'Question', 'q', 'text'), self::f('field_tcfd_school_faq_a', 'Answer', 'a', 'textarea', ['rows' => 2])]]),
            ['key' => 'field_tcfd_sp_tab_support', 'label' => 'Support', 'type' => 'tab'],
            self::f('field_tcfd_support_phone', 'Support phone', 'support_phone', 'text', $w(34)),
            self::f('field_tcfd_support_email', 'Support email', 'support_email', 'email', $w(33)),
            self::f('field_tcfd_live_chat', 'Live chat', 'live_chat', 'select', ['choices' => self::CHAT, 'allow_null' => 1] + $w(33)),
            self::f('field_tcfd_support_phone_verified', 'Phone verified', 'support_phone_verified', 'true_false', ['ui' => 1] + $w(34)),
            self::f('field_tcfd_support_email_verified', 'Email verified', 'support_email_verified', 'true_false', ['ui' => 1] + $w(33)),
            self::f('field_tcfd_live_chat_verified', 'Chat verified', 'live_chat_verified', 'true_false', ['ui' => 1] + $w(33)),
            self::f('field_tcfd_support_hours', 'Support hours', 'support_hours', 'text', ['placeholder' => 'Mon–Fri 8am–6pm'] + $w(34)),
            self::f('field_tcfd_support_tz', 'Time zone', 'support_tz', 'text', ['placeholder' => 'PT'] + $w(33)),
            self::f('field_tcfd_email_response_time', 'Email response time', 'email_response_time', 'text', ['placeholder' => 'Within 1 business day'] + $w(33)),
            self::f('field_tcfd_instructional_help', 'Help with course content', 'instructional_help', 'text', $w(50)),
            self::f('field_tcfd_account_help', 'Help with account / login', 'account_help', 'text', $w(50)),
            ['key' => 'field_tcfd_sp_tab_ce', 'label' => '20-Hour Course Details', 'type' => 'tab'],
            self::f('field_tcfd_school_ce', '20-hour course', 'school_ce', 'group', ['layout' => 'block', 'sub_fields' => self::course_fields('ce')]),
            ['key' => 'field_tcfd_sp_tab_qe', 'label' => '60-Hour Course Details', 'type' => 'tab'],
            self::f('field_tcfd_school_qe', '60-hour course', 'school_qe', 'group', ['layout' => 'block', 'sub_fields' => self::course_fields('qe')]),
        ];
        acf_add_local_field_group([
            'key' => 'group_tcfd_school_page', 'title' => 'School Page', 'fields' => $fields,
            'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => TCFD_Plugin::POST_TYPE]]],
            'position' => 'normal', 'style' => 'default', 'menu_order' => 20, 'active' => true,
        ]);
    }

    /** Scalar school fields for imports/forms: name => field key. */
    public static function scalar_keys(): array {
        $out = [];
        foreach (['school_page_live', 'school_intro', 'school_about', 'school_instructors', 'school_photo', 'sample_lesson_url', 'external_rating_url', 'support_phone', 'support_email', 'live_chat',
                  'support_phone_verified', 'support_email_verified', 'live_chat_verified', 'support_hours', 'support_tz', 'email_response_time', 'instructional_help', 'account_help'] as $n) {
            $out[$n] = 'field_tcfd_' . $n;
        }
        return $out;
    }
}
