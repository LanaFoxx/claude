<?php
defined('ABSPATH') || exit;

/**
 * Private provider profile form at /provider-profile/ (optionally ?t={token} to tie it to one listing).
 * Unlisted: noindex,nofollow, no canonical/OG, not in menus or the sitemap. Submissions are stored as
 * "Profile Submissions" (draft = awaiting review), the admin is emailed, and an editor applies the checked
 * fields to the provider. Applying never switches the school page live; that stays a manual step.
 */
final class TCFD_Profile {
    const CPT = 'tcfd_profile_sub';
    const SLUG = 'provider-profile';
    const TOKEN_META = '_tcfd_profile_token';
    const MAX_BYTES = 5 * MB_IN_BYTES;
    const MIMES = ['jpg|jpeg|jpe' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp'];

    const FORMATS = ['Video lessons' => 'video', 'Online reading' => 'reading', 'Downloadable PDF' => 'pdf', 'Physical textbook' => 'textbook',
                     'Live online classes' => 'live_online', 'Classroom instruction' => 'classroom', 'Audio' => 'audio'];
    const ACCESS = ['Captions' => 'captions', 'Mobile compatible' => 'mobile', 'Printable materials' => 'printable'];
    const TZ = ['PT' => 'Pacific', 'MT' => 'Mountain', 'CT' => 'Central', 'ET' => 'Eastern'];
    const APPROVED = ['qe' => 'QE (60-hour)', 'ce' => 'CE (20-hour)', 'both' => 'Both QE and CE'];

    /** Directory features a school can confirm on the listing form: exactly the public search filters. */
    public static function listing_features(): array {
        $out = [];
        foreach (TCFD_Fields::FEATURES as $group => $items) {
            if (in_array($group, ['Study Features', 'Device / Access'], true)) continue;
            unset($items['self_paced']);
            if ($items) $out[$group] = $items;
        }
        return $out;
    }

    /** School-level form fields: form name => [label, kind, provider field]. */
    private static function school_map(): array {
        return [
            'school_name' => ['School name', 'text', 'provider_display_name'],
            'website' => ['Website', 'url', 'provider_website'],
            'ctec_number' => ['CTEC provider number', 'text', 'provider_ctec_number'],
            'approved_types' => ['Approved for', 'choice:approved', ''],
            'contact_name' => ['Contact name', 'text', ''],
            'contact_email' => ['Contact email', 'email', ''],
            'intro' => ['Short intro (top of the school page)', 'textarea', 'school_intro'],
            'about' => ['About the school', 'textarea', 'school_about'],
            'instructors' => ['Instructors', 'textarea', 'school_instructors'],
            'phone' => ['Support phone', 'text', 'support_phone'],
            'support_email' => ['Support email', 'email', 'support_email'],
            'chat' => ['Live chat', 'choice:chat', 'live_chat'],
            'hours' => ['Support hours', 'text', 'support_hours'],
            'tz' => ['Time zone', 'choice:tz', 'support_tz'],
            'response_time' => ['Email response time', 'text', 'email_response_time'],
            'instructional_help' => ['Help with course content', 'textarea', 'instructional_help'],
            'account_help' => ['Help with login & billing', 'textarea', 'account_help'],
            'sample_url' => ['Sample lesson URL', 'url', 'sample_lesson_url'],
            'faqs' => ['School FAQs', 'faqs', 'school_faqs'],
            'rating_url' => ['External rating URL', 'url', 'external_rating_url'],
        ];
    }

    /** Per-course form fields: form name => [label, kind, sub-field of school_ce / school_qe]. */
    private static function course_map(): array {
        return [
            'package_kind' => ['Package', 'choice:package', 'package_kind'],
            'edition' => ['Edition', 'text', 'edition'],
            'included' => ['What’s included', 'textarea', 'included'],
            'extra_book' => ['Printed book', 'text', 'extra_book'],
            'extra_retake' => ['Exam retake', 'text', 'extra_retake'],
            'extra_cert' => ['Certificate cost', 'text', 'extra_cert'],
            'formats' => ['Formats', 'multi:formats', 'formats'],
            'pace' => ['Pace', 'choice:pace', 'pace'],
            'access_period' => ['Access period', 'text', 'access_period'],
            'start_now' => ['Start', 'choice:start', 'start_now'],
            'after_completion' => ['After completion', 'choice:after', 'after_completion'],
            'live_sessions' => ['Live sessions', 'text', 'live_sessions'],
            'syllabus' => ['Syllabus summary', 'textarea', 'syllabus'],
            'languages' => ['Languages', 'text', 'languages'],
            'access' => ['Accessibility', 'multi:access', 'accessibility'],
            'exam_structure' => ['Exams', 'choice:exams', 'exam_structure'],
            'passing_score' => ['Passing score', 'text', 'passing_score'],
            'attempts' => ['Attempts', 'text', 'attempts'],
            'timers' => ['Timers', 'choice:timers', 'timers'],
            'who_reports' => ['Who reports to CTEC', 'choice:who', 'who_reports'],
            'reporting_time' => ['Reporting speed', 'choice:reporting', 'reporting_time'],
            'weekend' => ['Reporting note', 'text', 'weekend_note'],
            'certificate' => ['Certificate', 'choice:cert', 'certificate'],
            'refund_window' => ['Refund window', 'text', 'refund_window'],
            'refund_url' => ['Refund policy URL', 'url', 'refund_url'],
            'refund_conditions' => ['Refund conditions', 'textarea', 'refund_conditions'],
        ];
    }

    private static function choices(string $set): array {
        switch ($set) {
            case 'approved': return self::APPROVED;
            case 'chat': return TCFD_School::CHAT;
            case 'tz': return self::TZ;
            case 'package': return ['complete' => 'Complete package', 'partial' => 'Partial (some hours only)'];
            case 'pace': return TCFD_School::PACE;
            case 'start': return TCFD_School::START;
            case 'after': return TCFD_School::AFTER;
            case 'exams': return TCFD_School::EXAMS;
            case 'timers': return TCFD_School::TIMERS;
            case 'who': return TCFD_School::WHO;
            case 'reporting': return array_map(fn($x) => $x[0], TCFD_School::REPORTING);
            case 'cert': return TCFD_School::CERT;
            case 'formats': return array_flip(self::FORMATS);
            case 'access': return array_flip(self::ACCESS);
        }
        return [];
    }

    public static function boot(): void {
        add_action('init', [__CLASS__, 'register']);
        add_filter('query_vars', fn($v) => array_merge($v, ['tcfd_profile']));
        add_action('pre_get_posts', [__CLASS__, 'light_query']);
        add_action('template_redirect', [__CLASS__, 'page_setup'], 2);
        add_filter('template_include', [__CLASS__, 'template'], 99);
        add_action('wp_ajax_tcfd_profile_submit', [__CLASS__, 'submit']);
        add_action('wp_ajax_nopriv_tcfd_profile_submit', [__CLASS__, 'submit']);
        add_action('wp_ajax_tcfd_listing_submit', [__CLASS__, 'submit_listing']);
        add_action('wp_ajax_nopriv_tcfd_listing_submit', [__CLASS__, 'submit_listing']);
        if (is_admin()) {
            add_action('add_meta_boxes_' . self::CPT, [__CLASS__, 'review_box']);
            add_action('add_meta_boxes_' . TCFD_Plugin::POST_TYPE, [__CLASS__, 'link_box']);
            add_action('save_post_' . self::CPT, [__CLASS__, 'apply'], 10, 2);
            add_filter('redirect_post_location', [__CLASS__, 'after_apply'], 10, 2);
            add_action('admin_post_tcfd_profile_token', [__CLASS__, 'regenerate']);
            add_filter('manage_' . self::CPT . '_posts_columns', [__CLASS__, 'columns']);
            add_action('manage_' . self::CPT . '_posts_custom_column', [__CLASS__, 'column'], 10, 2);
            add_action('admin_menu', [__CLASS__, 'menu_badge'], 99);
            add_action('admin_notices', [__CLASS__, 'notices']);
        }
    }

    public static function register(): void {
        add_rewrite_rule('^' . self::SLUG . '/?$', 'index.php?tcfd_profile=1', 'top');
        register_post_type(self::CPT, [
            'labels' => ['name' => 'Profile Submissions', 'singular_name' => 'Profile Submission', 'edit_item' => 'Review Profile Submission',
                         'all_items' => 'Profile Submissions', 'menu_name' => 'Profile Submissions', 'not_found' => 'No profile submissions yet',
                         'search_items' => 'Search Submissions', 'not_found_in_trash' => 'No submissions in Trash'],
            'public' => false, 'publicly_queryable' => false, 'exclude_from_search' => true, 'show_ui' => true,
            'show_in_menu' => 'edit.php?post_type=' . TCFD_Plugin::POST_TYPE, 'show_in_rest' => false, 'show_in_nav_menus' => false,
            'rewrite' => false, 'query_var' => false, 'supports' => ['title'], 'map_meta_cap' => true,
            'capability_type' => 'post', 'capabilities' => ['create_posts' => 'do_not_allow'],
        ]);
    }

    public static function url(int $provider_id = 0): string {
        $base = home_url('/' . self::SLUG . '/');
        return $provider_id ? add_query_arg('t', self::token($provider_id), $base) : $base;
    }

    public static function token(int $provider_id, bool $fresh = false): string {
        $t = (string) get_post_meta($provider_id, self::TOKEN_META, true);
        if ($t === '' || $fresh) { $t = wp_generate_password(24, false, false); update_post_meta($provider_id, self::TOKEN_META, $t); }
        return $t;
    }

    public static function provider_for_token(string $token): int {
        if (!preg_match('/^[A-Za-z0-9]{16,64}$/', $token)) return 0;
        $ids = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids',
                          'meta_key' => self::TOKEN_META, 'meta_value' => $token]);
        return $ids ? (int) $ids[0] : 0;
    }

    /* ---------------- front end ---------------- */

    private static function is_form(): bool {
        return (bool) get_query_var('tcfd_profile');
    }

    /** The route has no posts of its own; skip the default blog query. */
    public static function light_query($q): void {
        if ($q instanceof WP_Query && $q->is_main_query() && $q->get('tcfd_profile')) {
            $q->set('post_type', 'page'); $q->set('post__in', [0]); $q->set('no_found_rows', true);
        }
    }

    public static function page_setup(): void {
        if (!self::is_form()) return;
        if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
        nocache_headers();
        header('X-Robots-Tag: noindex, nofollow', true);
        status_header(200);
        add_filter('wp_robots', fn() => ['noindex' => true, 'nofollow' => true]);
        add_filter('wpseo_robots', fn() => 'noindex, nofollow');
        add_filter('wpseo_title', fn() => 'School profile details | Tax Course Finder');
        add_filter('pre_get_document_title', fn() => 'School profile details | Tax Course Finder');
        add_filter('wpseo_metadesc', '__return_empty_string');
        add_filter('wpseo_json_ld_output', '__return_false');
        add_filter('wpseo_frontend_presenter_classes', fn($c) => array_values(array_filter((array) $c, fn($k) => preg_match('/Title_Presenter|Robots_Presenter/', (string) $k))));
        add_filter('body_class', fn($c) => array_values(array_diff(array_merge($c, ['tcfd-profile']), ['blog', 'home'])));
    }

    public static function template($template) {
        return self::is_form() ? TCFD_DIR . 'templates/provider-profile.php' : $template;
    }

    private static function prefill(int $id): array {
        if (!$id) return [];
        $r = fn($n) => TCFD_Store::raw($id, $n);
        $v = ['school_name' => (string) ($r('provider_display_name') ?: get_the_title($id)), 'website' => (string) $r('provider_website'),
              'ctec_number' => (string) $r('provider_ctec_number'), 'about' => (string) $r('school_about'), 'instructors' => (string) $r('school_instructors'),
              'phone' => (string) $r('support_phone'), 'support_email' => (string) $r('support_email'), 'chat' => (string) $r('live_chat'),
              'hours' => (string) $r('support_hours'), 'tz' => (string) $r('support_tz'), 'response_time' => (string) $r('email_response_time'),
              'instructional_help' => (string) $r('instructional_help'), 'account_help' => (string) $r('account_help'),
              'sample_url' => (string) $r('sample_lesson_url'), 'rating_url' => (string) $r('external_rating_url')];
        $ce = (bool) $r('offers_20_hour_ce'); $qe = (bool) $r('offers_60_hour_qe');
        $v['approved_types'] = $ce && $qe ? 'both' : ($qe ? 'qe' : ($ce ? 'ce' : ''));
        $faqs = [];
        foreach ((array) TCFD_Store::get($id, 'school_faqs') as $row) if (!empty($row['q'])) $faqs[] = trim($row['q']) . "\n" . trim((string) ($row['a'] ?? ''));
        $v['faqs'] = implode("\n\n", $faqs);
        $out = ['v' => array_filter($v, 'strlen')];
        foreach (['ce' => 'offers_20_hour_ce', 'qe' => 'offers_60_hour_qe'] as $c => $flag) {
            $g = TCFD_Store::get($id, 'school_' . $c);
            $g = is_array($g) ? $g : [];
            $row = ['offered' => (bool) $r($flag), 'course_url' => (string) $r($c . '_course_url'),
                    'price' => is_numeric($r($c . '_current_price')) ? (string) (0 + $r($c . '_current_price')) : ''];
            foreach (self::course_map() as $name => [, $kind, $sub]) {
                $val = $g[$sub] ?? '';
                if (strpos($kind, 'multi:') === 0) {
                    $labels = self::choices(substr($kind, 6));
                    $row[$name] = array_values(array_filter(array_map(fn($k) => $labels[$k] ?? '', (array) $val)));
                } else {
                    $row[$name] = is_scalar($val) ? (string) $val : '';
                }
            }
            $out[$c] = array_filter($row, fn($x) => $x !== '' && $x !== []);
        }
        return $out;
    }

    public static function render(): string {
        $token = isset($_GET['t']) ? sanitize_text_field(wp_unslash((string) $_GET['t'])) : '';
        $pid = $token !== '' ? self::provider_for_token($token) : 0;
        $tpl = (string) @file_get_contents(TCFD_DIR . 'templates/profile-template.html');
        $js = (string) @file_get_contents(TCFD_DIR . 'assets/profile.js');
        $data = ['ajax' => admin_url('admin-ajax.php'), 'token' => $pid ? $token : '', 'provider_name' => $pid ? (string) (TCFD_Store::raw($pid, 'provider_display_name') ?: get_the_title($pid)) : '',
                 'prefill' => self::prefill($pid), 'maxBytes' => self::MAX_BYTES, 'started' => time()];
        $css = '<style id="tcfd-profile-css">body.tcfd-profile .elementor-location-header,body.tcfd-profile .elementor-location-footer,body.tcfd-profile .tcf-header,body.tcfd-profile .tcf-footer{display:none!important}'
             . 'body.tcfd-profile{background:#F4F6F7}'
             . '@media (max-width:900px){.tcf-p-profile [style*="padding:0 56px"],.tcf-p-profile [style*="padding:64px 56px"],.tcf-p-profile [style*="padding:56px 56px"],.tcf-p-profile [style*="padding:24px 56px"]{padding-left:16px!important;padding-right:16px!important}'
             . '.tcf-p-profile .tcfp-hero,.tcf-p-profile .tcfp-main,.tcf-p-profile [style*="grid-template-columns:1fr 1fr"],.tcf-p-profile [style*="grid-template-columns:repeat("]{grid-template-columns:minmax(0,1fr)!important}'
             . '.tcf-p-profile .tcfp-nav{display:none!important}.tcf-p-profile h1{font-size:40px!important}'
             . '.tcf-p-profile [style*="padding:36px"],.tcf-p-profile [style*="padding:48px"]{padding:22px 18px!important}'
             . '.tcf-p-profile [style*="height:110px"]{height:auto!important;padding-top:14px!important;padding-bottom:14px!important;flex-wrap:wrap}'
             . '.tcf-p-profile [style*="height:110px"] img{height:56px!important}}</style>';
        $noscript = '<div style="max-width:760px;margin:0 auto;padding:120px 24px;font-size:20px">This form needs JavaScript. Please enable it, or email your school details to <a href="mailto:providers@taxcoursefinder.com">providers@taxcoursefinder.com</a>.</div>';
        return $css . '<div class="tcf-page tcf-scope tcf-p-profile"><div id="tcf-profile-root" class="tcf-root">' . $noscript . '</div></div>'
            . '<template id="tcf-profile-tpl">' . $tpl . '</template>'
            . '<script>window.TCF_PROFILE=' . str_replace('</', '<\\/', (string) wp_json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) . ';</script>'
            . '<script>' . $js . '</script>';
    }

    /* ---------------- submission ---------------- */

    private static function fail(string $msg, int $code = 400): void {
        wp_send_json_error(['message' => $msg], $code);
    }

    private static function clean($val, string $kind) {
        if (strpos($kind, 'multi:') === 0) {
            $allowed = self::choices(substr($kind, 6));
            // the form sends labels; store the field's choice keys
            return array_keys(array_intersect($allowed, array_map('strval', (array) $val)));
        }
        if (is_array($val) || is_object($val)) return '';
        $val = (string) $val;
        if (strpos($kind, 'choice:') === 0) return array_key_exists($val, self::choices(substr($kind, 7))) ? $val : '';
        switch ($kind) {
            case 'url': return mb_substr(esc_url_raw(trim($val), ['http', 'https']), 0, 500);
            case 'email': return mb_substr(sanitize_email($val), 0, 200);
            case 'textarea': case 'faqs': return mb_substr(sanitize_textarea_field($val), 0, 5000);
        }
        return mb_substr(sanitize_text_field($val), 0, 300);
    }

    public static function submit(): void {
        if (!empty($_POST['company_fax'])) wp_send_json_success(['ok' => true]); // spam trap: pretend success
        $started = (int) ($_POST['started'] ?? 0);
        if ($started && time() - $started < 5) self::fail('That was quick! Please review your details and submit again.');
        $ip = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '') . wp_salt('nonce'));
        $hits = (int) get_transient('tcfd_pf_' . substr($ip, 0, 32));
        if ($hits >= 6) self::fail('Too many submissions from this connection. Please wait an hour or email providers@taxcoursefinder.com.', 429);

        $raw = json_decode(wp_unslash((string) ($_POST['payload'] ?? '')), true);
        if (!is_array($raw)) self::fail('Your form data could not be read. Please try again.');
        $v = [];
        foreach (self::school_map() as $name => [, $kind]) $v[$name] = self::clean($raw['v'][$name] ?? '', $kind);
        $courses = [];
        foreach (['ce', 'qe'] as $c) {
            $in = is_array($raw[$c] ?? null) ? $raw[$c] : [];
            $row = ['offered' => !empty($in['offered']), 'course_url' => self::clean($in['course_url'] ?? '', 'url'), 'price' => self::clean($in['price'] ?? '', 'text')];
            foreach (self::course_map() as $name => [, $kind]) $row[$name] = self::clean($in[$name] ?? '', $kind);
            $courses[$c] = $row;
        }
        if ($v['school_name'] === '' || $v['ctec_number'] === '' || $v['contact_name'] === '' || !is_email($v['contact_email'])) {
            self::fail('Please fill in the school name, CTEC provider number, your name and a valid email address.');
        }

        $token = sanitize_text_field(wp_unslash((string) ($_POST['token'] ?? '')));
        $pid = $token !== '' ? self::provider_for_token($token) : 0;
        if (!$pid) $pid = self::match_provider($v['ctec_number'], $v['school_name']);

        $sub = wp_insert_post(['post_type' => self::CPT, 'post_status' => 'draft', 'post_title' => $v['school_name'] . ' – ' . wp_date('M j, Y')], true);
        if (is_wp_error($sub)) self::fail('Could not save your submission. Please try again.', 500);
        $sub = (int) $sub;

        $media = ['logo' => 0, 'screenshots' => []];
        if (!empty($_FILES['logo']['name'])) {
            $media['logo'] = self::upload($_FILES['logo'], $sub, $v['school_name'] . ' logo');
        }
        if (!empty($_FILES['screenshots']['name']) && is_array($_FILES['screenshots']['name'])) {
            $n = 0;
            foreach (array_keys($_FILES['screenshots']['name']) as $i) {
                if ($n >= 3 || empty($_FILES['screenshots']['name'][$i])) continue;
                $file = [];
                foreach (['name', 'type', 'tmp_name', 'error', 'size'] as $k) $file[$k] = $_FILES['screenshots'][$k][$i];
                $aid = self::upload($file, $sub, $v['school_name'] . ' CTEC course screenshot ' . (++$n));
                if ($aid) $media['screenshots'][] = $aid;
            }
        }

        update_post_meta($sub, '_tcfd_payload', wp_slash(wp_json_encode(['v' => $v, 'ce' => $courses['ce'], 'qe' => $courses['qe']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)));
        update_post_meta($sub, '_tcfd_media', $media);
        update_post_meta($sub, '_tcfd_provider', $pid);
        update_post_meta($sub, '_tcfd_via_token', $pid && $token !== '' ? 1 : 0);
        update_post_meta($sub, '_tcfd_notify', !empty($_POST['notify']) ? 1 : 0);
        set_transient('tcfd_pf_' . substr($ip, 0, 32), $hits + 1, HOUR_IN_SECONDS);

        $to = apply_filters('tcfd_profile_notify_to', get_option('admin_email'));
        $body = "A school submitted its profile details for review.\n\n"
              . 'School: ' . $v['school_name'] . "\nCTEC number: " . $v['ctec_number'] . "\nContact: " . $v['contact_name'] . ' <' . $v['contact_email'] . ">\n"
              . 'Listing: ' . ($pid ? get_the_title($pid) . ($token !== '' ? ' (private link)' : ' (matched by name/number)') : 'no matching listing yet') . "\n\n"
              . "Review and apply: " . admin_url('post.php?post=' . $sub . '&action=edit') . "\n\n"
              . "Nothing is published until you apply the fields and switch the school page live.";
        if ($to) wp_mail($to, '[Tax Course Finder] School profile submitted: ' . $v['school_name'], $body, ['Reply-To: ' . $v['contact_name'] . ' <' . $v['contact_email'] . '>']);
        wp_send_json_success(['ok' => true]);
    }

