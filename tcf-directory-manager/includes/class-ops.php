<?php
/**
 * Operations dashboard (TCF Dashboard): the first screen after logging in.
 *
 * - Google Analytics: tracking tag for visitors (Measurement ID) and a summary on the dashboard
 *   (GA4 Data API with a service account the owner adds as a Viewer on the property).
 * - Email: sends through the Google Workspace mailbox over SMTP (smtp.gmail.com, App Password), so mail
 *   passes the domain's SPF/DKIM. Every site email uses it once it is set up.
 * - Provider outreach: one personal email per school (owner's wording), one follow-up after 7 days,
 *   open tracking (approximate), reply and bounce detection by reading the mailbox over IMAP (when the
 *   server supports it; otherwise Mark replied by hand), and a permanent do-not-contact list.
 * - Form entries and confirmed schools at a glance.
 */
if (!defined('ABSPATH')) exit;

class TCFD_Ops {
    const PAGE = 'tcfd-dashboard';
    const SCHOOLS = 'tcfd_outreach_v1';
    const SET = 'tcfd_ops_settings';
    const LOG = 'tcfd_ops_log';
    const CAP = 'manage_options';
    const FOLLOW_DAYS = 7;

    private static $next = null;      // message id / plain-text part for the email being sent
    private static $mail_error = '';

    /* ---------------- boot ---------------- */

    public static function boot(): void {
        add_action('admin_menu', [__CLASS__, 'menu'], 5);
        add_filter('login_redirect', [__CLASS__, 'login_redirect'], 20, 3);
        foreach (['send', 'test', 'mark', 'edit', 'queue', 'replies', 'save', 'mailtest', 'garefresh'] as $a) add_action('admin_post_tcfd_ops_' . $a, [__CLASS__, 'act_' . $a]);
        add_action('wp_ajax_nopriv_tcfd_px', [__CLASS__, 'pixel']);
        add_action('wp_ajax_tcfd_px', [__CLASS__, 'pixel']);
        add_action('phpmailer_init', [__CLASS__, 'phpmailer'], 20);
        add_action('wp_mail_failed', function ($e) { self::$mail_error = is_wp_error($e) ? $e->get_error_message() : 'Unknown error'; });
        add_action('tcfd_ops_queue_run', [__CLASS__, 'queue_run']);
        add_action('tcfd_ops_replies_run', [__CLASS__, 'check_replies']);
        add_action('init', function () { if (!wp_next_scheduled('tcfd_ops_replies_run')) wp_schedule_event(time() + 600, 'hourly', 'tcfd_ops_replies_run'); });
        add_action('wp_head', [__CLASS__, 'ga_tag'], 20);
    }

    /* ---------------- settings ---------------- */

    public static function defaults(): array {
        return [
            'from_email' => 'providers@taxcoursefinder.com', 'from_name' => 'Jeff at Tax Course Finder', 'smtp_user' => '', 'smtp_pass' => '',
            'signature' => 'Jeff', 'address' => 'Tax Course Finder LLC, 221 W 9th St PMB 1111, Wilmington, DE 19801',
            'form_url' => 'https://taxcoursefinder.com/provider-application/', 'test_to' => '',
            'subject' => '{greeting}: your Tax Course Finder listing',
            'tpl_initial' => "Hi {greeting} team,\n\nI\u{2019}m {signature} with Tax Course Finder. We help California tax preparers compare 20-hour continuing education and 60-hour qualifying education courses by price, format, and available materials.\n\nWe\u{2019}ve included {school} using information from your website, and I wanted to give you a chance to check the details.\n\nYour listing: {profile_link}\n\nWould you review your course information and let us know if anything needs updating? You can confirm the details here:\n{form_link}\n\nThe form also lets you upload your logo and give us permission to display it on your listing and school profile. This is optional.\n\nThere\u{2019}s no charge to be listed, confirm your information, or submit updates. You can also reply directly with any corrections.\n\nThank you,\n{signature}\nTax Course Finder",
            'tpl_followup' => "Hi {greeting} team,\n\nJust following up on {school}\u{2019}s free listing on Tax Course Finder:\n{profile_link}\n\nIf you\u{2019}d like to confirm your course details, submit a correction, or add your logo with permission, here\u{2019}s the form:\n{form_link}\n\nYou\u{2019}re also welcome to reply with any updates. There\u{2019}s no charge, and confirming the listing is optional.\n\nThank you,\n{signature}\nTax Course Finder",
            'footer' => "Tax Course Finder is independent of CTEC.\n{address}\nPromotional notice about our free directory. To stop these emails, reply unsubscribe.",
            'ga_mid' => '', 'ga_property' => '', 'ga_sa' => '',
        ];
    }

    public static function settings(): array {
        return array_merge(self::defaults(), (array) get_option(self::SET, []));
    }

    private static function key(): string { return hash('sha256', wp_salt('auth') . 'tcfd-ops', true); }
    private static function enc(string $plain): string {
        if ($plain === '' || !function_exists('openssl_encrypt')) return $plain;
        $iv = random_bytes(16);
        return 'enc:' . base64_encode($iv . openssl_encrypt($plain, 'aes-256-cbc', self::key(), OPENSSL_RAW_DATA, $iv));
    }
    private static function dec(string $v): string {
        if (strpos($v, 'enc:') !== 0) return $v;
        $raw = base64_decode(substr($v, 4));
        $out = openssl_decrypt(substr($raw, 16), 'aes-256-cbc', self::key(), OPENSSL_RAW_DATA, substr($raw, 0, 16));
        return $out === false ? '' : $out;
    }
    private static function smtp(): array {
        $s = self::settings();
        $user = trim($s['smtp_user']) ?: trim($s['from_email']);
        return ['user' => $user, 'pass' => self::dec((string) $s['smtp_pass']), 'from' => trim($s['from_email']), 'name' => $s['from_name']];
    }
    public static function mail_ready(): bool { $m = self::smtp(); return $m['user'] !== '' && $m['pass'] !== ''; }

    /* ---------------- email ---------------- */

    public static function phpmailer($pm): void {
        $m = self::smtp();
        if ($m['user'] !== '' && $m['pass'] !== '') {
            $pm->isSMTP();
            $pm->Host = 'smtp.gmail.com'; $pm->Port = 587; $pm->SMTPSecure = 'tls'; $pm->SMTPAuth = true;
            $pm->Username = $m['user']; $pm->Password = $m['pass'];
            $pm->setFrom($m['from'] ?: $m['user'], $m['name'], false);
            $pm->Sender = $m['from'] ?: $m['user'];
        }
        if (self::$next) {
            if (!empty(self::$next['id'])) $pm->MessageID = self::$next['id'];
            if (!empty(self::$next['alt'])) $pm->AltBody = self::$next['alt'];
        }
    }

    /** @return array [ok, error] */
    private static function send(string $to, string $subject, string $html, string $text, array $headers = [], string $msgid = ''): array {
        self::$mail_error = '';
        self::$next = ['id' => $msgid, 'alt' => $text];
        $m = self::smtp();
        $h = array_merge(['Content-Type: text/html; charset=UTF-8', 'Reply-To: ' . ($m['from'] ?: get_option('admin_email'))], $headers);
        $ok = wp_mail($to, $subject, $html, $h);
        self::$next = null;
        return [$ok, $ok ? '' : (self::$mail_error ?: 'The mail server did not accept the message.')];
    }

    private static function fill(string $tpl, array $r, array $s): string {
        return strtr($tpl, ['{greeting}' => $r['greeting'] ?: $r['school'], '{school}' => $r['school'], '{profile_link}' => $r['profile'],
                            '{form_link}' => $s['form_url'], '{signature}' => $s['signature'], '{address}' => $s['address']]);
    }

