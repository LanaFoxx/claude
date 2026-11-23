<?php
/**
 * Everything the dashboard knows about one student: courses from Moodle (cached), CTEC/IRS
 * reporting dates and certificates (stored in WordPress), and their CTEC ID and PTIN.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

class PTA_SA_Student {

    const CACHE_SECONDS = 300;

    /** Admins can turn on sample data to review the dashboard design. */
    public static function is_preview(): bool {
        return current_user_can('manage_woocommerce') && (bool) get_user_meta(get_current_user_id(), 'pta_preview', true);
    }

    /**
     * Courses from Moodle. Cached for five minutes; the last good answer is kept if Moodle is unreachable.
     *
     * @return array{courses: array, ok: bool}
     */
    public static function courses(WP_User $user, bool $refresh = false): array {
        if (self::is_preview()) {
            return ['courses' => self::sample_courses(), 'ok' => true];
        }
        if (PTA_SA_Bridge::secret() === '') {
            return ['courses' => [], 'ok' => true]; // Moodle connection not set up yet: nothing to show.
        }
        $key = 'pta_courses_' . $user->ID;
        if (!$refresh) {
            $cached = get_transient($key);
            if (is_array($cached)) {
                return ['courses' => $cached, 'ok' => true];
            }
        }
        $response = PTA_SA_Bridge::call('courses', PTA_SA_Bridge::identity($user));
        if ($response === null) {
            $last = get_user_meta($user->ID, 'pta_courses_last', true);
            return ['courses' => is_array($last) ? $last : [], 'ok' => false];
        }
        $courses = is_array($response['courses'] ?? null) ? $response['courses'] : [];
        set_transient($key, $courses, self::CACHE_SECONDS);
        update_user_meta($user->ID, 'pta_courses_last', $courses);
        return ['courses' => $courses, 'ok' => true];
    }

    public static function forget(int $userid): void {
        delete_transient('pta_courses_' . $userid);
    }

    /** One-click link into a Moodle course (or a page inside it). */
    public static function go_url(array $course, string $to = ''): string {
        if (self::is_preview()) {
            return '#preview';
        }
        $target = $to ?: ($course['url'] ?? '');
        return add_query_arg([
            'pta_go' => (int) ($course['id'] ?? 0),
            'to' => rawurlencode($target),
            '_wpnonce' => wp_create_nonce('pta_go'),
        ], wc_get_page_permalink('myaccount'));
    }

    /** Student profile details shown in the header and the "Check your PTIN" card. */
    public static function profile(WP_User $user): array {
        $first = $user->first_name ?: get_user_meta($user->ID, 'billing_first_name', true);
        $last = $user->last_name ?: get_user_meta($user->ID, 'billing_last_name', true);
        $ptin = strtoupper((string) get_user_meta($user->ID, 'pta_ptin', true));
        $ctec = strtoupper((string) get_user_meta($user->ID, 'pta_ctec_id', true));
        $name = trim($first . ' ' . $last) ?: $user->display_name;
        $initials = strtoupper(mb_substr($first ?: $name, 0, 1) . mb_substr($last, 0, 1));
        return [
            'first' => $first ?: $user->display_name,
            'name' => $name,
            'initials' => $initials ?: '•',
            'ptin' => $ptin,
            'ptin_masked' => $ptin ? 'P•••••' . substr($ptin, -4) : '',
            'ctec' => $ctec,
            'missing' => !$ptin || !$ctec,
        ];
    }

    /** Reporting dates (Y-m-d) by Moodle short name: ['ctec' => ..., 'irs' => ...]. */
    public static function reports(WP_User $user): array {
        if (self::is_preview()) {
            return [
                'FTL-2027' => ['ctec' => '2026-11-12', 'irs' => '2026-11-12'],
                'UPD-2027' => ['ctec' => '2026-11-15', 'irs' => '2026-11-15'],
                'ETH-2027' => ['ctec' => '2026-11-18', 'irs' => '2026-11-18'],
            ];
        }
        $reports = get_user_meta($user->ID, 'pta_reports', true);
        return is_array($reports) ? $reports : [];
    }

    /** Certificates, newest first: title, year, date, ctec_course, url. */
    public static function certificates(WP_User $user): array {
        if (self::is_preview()) {
            return [
                ['title' => '2026 CTEC renewal', 'year' => 2026, 'date' => '2026-09-14', 'ctec_course' => '', 'url' => '#preview'],
                ['title' => '2025 CTEC renewal', 'year' => 2025, 'date' => '2025-10-02', 'ctec_course' => '', 'url' => '#preview'],
            ];
        }
        $certs = get_user_meta($user->ID, 'pta_certificates', true);
        $certs = is_array($certs) ? $certs : [];
        usort($certs, static fn($a, $b) => strcmp((string) ($b['date'] ?? ''), (string) ($a['date'] ?? '')));
        return $certs;
    }

    /**
     * The dashboard view: renewal years with their four requirements, plus 60-Hour and other courses.
     */
    public static function model(WP_User $user): array {
        $result = self::courses($user);
        $reports = self::reports($user);
        $catalog = PTA_SA_Catalog::all();

        $years = [];
        $qe = [];
        foreach ($result['courses'] as $course) {
            $parsed = PTA_SA_Catalog::parse((string) ($course['shortname'] ?? ''));
            $course['code'] = $parsed['code'];
            $course['year'] = $parsed['year'];
            $course['status'] = self::status($course);
            $course['report'] = $reports[$course['shortname'] ?? ''] ?? [];
            if ($parsed['code'] && $catalog[$parsed['code']]['group'] === 'renewal') {
                $years[$parsed['year']][$parsed['code']] = $course;
            } else if ($parsed['code'] === 'QE60') {
                $qe[] = $course;
            }
        }
        krsort($years);

        $renewals = [];
        foreach ($years as $year => $owned) {
            $rows = [];
            $met = 0;
            $hours = 0;
            $next = null;
            foreach ($catalog as $code => $item) {
                if ($item['group'] !== 'renewal') {
                    continue;
                }
                $course = $owned[$code] ?? null;
                $status = $course ? $course['status'] : 'missing';
                if ($status === 'done') {
                    $met++;
                    $hours += $item['hours'];
                }
                $row = $item + ['code' => $code, 'course' => $course, 'status' => $status];
                if (!$next && $course && $status !== 'done') {
                    $next = $row;
                }
                $rows[] = $row;
            }
            foreach ($rows as &$row) {
                $row['current'] = $next && $row['code'] === $next['code'];
            }
            unset($row);
            $renewals[$year] = [
                'year' => $year,
                'rows' => $rows,
                'met' => $met,
                'hours' => $hours,
                'complete' => $met === count($rows),
                'next' => $next,
                'started' => (bool) array_filter($rows, static fn($r) => in_array($r['status'], ['done', 'progress'], true)),
            ];
        }

        return [
            'ok' => $result['ok'],
            'renewals' => $renewals,
            'qe' => $qe,
            'has_courses' => !empty($renewals) || !empty($qe),
        ];
    }

    /** done, progress or todo. */
    private static function status(array $course): string {
        if (!empty($course['completed'])) {
            return 'done';
        }
        if (!empty($course['lastaccess']) || (int) ($course['percent'] ?? 0) > 0) {
            return 'progress';
        }
        return 'todo';
    }

    /** Sample courses for the admin preview. */
    private static function sample_courses(): array {
        $base = PTA_SA_Bridge::moodle_url('/course/view.php?id=');
        $make = static function (int $id, string $short, string $name, bool $done, int $percent, int $access) use ($base) {
            return [
                'id' => $id, 'shortname' => $short, 'fullname' => $name, 'idnumber' => '', 'url' => $base . $id,
                'percent' => $percent, 'completed' => $done, 'timecompleted' => $done ? $access : 0,
                'lastaccess' => $access, 'nexturl' => '',
            ];
        };
        return [
            $make(11, 'FTL-2027', 'Federal Tax Law (2027)', true, 100, strtotime('-12 days')),
            $make(12, 'UPD-2027', 'Federal Tax Law Update (2027)', true, 100, strtotime('-9 days')),
            $make(13, 'ETH-2027', 'Ethics (2027)', true, 100, strtotime('-6 days')),
            $make(14, 'CA-2027', 'California Tax Law (2027)', false, 40, strtotime('-1 day')),
            $make(7, 'FTL-2026', 'Federal Tax Law (2026)', true, 100, strtotime('-14 months')),
            $make(8, 'UPD-2026', 'Federal Tax Law Update (2026)', true, 100, strtotime('-14 months')),
            $make(9, 'ETH-2026', 'Ethics (2026)', true, 100, strtotime('-14 months')),
            $make(10, 'CA-2026', 'California Tax Law (2026)', true, 100, strtotime('-14 months')),
        ];
    }
}