/** Public "verify your listing" form: only the fields the directory shows and filters on. */
    public static function submit_listing(): void {
        if (!empty($_POST['company_fax'])) wp_send_json_success(['ok' => true]); // spam trap: pretend success
        $started = (int) ($_POST['started'] ?? 0);
        if ($started && time() - $started < 5) self::fail('That was quick! Please review your details and submit again.');
        $ip = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '') . wp_salt('nonce'));
        $hits = (int) get_transient('tcfd_pf_' . substr($ip, 0, 32));
        if ($hits >= 6) self::fail('Too many submissions from this connection. Please wait an hour or email providers@taxcoursefinder.com.', 429);

        $in = fn(string $k, string $kind = 'text') => self::clean(wp_unslash((string) ($_POST[$k] ?? '')), $kind);
        $v = ['school_name' => $in('school_name'), 'website' => $in('website', 'url'), 'ctec_number' => $in('ctec_number'),
              'contact_name' => $in('contact_name'), 'contact_email' => $in('contact_email', 'email'), 'contact_phone' => $in('contact_phone'),
              // school profile page fields (same names as the private profile form, so review and apply already handle them)
              'intro' => $in('intro', 'textarea'), 'about' => $in('about', 'textarea'), 'phone' => $in('phone'), 'support_email' => $in('support_email', 'email'), 'hours' => $in('hours')];
        if ($v['school_name'] === '' || $v['contact_name'] === '' || !is_email($v['contact_email'])) {
            self::fail('Please fill in the school name, your name and a valid email address.');
        }
        if (empty($_POST['confirm'])) self::fail('Please confirm that you are authorized to submit these details.');
        $reporting = $in('reporting', 'choice:reporting');
        $part = sanitize_key((string) ($_POST['part'] ?? '')) === 'profile' ? 'profile' : 'verify'; // short verify form, or the longer profile page form
        $courses = [];
        foreach (['ce', 'qe'] as $c) {
            $courses[$c] = ['offered' => !empty($_POST[$c . '_offered']), 'price' => $in($c . '_price'), 'regular' => $in($c . '_regular'),
                            'course_url' => $in($c . '_url', 'url'), 'reporting_time' => $reporting,
                            'access_period' => $in($c . '_access_period'), 'attempts' => $in($c . '_attempts'),
                            'options' => implode("\n", array_filter(array_map(function ($i) use ($in, $c) { // "Name | price | regular" lines
                                $l = str_replace('|', '/', $in($c . '_opt' . $i . '_label')); $pr = $in($c . '_opt' . $i . '_price');
                                if ($l === '' || !preg_match('/\d/', $pr)) return '';
                                $rg = $in($c . '_opt' . $i . '_regular');
                                return $l . ' | ' . preg_replace('/[^\d.,]/', '', $pr) . (preg_match('/\d/', $rg) ? ' | ' . preg_replace('/[^\d.,]/', '', $rg) : '');
                            }, [1, 2, 3]))),
                            'refund_window' => $in('refund_window'), 'refund_url' => $in('refund_url', 'url'), 'refund_conditions' => $in('refund_conditions', 'textarea')];
        }
        if ($part === 'profile') { // no course checkboxes on this form: a course counts when its details are filled in
            foreach (['ce', 'qe'] as $c) $courses[$c]['offered'] = $courses[$c]['options'] !== '' || $courses[$c]['attempts'] !== '';
        } elseif (!$courses['ce']['offered'] && !$courses['qe']['offered']) self::fail('Please choose at least one course you offer.');
        $picked = array_map('sanitize_key', (array) wp_unslash($_POST['features'] ?? []));
        $features = []; // only the feature groups this form asks about (support on the profile form, the rest on the verify form)
        foreach (self::listing_features() as $group => $items) {
            if (($group === 'Support') !== ($part === 'profile')) continue;
            foreach ($items as $k => $l) $features[$k] = in_array($k, $picked, true);
        }
        $offers = []; // one coupon per course
        foreach (['ce', 'qe'] as $c) {
            $exp = $in($c . '_coupon_expires');
            $offers[$c] = ['code' => strtoupper(preg_replace('/\s+/', '', $in($c . '_coupon_code'))), 'details' => $in($c . '_coupon_details'),
                           'scope' => $c, 'expires' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $exp) ? $exp : ''];
        }

        $pid = self::match_provider($v['ctec_number'], $v['school_name']);
        $sub = wp_insert_post(['post_type' => self::CPT, 'post_status' => 'draft', 'post_title' => $v['school_name'] . ($part === 'profile' ? ' – profile page form – ' : ' – listing form – ') . wp_date('M j, Y')], true);
        if (is_wp_error($sub)) self::fail('Could not save your submission. Please try again.', 500);
        $sub = (int) $sub;
        $media = ['logo' => 0, 'screenshots' => []];
        $logo_ok = !empty($_POST['logo_ok']); // the school must give permission before its logo is shown
        if ($logo_ok && !empty($_FILES['logo']['name'])) $media['logo'] = self::upload($_FILES['logo'], $sub, $v['school_name'] . ' logo');
        if (!empty($_FILES['photo']['name'])) $media['photo'] = self::upload($_FILES['photo'], $sub, $v['school_name'] . ' school photo');
        if (!empty($_FILES['screenshots']['name']) && is_array($_FILES['screenshots']['name'])) {
            $n = 0;
            foreach (array_keys($_FILES['screenshots']['name']) as $i) {
                if ($n >= 3 || empty($_FILES['screenshots']['name'][$i])) continue;
                $file = [];
                foreach (['name', 'type', 'tmp_name', 'error', 'size'] as $k) $file[$k] = $_FILES['screenshots'][$k][$i];
                $aid = self::upload($file, $sub, $v['school_name'] . ' CTEC course screenshot ' . (++$n));
                if ($aid) $media['screenshots'][] = $aid;
            }
        }

        $payload = ['kind' => 'listing', 'part' => $part, 'logo_permission' => $logo_ok && $media['logo'] ? wp_date('Y-m-d H:i') : '', 'v' => $v, 'ce' => $courses['ce'], 'qe' => $courses['qe'], 'features' => $features, 'offers' => $offers];
        update_post_meta($sub, '_tcfd_payload', wp_slash(wp_json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)));
        update_post_meta($sub, '_tcfd_media', $media);
        update_post_meta($sub, '_tcfd_provider', $pid);
        update_post_meta($sub, '_tcfd_via_token', 0);
        set_transient('tcfd_pf_' . substr($ip, 0, 32), $hits + 1, HOUR_IN_SECONDS);

        $to = apply_filters('tcfd_profile_notify_to', get_option('admin_email'));
        $body = "A school submitted the listing verification form.\n\n"
              . 'School: ' . $v['school_name'] . "\nCTEC number: " . $v['ctec_number'] . "\nContact: " . $v['contact_name'] . ' <' . $v['contact_email'] . '>' . ($v['contact_phone'] ? ' · ' . $v['contact_phone'] : '') . "\n"
              . ($payload['logo_permission'] ? 'Logo: uploaded, with permission to display it (given ' . $payload['logo_permission'] . ")\n" : '')
              . 'Listing: ' . ($pid ? get_the_title($pid) . ' (matched by name/number)' : 'no matching listing yet') . "\n\n"
              . 'Review and apply to the listing: ' . admin_url('post.php?post=' . $sub . '&action=edit');
        if ($to) wp_mail($to, '[Tax Course Finder] Listing verification: ' . $v['school_name'], $body, ['Reply-To: ' . $v['contact_name'] . ' <' . $v['contact_email'] . '>']);
        wp_send_json_success(['ok' => true]);
    }

        private static function match_provider(string $ctec, string $name): int {
        if ($ctec !== '') {
            $ids = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids',
                              'meta_key' => 'provider_ctec_number', 'meta_value' => $ctec]);
            if ($ids) return (int) $ids[0];
        }
        $canon = fn($s) => trim(preg_replace('/[^a-z0-9]+/', ' ', strtolower(preg_replace('/\b(inc|llc|corp|co|ltd)\b\.?/i', '', (string) $s))));
        $want = $canon($name);
        if ($want === '') return 0;
        foreach (get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids']) as $id) {
            if ($canon(get_the_title($id)) === $want || $canon(TCFD_Store::raw((int) $id, 'provider_display_name')) === $want) return (int) $id;
        }
        return 0;
    }

    private static function upload(array $file, int $parent, string $alt): int {
        if (!empty($file['error']) || empty($file['tmp_name']) || (int) $file['size'] > self::MAX_BYTES) return 0;
        $check = wp_check_filetype_and_ext($file['tmp_name'], $file['name'], self::MIMES);
        if (empty($check['type']) || !in_array($check['type'], self::MIMES, true)) return 0;
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $file['name'] = sanitize_file_name(sanitize_title($alt) . '.' . $check['ext']);
        $key = 'tcfd_upload';
        $_FILES[$key] = $file;
        $aid = media_handle_upload($key, $parent, ['post_title' => $alt], ['test_form' => false, 'mimes' => self::MIMES]);
        unset($_FILES[$key]);
        if (is_wp_error($aid)) return 0;
        update_post_meta((int) $aid, '_wp_attachment_image_alt', $alt);
        return (int) $aid;
    }

    /* ---------------- review & apply ---------------- */

    public static function payload(int $sub): array {
        $p = json_decode((string) get_post_meta($sub, '_tcfd_payload', true), true);
        return is_array($p) ? $p : ['v' => [], 'ce' => [], 'qe' => []];
    }

    private static function faqs_from_text(string $t): array {
        $out = [];
        foreach (preg_split('/\n\s*\n/', trim(str_replace("\r", '', $t))) as $block) {
            $lines = array_values(array_filter(array_map('trim', explode("\n", $block)), 'strlen'));
            if (count($lines) >= 2) $out[] = ['q' => $lines[0], 'a' => implode(' ', array_slice($lines, 1))];
        }
        if (!$out) { // no blank lines between pairs: alternate question / answer
            $lines = array_values(array_filter(array_map('trim', explode("\n", $t)), 'strlen'));
            for ($i = 0; $i + 1 < count($lines); $i += 2) $out[] = ['q' => $lines[$i], 'a' => $lines[$i + 1]];
        }
        return array_slice($out, 0, 5);
    }

    private static function money_from_text(string $s): ?float {
        return preg_match('/(\d[\d,]*(?:\.\d{1,2})?)/', $s, $m) ? (float) str_replace(',', '', $m[1]) : null;
    }

    /** Rows shown on the review screen: id => [group, label, current display, submitted display, value to store, differs]. */
    public static function rows(int $sub, int $pid): array {
        $p = self::payload($sub);
        $rows = [];
        $disp = function ($val, string $kind): string {
            if (is_array($val)) {
                if ($kind === 'faqs') return implode("\n", array_map(fn($r) => 'Q: ' . ($r['q'] ?? '') . "\nA: " . ($r['a'] ?? ''), $val));
                if (strpos($kind, 'multi:') === 0) { $l = self::choices(substr($kind, 6)); return implode(', ', array_map(fn($k) => $l[$k] ?? $k, $val)); }
                return implode(', ', $val);
            }
            if (strpos($kind, 'choice:') === 0 && $val !== '') { $l = self::choices(substr($kind, 7)); return (string) ($l[$val] ?? $val); }
            if ($kind === 'bool') return $val ? 'Yes' : 'No';
            return (string) $val;
        };
        $norm = fn($x) => is_array($x) ? wp_json_encode(array_values($x)) : trim((string) $x);
        $add = function (string $id, string $group, string $label, $cur, $new, string $kind) use (&$rows, $disp, $norm) {
            if ($new === '' || $new === [] || $new === null) return;
            $rows[$id] = [$group, $label, $disp($cur, $kind), $disp($new, $kind), $new, $norm($cur) !== $norm($new)];
        };
        $v = $p['v'] ?? [];
        foreach (self::school_map() as $name => [$label, $kind, $target]) {
            if ($target === '') continue;
            $new = $v[$name] ?? '';
            if ($kind === 'faqs') { $new = $new !== '' ? self::faqs_from_text($new) : ''; $cur = $pid ? array_map(fn($r) => ['q' => (string) ($r['q'] ?? ''), 'a' => (string) ($r['a'] ?? '')], (array) TCFD_Store::get($pid, 'school_faqs')) : []; }
            else $cur = $pid ? TCFD_Store::raw($pid, $target) : '';
            $add('s:' . $target, 'School', $label, $cur ?? '', $new, $kind);
        }
        $media = (array) get_post_meta($sub, '_tcfd_media', true);
        if (!empty($media['logo'])) $add('m:provider_logo', 'School', 'Logo', $pid ? (int) TCFD_Store::raw($pid, 'provider_logo') : 0, (int) $media['logo'], 'image');
        if (!empty($media['photo'])) $add('m:school_photo', 'School', 'School photo', $pid ? (int) TCFD_Store::raw($pid, 'school_photo') : 0, (int) $media['photo'], 'image');
        if (!empty($media['screenshots'])) $add('m:school_screenshots', 'School', 'Screenshots', $pid ? array_map('intval', (array) TCFD_Store::raw($pid, 'school_screenshots')) : [], array_map('intval', $media['screenshots']), 'images');
        foreach (['ce' => ['20-hour course', 'offers_20_hour_ce'], 'qe' => ['60-hour course', 'offers_60_hour_qe']] as $c => [$group, $flag]) {
            $in = $p[$c] ?? [];
            if (($p['part'] ?? '') !== 'profile') $add('f:' . $c, $group, 'Offers this course', $pid ? (bool) TCFD_Store::raw($pid, $flag) : false, !empty($in['offered']), 'bool');
            if (empty($in['offered'])) continue; // not offered: nothing else from this course is stored
            $add('c:' . $c . ':url', $group, 'Course page URL', $pid ? (string) TCFD_Store::raw($pid, $c . '_course_url') : '', $in['course_url'] ?? '', 'url');
            $price = self::money_from_text((string) ($in['price'] ?? ''));
            if ($price !== null) $add('c:' . $c . ':price', $group, ($p['kind'] ?? '') === 'listing' ? 'Course bundle price (shown on the site once applied)' : 'Price (school-reported, saved as REVIEW)', $pid ? (string) TCFD_Store::raw($pid, $c . '_current_price') : '', (string) $price, 'text');
            $regular = self::money_from_text((string) ($in['regular'] ?? ''));
            if ($regular !== null) $add('c:' . $c . ':regular', $group, 'Regular price (when the course is on sale)', $pid ? (string) TCFD_Store::raw($pid, $c . '_regular_price') : '', (string) $regular, 'text');
            if (!empty($in['options'])) $add('c:' . $c . ':options', $group, 'Package options (name | price | regular)', $pid ? (string) TCFD_Store::raw($pid, $c . '_price_options') : '', (string) $in['options'], 'textarea');
            $g = $pid ? TCFD_Store::get($pid, 'school_' . $c) : [];
            $g = is_array($g) ? $g : [];
            foreach (self::course_map() as $name => [$label, $kind, $sub_field]) {
                $add('g:' . $c . ':' . $sub_field, $group, $label, $g[$sub_field] ?? '', $in[$name] ?? '', $kind);
            }
        }
        if (isset($p['features']) && is_array($p['features'])) {
            foreach (self::listing_features() as $group => $items) {
                foreach ($items as $k => $label) {
                    if (!array_key_exists($k, $p['features'])) continue;
                    $add('x:' . $k, 'Directory features · ' . $group, $label, $pid ? (bool) TCFD_Store::raw($pid, $k) : false, (bool) $p['features'][$k], 'bool');
                }
            }
        }
        $list = isset($p['offers']) ? (array) $p['offers'] : (isset($p['offer']) ? ['new' => $p['offer']] : []); // older submissions: one shared coupon
        $names = ['ce' => '20-Hour CE', 'qe' => '60-Hour QE', 'both' => 'Both'];
        foreach ($list as $slot => $o) {
            if (empty($o['code']) && empty($o['details'])) continue;
            $scope = $names[$o['scope'] ?? 'both'] ?? 'Both';
            $new = trim(($o['code'] ? $o['code'] . ' – ' : '') . ($o['details'] ?? '') . ' (' . $scope . ($o['expires'] ? ', expires ' . $o['expires'] : '') . ')');
            $cur = [];
            if ($pid) foreach (TCFD_Store::offers($pid) as $r) {
                if (empty($r['offer_active'])) continue;
                $rs = TCFD_Store::scope_code((string) ($r['offer_course_scope'] ?? ''));
                if ($slot === 'new' || $rs === $slot || $rs === 'both') $cur[] = trim((string) ($r['coupon_code'] ?? '') . ' ' . (string) ($r['offer_title'] ?? ''));
            }
            $rows['o:' . $slot] = ['Coupons', $scope . ' coupon (added as verified and shown on the site)', implode('; ', $cur), $new, $o, true];
        }
        return $rows;
    }

    public static function review_box(): void {
        add_meta_box('tcfd_profile_review', 'Submitted school details', [__CLASS__, 'review_html'], self::CPT, 'normal', 'high');
        remove_meta_box('submitdiv', self::CPT, 'side');
        add_meta_box('tcfd_profile_meta', 'Submission', [__CLASS__, 'meta_html'], self::CPT, 'side', 'high');
    }

    public static function meta_html(WP_Post $post): void {
        $p = self::payload($post->ID);
        $v = $p['v'] ?? [];
        $applied = get_post_meta($post->ID, '_tcfd_applied', true);
        echo '<p><strong>Status:</strong> ' . ($applied ? 'Applied ' . esc_html(wp_date('M j, Y g:ia', (int) $applied)) : 'Awaiting review') . '</p>';
        echo '<p><strong>Received:</strong> ' . esc_html(get_the_date('M j, Y g:ia', $post)) . '</p>';
        echo '<p><strong>Contact:</strong> ' . esc_html($v['contact_name'] ?? '') . '<br><a href="mailto:' . esc_attr($v['contact_email'] ?? '') . '">' . esc_html($v['contact_email'] ?? '') . '</a></p>';
        echo '<p><strong>Approved for:</strong> ' . esc_html(self::APPROVED[$v['approved_types'] ?? ''] ?? 'Not given') . '</p>';
        if (!empty($p['logo_permission'])) echo '<p><strong>Logo permission:</strong> Given ' . esc_html($p['logo_permission']) . '</p>';
        echo '<p><strong>Re-check reminders:</strong> ' . (get_post_meta($post->ID, '_tcfd_notify', true) ? 'Yes, wants emails' : 'No') . '</p>';
        echo '<p><strong>Came in via:</strong> ' . (get_post_meta($post->ID, '_tcfd_via_token', true) ? 'Private provider link' : 'General form link') . '</p>';
        echo '<p><a class="submitdelete" style="color:#b32d2e" href="' . esc_url(get_delete_post_link($post->ID)) . '">Move to Trash</a></p>';
    }

    public static function review_html(WP_Post $post): void {
        $pid = (int) get_post_meta($post->ID, '_tcfd_provider', true);
        if ($pid && !get_post($pid)) $pid = 0;
        $rows = self::rows($post->ID, $pid);
        echo '<style>.tcfd-rv td,.tcfd-rv th{vertical-align:top}.tcfd-rv td.v{white-space:pre-wrap;max-width:420px}.tcfd-rv tr.same td{color:#8c8f94}.tcfd-rv .grp th{background:#f6f7f7;font-weight:600}.tcfd-rv img{max-width:120px;height:auto;margin:0 6px 6px 0;border:1px solid #ddd}</style>';
        // Part of WordPress's own post form (no nested form): the Apply button submits it and save_post runs apply().
        wp_nonce_field('tcfd_profile_apply_' . $post->ID, 'tcfd_apply_nonce');
        echo '<p><label><strong>Apply to listing:</strong> <select name="provider"><option value="0">— Create a new draft listing —</option>';
        foreach (get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'any', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC']) as $pp) {
            echo '<option value="' . (int) $pp->ID . '"' . selected($pid, $pp->ID, false) . '>' . esc_html($pp->post_title . ($pp->post_status !== 'publish' ? ' (' . $pp->post_status . ')' : '')) . '</option>';
        }
        echo '</select></label>';
        if ($pid) echo ' <a href="' . esc_url(get_edit_post_link($pid)) . '">Open listing</a>';
        echo '</p><p class="description">Checked rows are written to the listing when you click Apply. Rows that already match are unchecked and greyed out. ' . ((self::payload($post->ID)['kind'] ?? '') === 'listing'
            ? 'This came from the public listing form: the prices, coupon and directory features you apply go live in the directory right away (applying is the verification). The school’s profile page is switched on and the listing marked verified, and its “data last checked” date is set to today.'
            : 'Applying never switches the school page live, and prices are saved with status REVIEW until you verify them.') . ' If you change the listing above, click Apply once with nothing checked to refresh the comparison.</p>';
        if (!$rows) { echo '<p>No details were submitted.</p><p><button class="button" name="tcfd_do_apply" value="1">Save listing choice</button></p>'; return; }
        echo '<table class="widefat striped tcfd-rv"><thead><tr><th style="width:28px"><input type="checkbox" onclick="document.querySelectorAll(\'.tcfd-rv tbody input[type=checkbox]\').forEach(c=>c.checked=this.checked)"></th><th>Field</th><th>Listing now</th><th>Submitted</th></tr></thead><tbody>';
        $group = '';
        foreach ($rows as $id => [$g, $label, $cur, $new, , $differs]) {
            if ($g !== $group) { $group = $g; echo '<tr class="grp"><th colspan="4">' . esc_html($g) . '</th></tr>'; }
            $is_img = strpos($id, 'm:') === 0;
            $show = function ($val) use ($is_img, $rows, $id) {
                if (!$is_img) return esc_html($val === '' ? '—' : $val);
                $ids = array_filter(array_map('intval', explode(', ', (string) $val)));
                return $ids ? implode('', array_map(fn($i) => wp_get_attachment_image($i, 'thumbnail'), $ids)) : '—';
            };
            echo '<tr class="' . ($differs ? '' : 'same') . '"><td><input type="checkbox" name="apply[]" value="' . esc_attr($id) . '"' . checked($differs, true, false) . '></td><td>' . esc_html($label) . '</td><td class="v">' . $show($cur) . '</td><td class="v">' . $show($new) . '</td></tr>';
        }
        echo '</tbody></table><p><button class="button button-primary button-large" name="tcfd_do_apply" value="1">Apply checked fields to listing</button></p>';
    }

    private static $applied = null;

    public static function apply(int $sub, WP_Post $post): void {
        if (empty($_POST['tcfd_do_apply']) || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || self::$applied !== null) return;
        if (!wp_verify_nonce((string) ($_POST['tcfd_apply_nonce'] ?? ''), 'tcfd_profile_apply_' . $sub) || !current_user_can('edit_post', $sub)) return;
        self::$applied = 0;
        $pid = (int) ($_POST['provider'] ?? 0);
        $pick = array_map('sanitize_text_field', (array) wp_unslash($_POST['apply'] ?? []));
        $p = self::payload($sub);
        $listing = ($p['kind'] ?? '') === 'listing';
        if (!$pid && $pick) {
            $pid = (int) wp_insert_post(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'draft', 'post_title' => (string) ($p['v']['school_name'] ?? 'New provider')]);
        }
        if ($pid && (get_post_type($pid) !== TCFD_Plugin::POST_TYPE || !current_user_can('edit_post', $pid))) return;
        update_post_meta($sub, '_tcfd_provider', $pid);
        $rows = $pid ? self::rows($sub, $pid) : [];
        $groups = [];
        $n = 0;
        foreach ($pick as $id) {
            if (!isset($rows[$id])) continue;
            $val = $rows[$id][4];
            $parts = explode(':', $id);
            switch ($parts[0]) {
                case 's':
                    if ($parts[1] === 'school_faqs') { if (function_exists('update_field')) update_field(TCFD_Fields::key('school_faqs'), $val, $pid); }
                    else TCFD_Store::set($pid, $parts[1], $val);
                    break;
                case 'm':
                    TCFD_Store::set($pid, $parts[1], $val);
                    foreach ((array) $val as $aid) if (wp_get_post_parent_id((int) $aid) === $sub) wp_update_post(['ID' => (int) $aid, 'post_parent' => $pid]);
                    break;
                case 'f':
                    TCFD_Store::set($pid, $parts[1] === 'ce' ? 'offers_20_hour_ce' : 'offers_60_hour_qe', $val ? 1 : 0);
                    break;
                case 'x':
                    TCFD_Store::set($pid, $parts[1], $val ? 1 : 0);
                    break;
                case 'o':
                    $o = (array) $val;
                    $rows_o = TCFD_Store::offers($pid);
                    $rows_o[] = ['offer_active' => 1, 'offer_type' => !empty($o['code']) ? 'Coupon Code' : 'Special Offer',
                                 'offer_course_scope' => ['ce' => '20-Hour CE', 'qe' => '60-Hour QE', 'both' => 'Both'][$o['scope'] ?? 'both'] ?? 'Both',
                                 'offer_import_status' => !empty($o['code']) ? 'VERIFIED PUBLIC CODE' : 'VERIFIED PUBLIC OFFER',
                                 'offer_title' => (string) ($o['details'] ?? ''), 'coupon_code' => (string) ($o['code'] ?? ''),
                                 'offer_expiration_date' => !empty($o['expires']) ? str_replace('-', '', $o['expires']) : '',
                                 'offer_last_verified' => wp_date('Ymd'), 'offer_description' => 'Submitted by the school via the listing form on ' . wp_date('Y-m-d') . '.'];
                    if (function_exists('update_field')) update_field(TCFD_Fields::key('provider_offers'), $rows_o, $pid);
                    break;
                case 'c':
                    if ($parts[2] === 'url') TCFD_Store::set($pid, $parts[1] . '_course_url', $val);
                    if ($parts[2] === 'regular') TCFD_Store::set($pid, $parts[1] . '_regular_price', (float) $val);
                    if ($parts[2] === 'options') {
                        TCFD_Store::set($pid, $parts[1] . '_price_options', (string) $val);
                        if ($listing) TCFD_Store::set($pid, $parts[1] . '_price_status', 'VERIFIED');
                    }
                    if ($parts[2] === 'price') {
                        $c = $parts[1];
                        TCFD_Store::set($pid, $c . '_current_price', (float) $val);
                        TCFD_Store::set($pid, $c . '_price_display_text', '$' . (floor((float) $val) == (float) $val ? number_format((float) $val, 0) : number_format((float) $val, 2)));
                        TCFD_Store::set($pid, $c . '_price_status', $listing ? 'VERIFIED' : 'REVIEW');  // listing form: applying is the verification
                        if (!TCFD_Store::raw($pid, $c . '_price_type')) TCFD_Store::set($pid, $c . '_price_type', 'package');
                        $note = trim((string) TCFD_Store::raw($pid, $c . '_price_notes'));
                        TCFD_Store::set($pid, $c . '_price_notes', trim($note . "\nSchool-reported price $" . $val . ' via profile form on ' . wp_date('Y-m-d') . '; verify before marking VERIFIED.'));
                    }
                    break;
                case 'g':
                    $groups[$parts[1]][$parts[2]] = $val;
                    break;
            }
            $n++;
        }
        foreach ($groups as $c => $vals) {
            $cur = TCFD_Store::get($pid, 'school_' . $c);
            $cur = is_array($cur) ? $cur : [];
            if (function_exists('update_field')) update_field('field_tcfd_school_' . $c, array_merge($cur, $vals), $pid);
        }
        if ($n && $listing) {
            TCFD_Store::set($pid, 'provider_data_last_checked', wp_date('Ymd'));
            // verify form: the listing is verified; profile page form: the school's profile page goes live too
            TCFD_Store::set($pid, 'provider_verified', 1);
            if (($p['part'] ?? '') === 'profile') TCFD_Store::set($pid, 'school_page_live', 1);
        }
        if ($n) {
            update_post_meta($sub, '_tcfd_applied', time());
            global $wpdb; // status change without re-running save_post
            $wpdb->update($wpdb->posts, ['post_status' => 'publish'], ['ID' => $sub]);
            clean_post_cache($sub);
            TCFD_Store::flush_cache($pid);
        }
        self::$applied = $n;
    }

    public static function after_apply($location, $post_id) {
        return self::$applied === null ? $location : add_query_arg('tcfd_applied', self::$applied, remove_query_arg('message', $location));
    }

    public static function notices(): void {
        if (isset($_GET['tcfd_applied']) && get_current_screen() && get_current_screen()->post_type === self::CPT) {
            $n = (int) $_GET['tcfd_applied'];
            echo '<div class="notice notice-success is-dismissible"><p>' . ($n ? esc_html($n . ' field(s) applied to the listing. The school page stays off until you verify the details and switch “School page live” on.') : 'Comparison refreshed. Nothing was changed.') . '</p></div>';
        }
        if (isset($_GET['tcfd_token']) && get_current_screen() && get_current_screen()->post_type === TCFD_Plugin::POST_TYPE) {
            echo '<div class="notice notice-success is-dismissible"><p>New private form link created. The old link no longer opens this listing.</p></div>';
        }
    }

    public static function columns(array $cols): array {
        return ['cb' => $cols['cb'] ?? '', 'title' => 'Submission', 'tcfd_listing' => 'Listing', 'tcfd_contact' => 'Contact', 'tcfd_state' => 'Status', 'date' => 'Received'];
    }

    public static function column(string $col, int $id): void {
        if ($col === 'tcfd_listing') { $pid = (int) get_post_meta($id, '_tcfd_provider', true); echo $pid && get_post($pid) ? '<a href="' . esc_url(get_edit_post_link($pid)) . '">' . esc_html(get_the_title($pid)) . '</a>' : '<em>No match</em>'; }
        if ($col === 'tcfd_contact') { $v = self::payload($id)['v'] ?? []; echo esc_html($v['contact_name'] ?? '') . '<br>' . esc_html($v['contact_email'] ?? ''); }
        if ($col === 'tcfd_state') echo get_post_meta($id, '_tcfd_applied', true) ? 'Applied' : '<strong>Awaiting review</strong>';
    }

    public static function menu_badge(): void {
        global $submenu;
        $parent = 'edit.php?post_type=' . TCFD_Plugin::POST_TYPE;
        $count = (int) (wp_count_posts(self::CPT)->draft ?? 0);
        if (!$count || empty($submenu[$parent])) return;
        foreach ($submenu[$parent] as &$item) {
            if (($item[2] ?? '') === 'edit.php?post_type=' . self::CPT) $item[0] .= ' <span class="awaiting-mod"><span class="pending-count">' . $count . '</span></span>';
        }
    }

    /* ---------------- private link on the provider screen ---------------- */

    public static function link_box(): void {
        add_meta_box('tcfd_profile_link', 'School profile form', [__CLASS__, 'link_html'], TCFD_Plugin::POST_TYPE, 'side', 'default');
    }

    public static function link_html(WP_Post $post): void {
        if ($post->post_status === 'auto-draft') { echo '<p>Save the listing first to get its private form link.</p>'; return; }
        $url = self::url($post->ID);
        echo '<p>Send this private link to the school so it can submit its details. It pre-fills what we have; submissions wait for your review.</p>';
        echo '<input type="text" readonly class="widefat" value="' . esc_attr($url) . '" onclick="this.select()">';
        echo '<p><button type="button" class="button" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.parentNode.previousElementSibling.value);this.textContent=\'Copied\'">Copy link</button> ';
        echo '<a class="button-link-delete" style="margin-left:8px" href="' . esc_url(wp_nonce_url(admin_url('admin-post.php?action=tcfd_profile_token&post=' . $post->ID), 'tcfd_profile_token_' . $post->ID)) . '" onclick="return confirm(\'Create a new link? The current link will stop pre-filling this listing.\')">New link</a></p>';
        $subs = get_posts(['post_type' => self::CPT, 'post_status' => ['draft', 'publish'], 'numberposts' => 5, 'meta_key' => '_tcfd_provider', 'meta_value' => $post->ID]);
        if ($subs) {
            echo '<p><strong>Submissions</strong></p><ul style="margin:0">';
            foreach ($subs as $s) echo '<li><a href="' . esc_url(get_edit_post_link($s->ID)) . '">' . esc_html(get_the_date('M j, Y', $s)) . '</a> – ' . (get_post_meta($s->ID, '_tcfd_applied', true) ? 'applied' : 'awaiting review') . '</li>';
            echo '</ul>';
        }
    }

    public static function regenerate(): void {
        $id = (int) ($_GET['post'] ?? 0);
        check_admin_referer('tcfd_profile_token_' . $id);
        if (!$id || get_post_type($id) !== TCFD_Plugin::POST_TYPE || !current_user_can('edit_post', $id)) wp_die('Not allowed.');
        self::token($id, true);
        wp_safe_redirect(add_query_arg(['post' => $id, 'action' => 'edit', 'tcfd_token' => 1], admin_url('post.php')));
        exit;
    }
}