    private static function utm(string $url, string $kind): string {
        return add_query_arg(['utm_source' => 'provider_outreach', 'utm_medium' => 'email', 'utm_campaign' => $kind === 'followup' ? 'listing_check_followup' : 'listing_check'], $url);
    }

    /** Build the email for one school: subject, plain text and HTML (with an open pixel when a token is given). */
    public static function compose(array $r, string $kind, string $token = ''): array {
        $s = self::settings();
        $subject = self::fill($s['subject'], $r, $s);
        if ($kind === 'followup') $subject = 'Re: ' . $subject;
        $body = self::fill($kind === 'followup' ? $s['tpl_followup'] : $s['tpl_initial'], $r, $s);
        $footer = self::fill($s['footer'], $r, $s);
        $text = $body . "\n\n" . $footer;
        $form = self::utm($s['form_url'], $kind); $prof = self::utm($r['profile'], $kind);
        $html = '';
        foreach (preg_split("/\n\s*\n/", $body) as $para) {
            $lines = array_map(function ($l) use ($s, $r, $form, $prof) {
                $t = trim($l);
                if ($t === $s['form_url']) return '<a href="' . esc_url($form) . '" style="color:#23272A;font-weight:700">Review and confirm your school&rsquo;s listing</a>';
                $e = esc_html($l);
                if ($r['profile'] !== '') $e = str_replace(esc_html($r['profile']), '<a href="' . esc_url($prof) . '" style="color:#23272A">' . esc_html($r['profile']) . '</a>', $e);
                return $e;
            }, explode("\n", $para));
            $html .= '<p style="margin:0 0 14px">' . implode('<br>', $lines) . '</p>';
        }
        $html = '<div style="font:15px/1.55 Arial,Helvetica,sans-serif;color:#23272A;max-width:600px">' . $html
              . '<p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#6B6F74">' . nl2br(esc_html($footer)) . '</p>'
              . ($token ? '<img src="' . esc_url(admin_url('admin-ajax.php?action=tcfd_px&k=' . $token)) . '" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px">' : '')
              . '</div>';
        return ['subject' => $subject, 'text' => $text, 'html' => $html];
    }

    /* ---------------- outreach records ---------------- */

    public static function schools(): array {
        $list = get_option(self::SCHOOLS, null);
        if (!is_array($list)) {  // first run: the owner's tracker (20 schools)
            $list = [];
            $seed = json_decode((string) @file_get_contents(TCFD_DIR . 'assets/outreach-seed.json'), true) ?: [];
            foreach ($seed as $x) {
                $slug = trim((string) parse_url((string) $x['profile'], PHP_URL_PATH), '/');
                $slug = basename($slug);
                $p = $slug ? get_page_by_path($slug, OBJECT, TCFD_Plugin::POST_TYPE) : null;
                $list[$slug ?: sanitize_title($x['school'])] = array_merge($x, ['pid' => $p ? (int) $p->ID : 0, 'sent' => 0, 'msgid' => '', 'fu' => 0, 'opens' => [], 'replied' => 0,
                    'note' => '', 'removed' => 0, 'bounced' => 0, 'tokens' => [], 'queued' => 0, 'log' => []]);
            }
            add_option(self::SCHOOLS, $list, '', 'no');
        }
        return $list;
    }
    private static function save_schools(array $list): void { update_option(self::SCHOOLS, $list, false); }
    private static function log(array &$r, string $msg): void { $r['log'][] = [time(), $msg]; $r['log'] = array_slice($r['log'], -20); }

    private static function send_one(string $slug, string $kind, bool $test = false): array {
        $list = self::schools();
        if (empty($list[$slug])) return [false, 'School not found.'];
        $r = $list[$slug];
        if (!$test && $r['removed']) return [false, $r['school'] . ' is on the do-not-contact list.'];
        if (!$test && ($r['route'] !== 'email' || !is_email($r['email']))) return [false, $r['school'] . ' has no email address. Use its contact form.'];
        if (!self::mail_ready()) return [false, 'Email is not set up yet. Add the App Password under Email settings first.'];
        $token = $test ? '' : bin2hex(random_bytes(10));
        $mail = self::compose($r, $kind, $token);
        $domain = parse_url(home_url(), PHP_URL_HOST);
        $id = '<tcf-' . ($test ? 'test-' : '') . $kind . '-' . bin2hex(random_bytes(8)) . '@' . $domain . '>';
        $headers = [];
        if ($kind === 'followup' && $r['msgid']) $headers = ['In-Reply-To: ' . $r['msgid'], 'References: ' . $r['msgid']];
        $to = $test ? (self::settings()['test_to'] ?: wp_get_current_user()->user_email) : $r['email'];
        [$ok, $err] = self::send($to, ($test ? '[TEST] ' : '') . $mail['subject'], $mail['html'], $mail['text'], $headers, $id);
        if ($test) return [$ok, $ok ? 'Test email sent to ' . $to . '.' : 'Could not send: ' . $err];
        $list = self::schools(); $r = $list[$slug];
        if ($ok) {
            if ($kind === 'followup') $r['fu'] = time(); else { $r['sent'] = time(); $r['msgid'] = $id; }
            $r['tokens'][$token] = $kind; $r['queued'] = 0;
            self::log($r, ($kind === 'followup' ? 'Follow-up' : 'Email') . ' sent to ' . $r['email']);
        } else {
            $r['queued'] = 0; self::log($r, 'Send failed: ' . $err);
        }
        $list[$slug] = $r; self::save_schools($list);
        return [$ok, $ok ? ($kind === 'followup' ? 'Follow-up' : 'Email') . ' sent to ' . $r['school'] . '.' : 'Could not send to ' . $r['school'] . ': ' . $err];
    }

    /** Form entries by listing: latest submission per provider. */
    private static function submissions(int $limit = 200): array {
        $out = [];
        foreach (get_posts(['post_type' => TCFD_Profile::CPT, 'post_status' => ['draft', 'publish', 'pending', 'private'], 'numberposts' => $limit, 'orderby' => 'date', 'order' => 'DESC']) as $p) {
            $pay = json_decode((string) get_post_meta($p->ID, '_tcfd_payload', true), true) ?: [];
            $v = (array) ($pay['v'] ?? []);
            $out[] = ['id' => $p->ID, 'date' => get_post_time('U', true, $p), 'pid' => (int) get_post_meta($p->ID, '_tcfd_provider', true),
                      'school' => $v['school_name'] ?? $p->post_title, 'part' => ($pay['part'] ?? '') === 'profile' ? 'School profile form' : 'Listing verification form',
                      'name' => $v['contact_name'] ?? '', 'email' => $v['contact_email'] ?? '', 'applied' => (int) get_post_meta($p->ID, '_tcfd_applied', true),
                      'logo' => !empty($pay['logo_permission'])];
        }
        return $out;
    }

    public static function status(array $r, array $subs): array {
        $form = null; foreach ($subs as $x) if ($r['pid'] && $x['pid'] === $r['pid']) { $form = $x; break; }
        $now = time();
        if ($r['removed']) return ['removed', 'Removed', ''];
        if ($form) return ['form', $form['applied'] ? 'Confirmed' : 'Form submitted', ''];
        if ($r['bounced']) return ['bounced', 'Bounced', 'The address did not accept the email. Use the contact form instead.'];
        if ($r['replied']) return ['replied', 'Replied', $r['note']];
        if ($r['fu']) return [$now - $r['fu'] > self::FOLLOW_DAYS * DAY_IN_SECONDS ? 'quiet' : 'followed', $now - $r['fu'] > self::FOLLOW_DAYS * DAY_IN_SECONDS ? 'No response' : 'Followed up', ''];
        if ($r['sent']) return [$now - $r['sent'] >= self::FOLLOW_DAYS * DAY_IN_SECONDS ? 'due' : 'sent', $now - $r['sent'] >= self::FOLLOW_DAYS * DAY_IN_SECONDS ? 'Follow-up due' : 'Sent', ''];
        if ($r['queued']) return ['queued', 'Sending…', ''];
        return ['new', $r['route'] === 'email' ? 'Not sent' : 'Contact form', ''];
    }

