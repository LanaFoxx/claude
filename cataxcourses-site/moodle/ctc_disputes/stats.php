<?php
// Moodle numbers for the WordPress admin dashboard (cataxcourses.com/wp-admin).
// GET ?token=… (same shared token as activity.php). JSON only; no student names or emails.
define('NO_DEBUG_DISPLAY', true);
define('NO_MOODLE_COOKIES', true);
require_once(__DIR__ . '/../../config.php');

header('Content-Type: application/json; charset=utf-8');
$token = optional_param('token', '', PARAM_RAW_TRIMMED);
$expected = (string) get_config('block_ctc_disputes', 'token');
if ($expected === '' || $token === '' || !hash_equals($expected, $token)) {
    http_response_code(403);
    echo json_encode(['error' => 'forbidden']);
    die;
}

global $DB;
$tz = new DateTimeZone('America/Los_Angeles');
$now = time();
$start = function ($spec) use ($tz) { return (new DateTime($spec, $tz))->getTimestamp(); };
$periods = [
    'today' => $start('today'),
    'week'  => $start('monday this week'),
    'month' => $start('first day of this month 00:00'),
    'year'  => $start('first day of january this year 00:00'),
];
// The store passes its own period starts (its week may start on Sunday) so both sides count the same days.
foreach (array_keys($periods) as $k) {
    $v = optional_param($k, 0, PARAM_INT);
    if ($v > 0 && $v <= $now) { $periods[$k] = $v; }
}

// Course kind from the name: 20 Hour, 60 Hour, or other (15 Hour, Ethics, ...). Year = newest year in the name.
$kind = function ($name) {
    if (preg_match('/\b20\s*hour/i', $name)) { return '20'; }
    if (preg_match('/\b60\s*hour/i', $name)) { return '60'; }
    return 'other';
};
$yearof = function ($name) {
    return preg_match_all('/20\d\d/', (string) $name, $m) ? max(array_map('intval', $m[0])) : 0;
};
$courses = [];
foreach ($DB->get_records_select('course', 'id <> ?', [SITEID], '', 'id, fullname, visible') as $c) {
    $courses[(int) $c->id] = ['kind' => $kind($c->fullname), 'year' => $yearof($c->fullname), 'name' => format_string($c->fullname), 'visible' => (int) $c->visible];
}
// The current course of each kind: among visible courses with the newest year in the name, the one most students
// are enrolled in (staff copies such as "... (2)" have only a few).
$newest = [];
foreach ($courses as $c) {
    if ($c['kind'] !== 'other' && $c['visible']) { $newest[$c['kind']] = max($newest[$c['kind']] ?? 0, $c['year']); }
}
$current = [];
$best = [];
foreach ($courses as $id => $c) {
    if ($c['kind'] === 'other' || !$c['visible'] || $c['year'] !== $newest[$c['kind']]) { continue; }
    $n = (int) $DB->count_records_sql('SELECT COUNT(1) FROM {user_enrolments} ue JOIN {enrol} e ON e.id = ue.enrolid WHERE e.courseid = ?', [$id]);
    if (!isset($best[$c['kind']]) || $n > $best[$c['kind']]) { $best[$c['kind']] = $n; $current[$c['kind']] = $id; }
}

$blank = function () use ($periods) { return array_fill_keys(array_keys($periods), ['20' => 0, '60' => 0, 'other' => 0, 'all' => 0]); };
$bucket = function (&$out, $courseid, $t) use ($periods, $courses) {
    $k = $courses[$courseid]['kind'] ?? 'other';
    foreach ($periods as $p => $from) {
        if ($t >= $from) { $out[$p][$k]++; $out[$p]['all']++; }
    }
};

// New enrollments this year.
$enrol = $blank();
$rs = $DB->get_recordset_sql('SELECT ue.id, e.courseid, ue.timecreated FROM {user_enrolments} ue JOIN {enrol} e ON e.id = ue.enrolid
    WHERE ue.timecreated >= ?', [$periods['year']]);
foreach ($rs as $r) { $bucket($enrol, (int) $r->courseid, (int) $r->timecreated); }
$rs->close();

// Course completions this year.
$done = $blank();
$rs = $DB->get_recordset_sql('SELECT id, course, timecompleted FROM {course_completions} WHERE timecompleted >= ?', [$periods['year']]);
foreach ($rs as $r) { $bucket($done, (int) $r->course, (int) $r->timecompleted); }
$rs->close();

// Hours reported to CTEC (CTEC reporting plugin), when installed.
$ctec = null;
$dbman = $DB->get_manager();
if ($dbman->table_exists('local_ctecreport_log')) {
    $ctec = $blank();
    $cols = $DB->get_columns('local_ctecreport_log');
    $tcol = isset($cols['timecreated']) ? 'timecreated' : (isset($cols['timemodified']) ? 'timemodified' : null);
    if ($tcol) {
        $rs = $DB->get_recordset_sql("SELECT id, courseid, $tcol AS t FROM {local_ctecreport_log} WHERE status = ? AND $tcol >= ?", ['sent', $periods['year']]);
        foreach ($rs as $r) { $bucket($ctec, (int) $r->courseid, (int) $r->t); }
        $rs->close();
    }
}

// Students in the current 20 and 60 Hour courses: active enrollments, finished, still working.
$active = [];
foreach ($current as $k => $cid) {
    $row = $DB->get_record_sql('SELECT COUNT(DISTINCT ue.userid) AS enrolled,
            COUNT(DISTINCT CASE WHEN cc.timecompleted > 0 THEN ue.userid END) AS completed
        FROM {user_enrolments} ue
        JOIN {enrol} e ON e.id = ue.enrolid AND e.status = 0
        JOIN {user} u ON u.id = ue.userid AND u.deleted = 0 AND u.suspended = 0
        LEFT JOIN {course_completions} cc ON cc.course = e.courseid AND cc.userid = ue.userid
        WHERE e.courseid = ? AND ue.status = 0 AND (ue.timeend = 0 OR ue.timeend > ?)', [$cid, $now]);
    $active[$k] = ['course' => $courses[$cid]['name'], 'courseid' => $cid, 'enrolled' => (int) $row->enrolled,
        'completed' => (int) $row->completed, 'inprogress' => max(0, (int) $row->enrolled - (int) $row->completed)];
}

// Students signed in: right now (last 5 minutes), today, last 7 days.
$online = [
    'now'   => (int) $DB->count_records_select('user', 'deleted = 0 AND lastaccess >= ?', [$now - 300]),
    'today' => (int) $DB->count_records_select('user', 'deleted = 0 AND lastaccess >= ?', [$periods['today']]),
    'week'  => (int) $DB->count_records_select('user', 'deleted = 0 AND lastaccess >= ?', [$now - 7 * 86400]),
];

echo json_encode([
    'generated' => $now,
    'periods' => $periods,
    'enrollments' => $enrol,
    'completions' => $done,
    'ctec' => $ctec,
    'current' => $active,
    'online' => $online,
    'students_total' => (int) $DB->count_records_select('user', 'deleted = 0 AND confirmed = 1 AND id > 2'),
]);