    /* ---------------- open pixel ---------------- */

    public static function pixel(): void {
        $k = preg_replace('/[^a-f0-9]/', '', (string) ($_GET['k'] ?? ''));
        if (strlen($k) === 20 && !current_user_can(self::CAP)) {
            $list = self::schools();
            foreach ($list as $slug => $r) {
                if (isset($r['tokens'][$k])) { $r['opens'][] = time(); $r['opens'] = array_slice($r['opens'], -50); $list[$slug] = $r; self::save_schools($list); break; }
            }
        }
        nocache_headers();
        header('Content-Type: image/gif');
        echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        exit;
    }

    /* ---------------- replies and bounces (IMAP) ---------------- */

    public static function imap_ok(): bool { return function_exists('imap_open'); }

    /** @return string summary */
    public static function check_replies(): string {
        if (!self::imap_ok()) return 'Reply checking needs the PHP IMAP extension, which this server does not have. Mark replies by hand.';
        if (!self::mail_ready()) return 'Set up email first.';
        $m = self::smtp();
        $mb = @imap_open('{imap.gmail.com:993/imap/ssl}INBOX', $m['user'], $m['pass'], OP_READONLY, 1);
        if (!$mb) { $e = imap_last_error(); imap_errors(); return 'Could not open the mailbox: ' . ($e ?: 'unknown error') . '. Check that IMAP is on for this mailbox in Gmail settings.'; }
        $list = self::schools(); $found = 0;
        foreach ($list as $slug => $r) {
            if (!$r['sent'] || $r['replied'] || $r['removed'] || !is_email($r['email'])) continue;
            $since = date('d-M-Y', $r['sent'] - DAY_IN_SECONDS);
            $ids = imap_search($mb, 'FROM "' . $r['email'] . '" SINCE "' . $since . '"', SE_FREE, 'UTF-8');
            if ($ids) {
                $h = imap_headerinfo($mb, $ids[0]);
                $r['replied'] = $h && !empty($h->udate) ? (int) $h->udate : time();
                $body = strtolower((string) imap_fetchbody($mb, $ids[0], '1', FT_PEEK));
                $r['note'] = strpos($body, 'unsubscribe') !== false ? 'Asked to unsubscribe: remove them from the list.' : '';
                self::log($r, 'Reply received'); $found++;
            } else {
                $b = imap_search($mb, 'FROM "mailer-daemon" BODY "' . $r['email'] . '" SINCE "' . $since . '"', SE_FREE, 'UTF-8');
                if ($b && !$r['bounced']) { $r['bounced'] = time(); self::log($r, 'Bounced'); $found++; }
            }
            $list[$slug] = $r;
        }
        imap_close($mb); imap_errors(); imap_alerts();
        self::save_schools($list);
        update_option(self::LOG, ['replies_checked' => time()], false);
        return $found ? $found . ' new repl' . ($found === 1 ? 'y' : 'ies') . ' or bounce' . ($found === 1 ? '' : 's') . ' found.' : 'No new replies.';
    }

    /* ---------------- send queue ---------------- */

    public static function queue_run(): void {
        $list = self::schools(); $sent = 0;
        foreach ($list as $slug => $r) {
            if (!$r['queued']) continue;
            if ($sent >= 4) { wp_schedule_single_event(time() + 120, 'tcfd_ops_queue_run'); return; }
            self::send_one($slug, 'initial'); $sent++;
            sleep(2);
        }
    }

    /* ---------------- Google Analytics ---------------- */

    public static function ga_tag(): void {
        $id = trim((string) self::settings()['ga_mid']);
        if (!preg_match('/^G-[A-Z0-9]{4,16}$/', $id) || is_user_logged_in() || is_admin()) return;
        // the tag loads a moment after the page, so it does not slow the page down (PageSpeed)
        echo "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','" . esc_js($id) . "');"
           . "(function(){var d=0;function l(){if(d)return;d=1;var s=document.createElement('script');s.async=1;s.src='https://www.googletagmanager.com/gtag/js?id=" . esc_js($id) . "';document.head.appendChild(s)}"
           . "addEventListener('load',function(){setTimeout(l,1500)});['pointerdown','keydown','scroll','touchstart'].forEach(function(e){addEventListener(e,l,{once:true,passive:true})})})();</script>\n";
    }

    private static function ga_token(): array {
        $sa = json_decode(self::dec((string) self::settings()['ga_sa']), true);
        if (!is_array($sa) || empty($sa['client_email']) || empty($sa['private_key'])) return [null, 'Service account key not added yet.'];
        $tok = get_transient('tcfd_ga_tok');
        if ($tok) return [$tok, ''];
        $b64 = function ($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); };
        $now = time();
        $jwt = $b64(wp_json_encode(['alg' => 'RS256', 'typ' => 'JWT'])) . '.' . $b64(wp_json_encode(['iss' => $sa['client_email'], 'scope' => 'https://www.googleapis.com/auth/analytics.readonly',
               'aud' => 'https://oauth2.googleapis.com/token', 'iat' => $now, 'exp' => $now + 3600]));
        if (!openssl_sign($jwt, $sig, $sa['private_key'], 'sha256WithRSAEncryption')) return [null, 'The service account key could not be read.'];
        $res = wp_remote_post('https://oauth2.googleapis.com/token', ['timeout' => 15, 'body' => ['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $jwt . '.' . $b64($sig)]]);
        $j = is_wp_error($res) ? null : json_decode(wp_remote_retrieve_body($res), true);
        if (empty($j['access_token'])) return [null, 'Google did not accept the service account key' . (is_wp_error($res) ? ': ' . $res->get_error_message() : (isset($j['error_description']) ? ': ' . $j['error_description'] : '.'))];
        set_transient('tcfd_ga_tok', $j['access_token'], 3000);
        return [$j['access_token'], ''];
    }

    private static function ga_run(string $tok, string $prop, array $req): array {
        $res = wp_remote_post('https://analyticsdata.googleapis.com/v1beta/properties/' . rawurlencode($prop) . ':runReport',
            ['timeout' => 20, 'headers' => ['Authorization' => 'Bearer ' . $tok, 'Content-Type' => 'application/json'], 'body' => wp_json_encode($req)]);
        $j = is_wp_error($res) ? ['error' => ['message' => $res->get_error_message()]] : json_decode(wp_remote_retrieve_body($res), true);
        return is_array($j) ? $j : ['error' => ['message' => 'No answer from Google Analytics.']];
    }

    public static function ga_report(bool $fresh = false): array {
        $s = self::settings(); $prop = preg_replace('/\D/', '', (string) $s['ga_property']);
        if ($prop === '' || $s['ga_sa'] === '') return ['ok' => false, 'setup' => true];
        if (!$fresh && ($c = get_transient('tcfd_ga_report'))) return $c;
        [$tok, $err] = self::ga_token();
        if (!$tok) return ['ok' => false, 'error' => $err];
        $range = [['startDate' => '27daysAgo', 'endDate' => 'today']];
        $daily = self::ga_run($tok, $prop, ['dateRanges' => $range, 'dimensions' => [['name' => 'date']], 'metrics' => [['name' => 'activeUsers'], ['name' => 'sessions'], ['name' => 'screenPageViews']], 'orderBys' => [['dimension' => ['dimensionName' => 'date']]], 'metricAggregations' => ['TOTAL']]);
        if (!empty($daily['error'])) return ['ok' => false, 'error' => 'Google Analytics: ' . ($daily['error']['message'] ?? 'error') . ' (check the property ID and that the service account has Viewer access).'];
        $pages = self::ga_run($tok, $prop, ['dateRanges' => $range, 'dimensions' => [['name' => 'pagePath']], 'metrics' => [['name' => 'screenPageViews']], 'orderBys' => [['metric' => ['metricName' => 'screenPageViews'], 'desc' => true]], 'limit' => 8]);
        $src = self::ga_run($tok, $prop, ['dateRanges' => $range, 'dimensions' => [['name' => 'sessionDefaultChannelGroup']], 'metrics' => [['name' => 'sessions']], 'orderBys' => [['metric' => ['metricName' => 'sessions'], 'desc' => true]], 'limit' => 6]);
        $tot = $daily['totals'][0]['metricValues'] ?? [];
        $rows = []; foreach ((array) ($daily['rows'] ?? []) as $row) $rows[] = [$row['dimensionValues'][0]['value'], (int) $row['metricValues'][0]['value'], (int) $row['metricValues'][2]['value']];
        $last7 = array_slice($rows, -7);
        $out = ['ok' => true, 'at' => time(), 'users' => (int) ($tot[0]['value'] ?? 0), 'sessions' => (int) ($tot[1]['value'] ?? 0), 'views' => (int) ($tot[2]['value'] ?? 0),
                'users7' => array_sum(array_column($last7, 1)), 'daily' => $rows,
                'pages' => array_map(function ($r) { return [$r['dimensionValues'][0]['value'], (int) $r['metricValues'][0]['value']]; }, (array) ($pages['rows'] ?? [])),
                'sources' => array_map(function ($r) { return [$r['dimensionValues'][0]['value'], (int) $r['metricValues'][0]['value']]; }, (array) ($src['rows'] ?? []))];
        set_transient('tcfd_ga_report', $out, HOUR_IN_SECONDS);
        return $out;
    }

    /* ---------------- admin actions ---------------- */

    private static function guard(string $action): void {
        if (!current_user_can(self::CAP)) wp_die('Not allowed.');
        check_admin_referer($action);
    }
    private static function back(string $msg, bool $ok = true, string $view = ''): void {
        set_transient('tcfd_ops_msg_' . get_current_user_id(), [$msg, $ok], 120);
        $q = $view === 'preview' ? '&view=preview&school=' . self::slug_in() : ($view ? '&view=' . $view : '');
        wp_safe_redirect(admin_url('admin.php?page=' . self::PAGE . $q));
        exit;
    }
    private static function slug_in(): string { return sanitize_title(wp_unslash((string) ($_REQUEST['school'] ?? ''))); }

    public static function act_send(): void {
        self::guard('tcfd_ops_send');
        $kind = ($_POST['kind'] ?? '') === 'followup' ? 'followup' : 'initial';
        [$ok, $msg] = self::send_one(self::slug_in(), $kind);
        self::back($msg, $ok);
    }
    public static function act_test(): void {
        self::guard('tcfd_ops_test');
        $kind = ($_POST['kind'] ?? '') === 'followup' ? 'followup' : 'initial';
        [$ok, $msg] = self::send_one(self::slug_in(), $kind, true);
        self::back($msg, $ok, sanitize_key($_POST['view'] ?? ''));
    }
    public static function act_mark(): void {
        self::guard('tcfd_ops_mark');
        $slug = self::slug_in(); $what = sanitize_key($_POST['what'] ?? ''); $list = self::schools();
        if (empty($list[$slug])) self::back('School not found.', false);
        $r = $list[$slug];
        switch ($what) {
            case 'replied': $r['replied'] = time(); self::log($r, 'Marked replied'); $msg = $r['school'] . ' marked as replied.'; break;
            case 'unreplied': $r['replied'] = 0; $r['note'] = ''; self::log($r, 'Reply mark cleared'); $msg = 'Reply mark cleared for ' . $r['school'] . '.'; break;
            case 'sent': $r['sent'] = $r['sent'] ?: time(); self::log($r, 'Marked sent (contact form)'); $msg = $r['school'] . ' marked as contacted.'; break;
            case 'remove': $r['removed'] = time(); $r['queued'] = 0; self::log($r, 'Removed from outreach (do not contact)'); $msg = $r['school'] . ' removed. It will not be emailed again. Its directory listing is not changed.'; break;
            case 'restore': $r['removed'] = 0; self::log($r, 'Restored to outreach'); $msg = $r['school'] . ' is back on the outreach list.'; break;
            default: self::back('Unknown action.', false);
        }
        $list[$slug] = $r; self::save_schools($list);
        self::back($msg);
    }
    public static function act_edit(): void {
        self::guard('tcfd_ops_edit');
        $slug = self::slug_in(); $list = self::schools();
        if (empty($list[$slug])) self::back('School not found.', false, 'outreach');
        $r = $list[$slug];
        $email = sanitize_email(wp_unslash((string) ($_POST['email'] ?? '')));
        $raw = trim((string) wp_unslash($_POST['email'] ?? ''));
        if ($raw !== '' && !is_email($email)) self::back('"' . $raw . '" is not a valid email address. Nothing was changed.', false, 'outreach');
        if ($email === '' && $r['contact_url'] === '') self::back('Please enter an email address for ' . $r['school'] . '.', false, 'outreach');
        $old = $r['email'];
        $r['email'] = $email; $r['route'] = $email !== '' ? 'email' : 'form';
        if (strtolower($old) !== strtolower($email)) {
            $r['bounced'] = 0;  // a new address gets a fresh start
            self::log($r, 'Email changed from ' . ($old ?: 'none') . ' to ' . ($email ?: 'none (contact form)'));
        }
        $list[$slug] = $r; self::save_schools($list);
        self::back($old === $email ? 'No change for ' . $r['school'] . '.' : $r['school'] . ($email ? ' will now be emailed at ' . $email . '.' : ' now uses its contact form.')
            . ($r['sent'] && $email && strtolower($old) !== strtolower($email) ? ' The first email already went to ' . $old . '; the follow-up will go to the new address.' : ''), true, 'outreach');
    }

    public static function act_queue(): void {
        self::guard('tcfd_ops_queue');
        if (!self::mail_ready()) self::back('Email is not set up yet. Add the App Password under Email settings first.', false);
        $max = ($_POST['count'] ?? '') === 'all' ? 999 : 3;
        $list = self::schools(); $n = 0;
        foreach ($list as $slug => $r) {
            if ($n >= $max) break;
            if ($r['sent'] || $r['removed'] || $r['queued'] || $r['route'] !== 'email' || !is_email($r['email'])) continue;
            $list[$slug]['queued'] = time(); $n++;
        }
        self::save_schools($list);
        if ($n) { self::queue_run(); }
        self::back($n ? 'Sending to ' . $n . ' school' . ($n === 1 ? '' : 's') . '. Larger batches go out 4 at a time, every 2 minutes.' : 'Everyone with an email address has already been contacted.');
    }
    public static function act_replies(): void { self::guard('tcfd_ops_replies'); $m = self::check_replies(); self::back($m, strpos($m, 'Could not') === false && strpos($m, 'needs') === false); }
    public static function act_garefresh(): void { self::guard('tcfd_ops_garefresh'); delete_transient('tcfd_ga_report'); self::back('Analytics refreshed.'); }
    public static function act_mailtest(): void {
        self::guard('tcfd_ops_mailtest');
        if (!self::mail_ready()) self::back('Add the App Password first.', false, 'settings');
        $to = self::settings()['test_to'] ?: wp_get_current_user()->user_email;
        [$ok, $err] = self::send($to, 'Tax Course Finder: email test', '<p>This test came from taxcoursefinder.com through Google Workspace. Email is working.</p>', 'This test came from taxcoursefinder.com through Google Workspace. Email is working.');
        self::back($ok ? 'Test email sent to ' . $to . '. Check that inbox (and its spam folder).' : 'Could not send: ' . $err, $ok, 'settings');
    }
    public static function act_save(): void {
        self::guard('tcfd_ops_save');
        $s = self::settings(); $in = wp_unslash($_POST);
        foreach (['from_email', 'smtp_user', 'test_to'] as $k) if (isset($in[$k])) $s[$k] = sanitize_email($in[$k]);
        foreach (['from_name', 'signature', 'address', 'subject'] as $k) if (isset($in[$k])) $s[$k] = sanitize_text_field($in[$k]);
        if (isset($in['form_url'])) $s['form_url'] = esc_url_raw($in['form_url']);
        foreach (['tpl_initial', 'tpl_followup', 'footer'] as $k) if (isset($in[$k])) $s[$k] = sanitize_textarea_field($in[$k]);
        if (!empty($in['smtp_pass'])) { $s['smtp_pass'] = self::enc(preg_replace('/\s+/', '', (string) $in['smtp_pass'])); }
        $old_mid = $s['ga_mid'];
        if (isset($in['ga_mid'])) $s['ga_mid'] = strtoupper(preg_replace('/[^A-Za-z0-9-]/', '', $in['ga_mid']));
        if (isset($in['ga_property'])) $s['ga_property'] = preg_replace('/\D/', '', $in['ga_property']);
        if (!empty($in['ga_sa'])) {
            $j = json_decode((string) $in['ga_sa'], true);
            if (!is_array($j) || empty($j['client_email']) || empty($j['private_key'])) self::back('That does not look like a service account key file (JSON). Nothing was saved.', false, 'settings');
            $s['ga_sa'] = self::enc((string) $in['ga_sa']); delete_transient('tcfd_ga_tok');
        }
        if (!empty($in['reset_templates'])) { $d = self::defaults(); foreach (['subject', 'tpl_initial', 'tpl_followup', 'footer'] as $k) $s[$k] = $d[$k]; }
        update_option(self::SET, $s, false);
        delete_transient('tcfd_ga_report');
        if ($old_mid !== $s['ga_mid'] && class_exists('TCFD_Page_Cache')) TCFD_Page_Cache::clear();  // pages carry the tracking tag
        self::back('Settings saved.', true, 'settings');
    }

    /* ---------------- login and menu ---------------- */

    public static function login_redirect($to, $requested, $user) {
        if ($user instanceof WP_User && $user->has_cap(self::CAP) && ($requested === '' || $requested === admin_url() || untrailingslashit($requested) === untrailingslashit(admin_url()))) {
            return admin_url('admin.php?page=' . self::PAGE);
        }
        return $to;
    }

    public static function menu(): void {
        add_menu_page('TCF Dashboard', 'TCF Dashboard', self::CAP, self::PAGE, [__CLASS__, 'page'], 'dashicons-chart-area', 2);
    }

    /* ---------------- page ---------------- */

    private static function form(string $action, array $fields, string $label, string $cls = 'button', string $confirm = ''): string {
        $h = '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="display:inline"' . ($confirm ? ' onsubmit="return confirm(' . esc_attr(wp_json_encode($confirm)) . ')"' : '') . '>'
           . '<input type="hidden" name="action" value="' . esc_attr($action) . '">' . wp_nonce_field($action, '_wpnonce', true, false);
        foreach ($fields as $k => $v) $h .= '<input type="hidden" name="' . esc_attr($k) . '" value="' . esc_attr($v) . '">';
        return $h . '<button type="submit" class="' . esc_attr($cls) . '">' . esc_html($label) . '</button></form>';
    }
    private static function ago(int $t): string { return $t ? human_time_diff($t, time()) . ' ago' : ''; }
    private static function day(int $t): string { return $t ? wp_date('M j, Y', $t) : ''; }

    public static function page(): void {
        if (!current_user_can(self::CAP)) return;
        $view = sanitize_key($_GET['view'] ?? '');
        echo '<div class="wrap tcf-ops">';
        self::styles();
        $msg = get_transient('tcfd_ops_msg_' . get_current_user_id());
        if ($msg) { delete_transient('tcfd_ops_msg_' . get_current_user_id()); echo '<div class="notice notice-' . ($msg[1] ? 'success' : 'error') . ' is-dismissible"><p>' . esc_html($msg[0]) . '</p></div>'; }
        echo '<h1 class="tcf-ops-h1">TCF Dashboard</h1><nav class="tcf-ops-tabs">';
        foreach (['' => 'Overview', 'outreach' => 'Provider outreach', 'entries' => 'Form entries', 'settings' => 'Email & Analytics settings'] as $k => $l)
            echo '<a href="' . esc_url(admin_url('admin.php?page=' . self::PAGE . ($k ? '&view=' . $k : ''))) . '" class="' . ($view === $k ? 'on' : '') . '">' . esc_html($l) . '</a>';
        echo '</nav>';
        if ($view === 'settings') self::view_settings();
        elseif ($view === 'preview') self::view_preview();
        elseif ($view === 'entries') self::view_entries();
        elseif ($view === 'outreach') self::view_outreach(true);
        else self::view_overview();
        echo '</div>';
    }

    private static function setup_banner(): void {
        if (!self::mail_ready()) echo '<div class="tcf-ops-alert"><strong>Email is not set up yet.</strong> Until it is, emails from the site may not arrive and outreach emails cannot be sent. <a href="' . esc_url(admin_url('admin.php?page=' . self::PAGE . '&view=settings')) . '">Set up email</a></div>';
    }

    private static function view_overview(): void {
        self::setup_banner();
        self::view_ga();
        $list = self::schools(); $subs = self::submissions();
        $st = []; foreach ($list as $slug => $r) $st[$slug] = self::status($r, $subs);
        $active = array_filter($list, function ($r) { return !$r['removed']; });
        $c = function ($keys) use ($st, $list) { $n = 0; foreach ($st as $s => $x) if (in_array($x[0], (array) $keys, true)) $n++; return $n; };
        $sent = count(array_filter($active, function ($r) { return $r['sent']; }));
        $opened = count(array_filter($active, function ($r) { return !empty($r['opens']); }));
        $replied = count(array_filter($active, function ($r) { return $r['replied']; }));
        echo '<h2 class="tcf-ops-h2">Provider outreach</h2><div class="tcf-ops-cards">';
        foreach ([['Schools on the list', count($active), ''], ['Emails sent', $sent, ''], ['Opened', $opened, $sent ? round($opened * 100 / $sent) . '% of sent' : ''], ['Replied', $replied, $sent ? round($replied * 100 / $sent) . '% of sent' : ''],
                  ['Forms submitted', $c('form'), ''], ['Follow-up due', $c('due'), $c('due') ? 'Send the follow-up' : ''], ['No response', $c('quiet'), ''], ['Not contacted yet', $c(['new']), '']] as $k)
            echo '<div class="tcf-ops-card"><div class="tcf-ops-card-n">' . esc_html((string) $k[1]) . '</div><div class="tcf-ops-card-l">' . esc_html($k[0]) . '</div>' . ($k[2] ? '<div class="tcf-ops-card-s">' . esc_html($k[2]) . '</div>' : '') . '</div>';
        echo '</div>';
        $due = array_filter($st, function ($x) { return in_array($x[0], ['due', 'bounced'], true) || ($x[2] !== '' && $x[0] === 'replied'); });
        if ($due) {
            echo '<div class="tcf-ops-box"><h3>Needs your attention</h3><ul class="tcf-ops-todo">';
            foreach ($due as $slug => $x) {
                $r = $list[$slug];
                echo '<li><strong>' . esc_html($r['school']) . '</strong> &middot; ' . esc_html($x[1]) . ($x[2] ? ' &middot; ' . esc_html($x[2]) : '') . ' ';
                if ($x[0] === 'due') echo self::form('tcfd_ops_send', ['school' => $slug, 'kind' => 'followup'], 'Send follow-up', 'button button-primary');
                if ($x[0] === 'replied' && $x[2]) echo self::form('tcfd_ops_mark', ['school' => $slug, 'what' => 'remove'], 'Remove from list', 'button', 'Remove ' . $r['school'] . ' from outreach permanently? They will not be emailed again.');
                echo '</li>';
            }
            echo '</ul></div>';
        }
        self::view_outreach(false, $list, $st);
        // schools and entries
        echo '<div class="tcf-ops-cols">';
        echo '<div class="tcf-ops-box"><h3>Confirmed schools</h3>';
        $ids = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids', 'orderby' => 'title', 'order' => 'ASC']);
        $conf = array_filter($ids, function ($id) { return (bool) TCFD_Store::raw($id, 'provider_verified'); });
        $live = array_filter($ids, function ($id) { return class_exists('TCFD_School') && TCFD_School::is_live((int) $id); });
        echo '<p class="tcf-ops-muted">' . count($ids) . ' schools listed &middot; ' . count($conf) . ' confirmed by the school &middot; ' . count($live) . ' profile pages live</p>';
        if ($conf) { echo '<ul class="tcf-ops-list">'; foreach ($conf as $id) echo '<li><a href="' . esc_url(get_edit_post_link($id)) . '">' . esc_html(get_the_title($id)) . '</a>' . (TCFD_School::is_live((int) $id) ? ' &middot; <a href="' . esc_url(get_permalink($id)) . '" target="_blank">profile page</a>' : '') . '</li>'; echo '</ul>'; }
        else echo '<p>No school has confirmed its listing yet. Schools that submit the verify form and are approved appear here.</p>';
        echo '</div><div class="tcf-ops-box"><h3>Latest form entries</h3>';
        self::entries_table(array_slice($subs, 0, 6), true);
        echo '<p><a href="' . esc_url(admin_url('admin.php?page=' . self::PAGE . '&view=entries')) . '">All form entries</a></p></div></div>';
    }

    private static function view_ga(): void {
        echo '<h2 class="tcf-ops-h2">Website visitors <span>last 28 days</span></h2>';
        $ga = self::ga_report();
        if (!empty($ga['setup'])) echo '<div class="tcf-ops-box">Google Analytics is not connected yet. <a href="' . esc_url(admin_url('admin.php?page=' . self::PAGE . '&view=settings#ga')) . '">Connect it</a> to see visitors, top pages and where visitors come from here.</div>';
        elseif (empty($ga['ok'])) echo '<div class="tcf-ops-box tcf-ops-bad">' . esc_html($ga['error']) . '</div>';
        else {
            echo '<div class="tcf-ops-cards">';
            foreach ([['Visitors', $ga['users']], ['Visitors, last 7 days', $ga['users7']], ['Visits', $ga['sessions']], ['Page views', $ga['views']]] as $k)
                echo '<div class="tcf-ops-card"><div class="tcf-ops-card-n">' . esc_html(number_format_i18n($k[1])) . '</div><div class="tcf-ops-card-l">' . esc_html($k[0]) . '</div></div>';
            echo '</div><div class="tcf-ops-cols"><div class="tcf-ops-box"><h3>Visitors per day</h3>' . self::spark($ga['daily']) . '</div>';
            echo '<div class="tcf-ops-box"><h3>Top pages</h3><table class="tcf-ops-mini">';
            foreach ($ga['pages'] as $p) echo '<tr><td>' . esc_html($p[0]) . '</td><td>' . esc_html(number_format_i18n($p[1])) . '</td></tr>';
            echo '</table></div><div class="tcf-ops-box"><h3>Where visitors come from</h3><table class="tcf-ops-mini">';
            foreach ($ga['sources'] as $p) echo '<tr><td>' . esc_html($p[0]) . '</td><td>' . esc_html(number_format_i18n($p[1])) . ' visits</td></tr>';
            echo '</table></div></div><p class="tcf-ops-muted">Updated ' . esc_html(self::ago($ga['at'])) . '. ' . self::form('tcfd_ops_garefresh', [], 'Refresh now', 'button-link') . '</p>';
        }
    }

    private static function spark(array $rows): string {
        if (!$rows) return '<p class="tcf-ops-muted">No visits yet.</p>';
        $max = max(1, max(array_column($rows, 1))); $w = 100 / count($rows); $bars = '';
        foreach (array_values($rows) as $i => $r) {
            $h = round($r[1] * 100 / $max, 1);
            $bars .= '<rect x="' . round($i * $w + $w * .15, 2) . '%" y="' . (100 - $h) . '%" width="' . round($w * .7, 2) . '%" height="' . $h . '%" rx="2" fill="#FF6B57"><title>' . esc_attr(wp_date('M j', strtotime($r[0]))) . ': ' . (int) $r[1] . ' visitors</title></rect>';
        }
        return '<svg class="tcf-ops-spark" width="100%" height="120" preserveAspectRatio="none" role="img" aria-label="Visitors per day">' . $bars . '</svg>'
             . '<div class="tcf-ops-spark-x"><span>' . esc_html(wp_date('M j', strtotime($rows[0][0]))) . '</span><span>' . esc_html(wp_date('M j', strtotime(end($rows)[0]))) . '</span></div>';
    }

    private static function view_outreach(bool $full, ?array $list = null, ?array $st = null): void {
        if ($full) self::setup_banner();
        $list = $list ?? self::schools(); $subs = $st === null ? self::submissions() : [];
        if ($st === null) { $st = []; foreach ($list as $slug => $r) $st[$slug] = self::status($r, $subs); }
        $left = count(array_filter($list, function ($r) { return !$r['sent'] && !$r['removed'] && $r['route'] === 'email' && is_email($r['email']); }));
        echo '<div class="tcf-ops-box"><div class="tcf-ops-bar"><h3>Schools</h3><div>';
        if ($left) {
            echo self::form('tcfd_ops_queue', ['count' => '3'], 'Send to the next 3', 'button button-primary', 'Send the listing email to the next 3 schools that have not been emailed?') . ' ';
            echo self::form('tcfd_ops_queue', ['count' => 'all'], 'Send to all ' . $left . ' remaining', 'button', 'Send the listing email to all ' . $left . ' schools that have not been emailed yet?') . ' ';
        }
        echo self::form('tcfd_ops_replies', [], 'Check for replies', 'button');
        echo '</div></div>';
        $chk = get_option(self::LOG, []);
        echo '<p class="tcf-ops-muted">' . (self::imap_ok() ? 'Replies and bounces are checked in the mailbox every hour' . (!empty($chk['replies_checked']) ? ' (last check ' . esc_html(self::ago((int) $chk['replies_checked'])) . ')' : '') . '.' : 'This server cannot read the mailbox, so mark replies by hand when they arrive in Gmail.')
           . ' Opens are approximate: some email apps load images automatically, others block them.</p>';
        echo '<table class="widefat striped tcf-ops-table"><thead><tr><th>School</th><th>Contact</th><th>Status</th><th>Sent</th><th>Opened</th><th>Replied</th><th>Actions</th></tr></thead><tbody>';
        $removed = [];
        foreach ($list as $slug => $r) {
            if ($r['removed']) { $removed[$slug] = $r; continue; }
            $x = $st[$slug];
            echo '<tr><td><strong>' . esc_html($r['school']) . '</strong><br><a href="' . esc_url($r['profile']) . '" target="_blank">listing</a>' . ($r['notes'] && stripos($r['notes'], 'delivery not tested') === false ? '<div class="tcf-ops-note">' . esc_html($r['notes']) . '</div>' : '') . '</td>';
            echo '<td>' . ($r['route'] === 'email' ? esc_html($r['email']) : '<a href="' . esc_url($r['contact_url']) . '" target="_blank">Contact form</a>')
               . '<details class="tcf-ops-edit"><summary>Edit</summary><form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">'
               . '<input type="hidden" name="action" value="tcfd_ops_edit">' . wp_nonce_field('tcfd_ops_edit', '_wpnonce', true, false)
               . '<input type="hidden" name="school" value="' . esc_attr($slug) . '">'
               . '<input type="email" name="email" value="' . esc_attr($r['email']) . '" placeholder="name@school.com" aria-label="Email address for ' . esc_attr($r['school']) . '">'
               . '<button type="submit" class="button button-small button-primary">Save</button>'
               . ($r['contact_url'] ? '<span class="tcf-ops-note">Leave empty to use the school&rsquo;s contact form instead.</span>' : '') . '</form></details></td>';
            echo '<td><span class="tcf-ops-pill tcf-ops-' . esc_attr($x[0]) . '">' . esc_html($x[1]) . '</span>' . ($x[2] ? '<div class="tcf-ops-note">' . esc_html($x[2]) . '</div>' : '') . '</td>';
            echo '<td>' . esc_html(self::day($r['sent'])) . ($r['fu'] ? '<br><span class="tcf-ops-muted">follow-up ' . esc_html(self::day($r['fu'])) . '</span>' : '') . '</td>';
            echo '<td>' . (!empty($r['opens']) ? esc_html(self::day((int) $r['opens'][0])) . (count($r['opens']) > 1 ? ' <span class="tcf-ops-muted">(' . count($r['opens']) . '&times;)</span>' : '') : '&ndash;') . '</td>';
            echo '<td>' . ($r['replied'] ? esc_html(self::day($r['replied'])) : '&ndash;') . '</td><td class="tcf-ops-acts">';
            $pv = '<a class="button" href="' . esc_url(admin_url('admin.php?page=' . self::PAGE . '&view=preview&school=' . $slug)) . '">' . ($r['route'] === 'email' ? 'Preview' : 'Get email text') . '</a> ';
            echo $pv;
            if ($r['route'] === 'email' && in_array($x[0], ['new', 'bounced'], true) && !$r['sent']) echo self::form('tcfd_ops_send', ['school' => $slug, 'kind' => 'initial'], 'Send', 'button button-primary', 'Send the listing email to ' . $r['school'] . ' (' . $r['email'] . ')?') . ' ';
            if ($r['route'] === 'email' && $r['sent'] && !$r['fu'] && in_array($x[0], ['sent', 'due'], true)) echo self::form('tcfd_ops_send', ['school' => $slug, 'kind' => 'followup'], 'Send follow-up', $x[0] === 'due' ? 'button button-primary' : 'button', 'Send the follow-up email to ' . $r['school'] . '?') . ' ';
            if ($r['route'] !== 'email' && !$r['sent']) echo self::form('tcfd_ops_mark', ['school' => $slug, 'what' => 'sent'], 'Mark contacted', 'button') . ' ';
            if ($r['sent'] && !$r['replied']) echo self::form('tcfd_ops_mark', ['school' => $slug, 'what' => 'replied'], 'Mark replied', 'button') . ' ';
            echo self::form('tcfd_ops_mark', ['school' => $slug, 'what' => 'remove'], 'Remove', 'button-link tcf-ops-del', 'Remove ' . $r['school'] . ' from outreach permanently? They will not be emailed again. Their directory listing stays as it is.');
            echo '</td></tr>';
        }
        echo '</tbody></table>';
        if ($removed) {
            echo '<details class="tcf-ops-removed"><summary>Removed, do not contact (' . count($removed) . ')</summary><ul>';
            foreach ($removed as $slug => $r) echo '<li>' . esc_html($r['school']) . ' &middot; removed ' . esc_html(self::day($r['removed'])) . ' ' . self::form('tcfd_ops_mark', ['school' => $slug, 'what' => 'restore'], 'Restore', 'button-link') . '</li>';
            echo '</ul></details>';
        }
        echo '</div>';
    }

    private static function entries_table(array $subs, bool $short = false): void {
        if (!$subs) { echo '<p>No form entries yet.</p>'; return; }
        echo '<table class="widefat striped tcf-ops-table"><thead><tr><th>Received</th><th>School</th>' . ($short ? '' : '<th>Form</th><th>From</th>') . '<th>Status</th><th></th></tr></thead><tbody>';
        foreach ($subs as $x) {
            echo '<tr><td>' . esc_html(wp_date('M j, g:i a', $x['date'])) . '</td><td><strong>' . esc_html($x['school']) . '</strong>' . ($x['pid'] ? '' : '<div class="tcf-ops-note">Not matched to a listing</div>') . '</td>';
            if (!$short) echo '<td>' . esc_html($x['part']) . ($x['logo'] ? '<div class="tcf-ops-note">Logo with permission</div>' : '') . '</td><td>' . esc_html($x['name']) . '<br><a href="mailto:' . esc_attr($x['email']) . '">' . esc_html($x['email']) . '</a></td>';
            echo '<td><span class="tcf-ops-pill ' . ($x['applied'] ? 'tcf-ops-form' : 'tcf-ops-due') . '">' . ($x['applied'] ? 'Applied' : 'Awaiting review') . '</span></td><td><a class="button" href="' . esc_url(get_edit_post_link($x['id'])) . '">View entry</a></td></tr>';
        }
        echo '</tbody></table>';
    }

    private static function view_entries(): void {
        echo '<div class="tcf-ops-box"><h3>Form entries</h3><p class="tcf-ops-muted">Every listing verification and school profile form. Open an entry to review it and apply it to the listing.</p>';
        self::entries_table(self::submissions(100));
        echo '</div>';
    }

    private static function view_preview(): void {
        $list = self::schools(); $slug = self::slug_in();
        if (empty($list[$slug])) { echo '<p>School not found.</p>'; return; }
        $r = $list[$slug];
        echo '<p><a href="' . esc_url(admin_url('admin.php?page=' . self::PAGE . '&view=outreach')) . '">&larr; Back to outreach</a></p>';
        foreach (['initial' => 'Listing email', 'followup' => 'Follow-up (7 days later)'] as $kind => $title) {
            $m = self::compose($r, $kind);
            echo '<div class="tcf-ops-box"><div class="tcf-ops-bar"><h3>' . esc_html($title) . '</h3><div>' . self::form('tcfd_ops_test', ['school' => $slug, 'kind' => $kind, 'view' => 'preview'], 'Send me a test', 'button') . '</div></div>';
            echo '<p><strong>To:</strong> ' . esc_html($r['route'] === 'email' ? $r['email'] : 'Use the school\'s contact form: ' . $r['contact_url']) . '<br><strong>Subject:</strong> ' . esc_html($m['subject']) . '</p>';
            echo '<div class="tcf-ops-mail">' . $m['html'] . '</div>';
            echo '<details><summary>Plain text (to paste into a contact form)</summary><textarea readonly rows="14" style="width:100%;margin-top:8px" onclick="this.select()">' . esc_textarea($m['text']) . '</textarea></details></div>';
        }
    }

    private static function view_settings(): void {
        $s = self::settings(); $m = self::smtp();
        $f = function ($name, $label, $val, $type = 'text', $help = '') { return '<tr><th><label for="' . $name . '">' . esc_html($label) . '</label></th><td><input type="' . $type . '" id="' . $name . '" name="' . $name . '" value="' . esc_attr($val) . '" class="regular-text"' . ($type === 'password' ? ' autocomplete="new-password"' : '') . '>' . ($help ? '<p class="description">' . $help . '</p>' : '') . '</td></tr>'; };
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="tcfd_ops_save">' . wp_nonce_field('tcfd_ops_save', '_wpnonce', true, false);
        echo '<div class="tcf-ops-box"><h3>Email (Google Workspace)</h3>';
        echo '<p>' . (self::mail_ready() ? '<span class="tcf-ops-pill tcf-ops-form">Connected</span> All site email goes out through ' . esc_html($m['user']) . '.' : '<span class="tcf-ops-pill tcf-ops-due">Not set up</span> Add the App Password below.') . '</p>';
        echo '<table class="form-table">' . $f('from_email', 'Send from', $s['from_email'], 'email', 'The Google Workspace mailbox (or an alias of it).')
           . $f('smtp_user', 'Mailbox login', $s['smtp_user'], 'email', 'Leave empty if it is the same as Send from.')
           . $f('smtp_pass', 'App Password', '', 'password', $s['smtp_pass'] ? 'Saved. Enter a new one only to replace it.' : 'A 16-character App Password for the mailbox (Google Account &rarr; Security &rarr; App passwords). Stored encrypted.')
           . $f('from_name', 'Sender name', $s['from_name']) . $f('test_to', 'Send tests to', $s['test_to'], 'email', 'Where test emails go. Leave empty to use your login email.') . '</table>';
        echo '</div><div class="tcf-ops-box"><h3>Outreach email</h3><p class="tcf-ops-muted">Placeholders: {greeting} {school} {profile_link} {form_link} {signature} {address}. The {form_link} line becomes a &ldquo;Review and confirm your school&rsquo;s listing&rdquo; link.</p><table class="form-table">'
           . $f('signature', 'Signature name', $s['signature']) . $f('address', 'Mailing address', $s['address']) . $f('form_url', 'Form link', $s['form_url'], 'url') . $f('subject', 'Subject', $s['subject'])
           . '<tr><th>Listing email</th><td><textarea name="tpl_initial" rows="16" class="large-text">' . esc_textarea($s['tpl_initial']) . '</textarea></td></tr>'
           . '<tr><th>Follow-up</th><td><textarea name="tpl_followup" rows="12" class="large-text">' . esc_textarea($s['tpl_followup']) . '</textarea></td></tr>'
           . '<tr><th>Footer</th><td><textarea name="footer" rows="3" class="large-text">' . esc_textarea($s['footer']) . '</textarea><p class="description">Keep the address and the unsubscribe line (required for this kind of email).</p></td></tr>'
           . '<tr><th></th><td><label><input type="checkbox" name="reset_templates" value="1"> Reset the email wording to the original</label></td></tr></table></div>';
        echo '<div class="tcf-ops-box" id="ga"><h3>Google Analytics</h3><table class="form-table">'
           . $f('ga_mid', 'Measurement ID', $s['ga_mid'], 'text', 'Starts with G-. Adds the tracking tag to every page (it loads a moment after the page, so PageSpeed stays high).')
           . $f('ga_property', 'Property ID', $s['ga_property'], 'text', 'The number in GA Admin &rarr; Property details. Used for the dashboard numbers.')
           . '<tr><th><label for="ga_sa">Service account key</label></th><td><textarea id="ga_sa" name="ga_sa" rows="4" class="large-text" placeholder="' . ($s['ga_sa'] ? 'Saved. Paste a new key only to replace it.' : 'Paste the contents of the JSON key file') . '"></textarea><p class="description">Stored encrypted. Give the key&rsquo;s service account email Viewer access in GA Admin &rarr; Property access management.</p></td></tr></table></div>';
        echo '<p><button type="submit" class="button button-primary button-large">Save settings</button></p></form>';
        echo '<div class="tcf-ops-box"><h3>Check</h3><p>' . self::form('tcfd_ops_mailtest', [], 'Send a test email', 'button') . '</p><p class="tcf-ops-muted">Reply checking: ' . (self::imap_ok() ? 'available (reads the mailbox over IMAP every hour).' : 'not available on this server (no PHP IMAP extension); mark replies by hand.') . '</p></div>';
    }

    private static function styles(): void {
        echo '<style>.tcf-ops{max-width:1320px}.tcf-ops-h1{font:600 26px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;margin:10px 0 14px!important}'
           . '.tcf-ops-tabs{display:flex;gap:4px;border-bottom:1px solid #dcdcde;margin-bottom:18px;flex-wrap:wrap}.tcf-ops-tabs a{padding:9px 14px;text-decoration:none;color:#3c434a;border-bottom:3px solid transparent;font-weight:600}.tcf-ops-tabs a.on{border-color:#FF6B57;color:#1d2327}'
           . '.tcf-ops-h2{font-size:18px;margin:26px 0 10px}.tcf-ops-h2 span{font-weight:400;color:#646970;font-size:14px;margin-left:6px}'
           . '.tcf-ops-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:14px}'
           . '.tcf-ops-card{background:#fff;border:1px solid #dcdcde;border-radius:10px;padding:14px 16px}.tcf-ops-card-n{font-size:28px;font-weight:600;color:#1d2327;line-height:1.1}.tcf-ops-card-l{color:#50575e;margin-top:4px}.tcf-ops-card-s{color:#FF6B57;font-size:12px;margin-top:4px;font-weight:600}'
           . '.tcf-ops-box{background:#fff;border:1px solid #dcdcde;border-radius:10px;padding:16px 18px;margin-bottom:16px}.tcf-ops-box h3{margin:0 0 10px;font-size:15px}.tcf-ops-bad{border-color:#d63638}'
           . '.tcf-ops-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px}.tcf-ops-bar h3{margin:0}'
           . '.tcf-ops-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.tcf-ops-muted{color:#646970}.tcf-ops-note{color:#646970;font-size:12px;margin-top:3px;max-width:320px}'
           . '.tcf-ops-table td{vertical-align:top}.tcf-ops-acts form,.tcf-ops-acts .button{margin:0 4px 4px 0}.tcf-ops-del{color:#b32d2e!important}'
           . '.tcf-ops-pill{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;background:#f0f0f1;color:#3c434a;white-space:nowrap}'
           . '.tcf-ops-sent,.tcf-ops-followed,.tcf-ops-queued{background:#e7f0fb;color:#1d4f91}.tcf-ops-due{background:#FFF1EE;color:#b0402d}.tcf-ops-replied{background:#fdf6e0;color:#7a5a00}.tcf-ops-form{background:#e6f4ea;color:#1e6b34}.tcf-ops-bounced,.tcf-ops-quiet{background:#fbeaea;color:#8a1f1f}'
           . '.tcf-ops-alert{background:#FFF1EE;border:1px solid #FF6B57;border-radius:10px;padding:12px 16px;margin:10px 0 16px}'
           . '.tcf-ops-todo{margin:0}.tcf-ops-todo li{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #f0f0f1}'
           . '.tcf-ops-mini{width:100%;border-collapse:collapse}.tcf-ops-mini td{padding:5px 0;border-bottom:1px solid #f0f0f1}.tcf-ops-mini td:last-child{text-align:right;white-space:nowrap;padding-left:12px}'
           . '.tcf-ops-spark{display:block;background:#fafafa;border-radius:6px}.tcf-ops-spark-x{display:flex;justify-content:space-between;color:#646970;font-size:12px;margin-top:4px}'
           . '.tcf-ops-list{margin:0;columns:2}.tcf-ops-removed{margin-top:12px}.tcf-ops-edit summary{cursor:pointer;color:#2271b1;font-size:12px;margin-top:4px;list-style:none}.tcf-ops-edit summary::-webkit-details-marker{display:none}.tcf-ops-edit[open] summary{color:#646970}.tcf-ops-edit form{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}.tcf-ops-edit input[type=email]{width:230px;max-width:100%}.tcf-ops-edit .tcf-ops-note{flex-basis:100%;margin:0}.tcf-ops-mail{border:1px solid #dcdcde;border-radius:8px;padding:18px;background:#fff;margin:10px 0}</style>';
    }
}
