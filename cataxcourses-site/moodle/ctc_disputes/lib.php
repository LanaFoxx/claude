<?php
defined('MOODLE_INTERNAL') || die();

/** GET a JSON endpoint of the store's CTC Disputes API. Returns the decoded array or null. */
function block_ctc_disputes_wp($path) {
    global $CFG;
    require_once($CFG->libdir . '/filelib.php');
    $url = rtrim((string) get_config('block_ctc_disputes', 'wpurl'), '/');
    $token = (string) get_config('block_ctc_disputes', 'token');
    if ($url === '' || $token === '') {
        return null;
    }
    $curl = new curl(['ignoresecurity' => true]);
    $body = $curl->get($url . '/wp-json/ctc/v1/' . $path, ['token' => $token], ['CURLOPT_TIMEOUT' => 90]);
    $info = $curl->get_info();
    if (empty($info['http_code']) || (int) $info['http_code'] !== 200) {
        return null;
    }
    $json = json_decode($body, true);
    return is_array($json) ? $json : null;
}

/** Friendly description of a standard log entry. */
function block_ctc_disputes_describe($log, &$cmcache) {
    $e = $log->eventname;
    if ($e === '\core\event\user_loggedin') {
        return 'Signed in';
    }
    if ($e === '\core\event\course_viewed') {
        return 'Opened course' . ($log->coursename ? ': ' . $log->coursename : '');
    }
    if (preg_match('/^\\\\mod_(\w+)\\\\event\\\\(.+)$/', $e, $m)) {
        $cmid = (int) $log->contextinstanceid;
        if (!array_key_exists($cmid, $cmcache)) {
            $cm = get_coursemodule_from_id('', $cmid, 0, false, IGNORE_MISSING);
            $cmcache[$cmid] = $cm ? format_string($cm->name) : '';
        }
        $what = str_replace('_', ' ', $m[2]);
        $labels = ['course module viewed' => 'Viewed', 'attempt submitted' => 'Submitted exam', 'attempt started' => 'Started exam',
            'attempt viewed' => 'Viewed exam attempt', 'attempt reviewed' => 'Reviewed exam results'];
        return ($labels[$what] ?? ucfirst($what)) . ($cmcache[$cmid] ? ': ' . $cmcache[$cmid] : '') . ' (' . $m[1] . ')';
    }
    return ltrim(str_replace(['\\core\\event\\', '_'], ['', ' '], $e), '\\');
}

/** The student's account, courses, exam attempts and recent activity, looked up by email. */
function block_ctc_disputes_activity($email, $limit = 60) {
    global $DB;
    $users = $DB->get_records_select('user', 'LOWER(email) = LOWER(?) AND deleted = 0', [trim($email)], 'lastaccess DESC',
        'id, username, email, firstname, lastname, timecreated, firstaccess, lastaccess, lastip', 0, 1);
    $user = reset($users);
    if (!$user) {
        return ['found' => false];
    }
    $courses = [];
    foreach (enrol_get_users_courses($user->id, false, 'id, fullname') as $c) {
        $enrolled = $DB->get_field_sql('SELECT MIN(ue.timecreated) FROM {user_enrolments} ue JOIN {enrol} e ON e.id = ue.enrolid
            WHERE ue.userid = ? AND e.courseid = ?', [$user->id, $c->id]);
        $last = $DB->get_field('user_lastaccess', 'timeaccess', ['userid' => $user->id, 'courseid' => $c->id]);
        $done = $DB->get_field('course_completions', 'timecompleted', ['userid' => $user->id, 'course' => $c->id]);
        $grade = $DB->get_field_sql('SELECT gg.finalgrade FROM {grade_grades} gg JOIN {grade_items} gi ON gi.id = gg.itemid
            WHERE gi.courseid = ? AND gi.itemtype = ? AND gg.userid = ?', [$c->id, 'course', $user->id]);
        $courses[] = ['name' => format_string($c->fullname), 'enrolled' => (int) $enrolled, 'lastaccess' => (int) $last,
            'completed' => (int) $done, 'grade' => $grade === false || $grade === null ? '' : format_float($grade, 1)];
    }
    $quiz = [];
    if ($DB->get_manager()->table_exists('quiz_attempts')) {
        $rs = $DB->get_records_sql('SELECT qa.id, q.name, qa.state, qa.timestart, qa.timefinish, qa.sumgrades, q.sumgrades AS maxgrades
            FROM {quiz_attempts} qa JOIN {quiz} q ON q.id = qa.quiz WHERE qa.userid = ? ORDER BY qa.timestart DESC', [$user->id], 0, 50);
        foreach ($rs as $a) {
            $quiz[] = ['name' => format_string($a->name), 'state' => $a->state, 'start' => (int) $a->timestart, 'finish' => (int) $a->timefinish,
                'score' => $a->sumgrades !== null && $a->maxgrades > 0 ? round(100 * $a->sumgrades / $a->maxgrades) . '%' : ''];
        }
    }
    $count = (int) $DB->count_records('logstore_standard_log', ['userid' => $user->id]);
    $logs = $DB->get_records_sql('SELECT l.id, l.eventname, l.timecreated, l.ip, l.contextinstanceid, c.fullname AS coursename
        FROM {logstore_standard_log} l LEFT JOIN {course} c ON c.id = l.courseid AND c.id <> ?
        WHERE l.userid = ? AND l.crud = ? ORDER BY l.timecreated DESC', [SITEID, $user->id, 'r'], 0, $limit);
    $cmcache = [];
    $recent = [];
    foreach ($logs as $l) {
        $recent[] = ['time' => (int) $l->timecreated, 'what' => block_ctc_disputes_describe($l, $cmcache), 'ip' => (string) $l->ip];
    }
    return ['found' => true, 'ctec' => block_ctc_disputes_ctec($user), 'user' => ['username' => $user->username, 'name' => fullname($user), 'timecreated' => (int) $user->timecreated,
        'firstaccess' => (int) $user->firstaccess, 'lastaccess' => (int) $user->lastaccess, 'lastip' => $user->lastip],
        'courses' => $courses, 'quiz' => $quiz, 'logcount' => $count, 'recent' => $recent];
}

/**
 * CTEC reporting status for a student. Hours are reported to CTEC by staff; this reads what Moodle records about it:
 *  - custom profile fields whose name mentions CTEC, PTIN or "report" (CTEC ID, PTIN, a "Reported to CTEC" checkbox/date)
 *  - issued certificates (mod_customcert, mod_certificate, mod_simplecertificate)
 *  - groups whose name mentions "report" or "CTEC"
 * The setting "reportedfield" (profile field short name) is the field that marks a student as reported, when set.
 */
function block_ctc_disputes_ctec($user) {
    global $DB;
    $out = ['reported' => null, 'reported_on' => '', 'how' => '', 'ctecid' => '', 'ptin' => '', 'fields' => [], 'certificates' => [], 'groups' => []];
    $markfield = trim((string) get_config('block_ctc_disputes', 'reportedfield'));
    $rows = $DB->get_records_sql('SELECT f.id, f.shortname, f.name, f.datatype, d.data FROM {user_info_field} f
        LEFT JOIN {user_info_data} d ON d.fieldid = f.id AND d.userid = ? ORDER BY f.sortorder', [$user->id]);
    foreach ($rows as $f) {
        $label = $f->name . ' ' . $f->shortname;
        $ismark = $markfield !== '' && strcasecmp($f->shortname, $markfield) === 0;
        if (!$ismark && !preg_match('/ctec|ptin|report/i', $label)) {
            continue;
        }
        $val = (string) $f->data;
        if ($f->datatype === 'datetime' && $val !== '' && (int) $val > 0) {
            $val = userdate((int) $val, '%b %d, %Y');
        } else if ($f->datatype === 'checkbox') {
            $val = $val === '1' ? 'Yes' : ($val === '' ? '' : 'No');
        }
        if (preg_match('/ptin/i', $label)) {
            $out['ptin'] = $val !== '' ? '•••' . substr(preg_replace('/\s+/', '', $val), -4) : '';
            $out['fields'][] = ['name' => format_string($f->name), 'value' => $out['ptin']];
            continue;
        }
        if (preg_match('/ctec/i', $label) && !preg_match('/report/i', $label) && $out['ctecid'] === '') {
            $out['ctecid'] = $val;
        }
        $out['fields'][] = ['name' => format_string($f->name), 'value' => $val];
        if ($ismark || ($markfield === '' && preg_match('/report/i', $label))) {
            $yes = $val !== '' && !in_array(strtolower($val), ['no', '0', 'false'], true);
            $out['reported'] = $yes || $out['reported'] === true;
            if ($yes) {
                $out['reported_on'] = $f->datatype === 'datetime' || preg_match('/\d{4}|\d\/\d/', $val) ? $val : $out['reported_on'];
                $out['how'] = 'Profile field "' . format_string($f->name) . '": ' . $val;
            }
        }
    }
    $dbman = $DB->get_manager();
    $certs = [
        'customcert_issues' => 'SELECT i.id, c.name, i.timecreated, i.code FROM {customcert_issues} i JOIN {customcert} c ON c.id = i.customcertid WHERE i.userid = ?',
        'certificate_issues' => 'SELECT i.id, c.name, i.timecreated, i.code FROM {certificate_issues} i JOIN {certificate} c ON c.id = i.certificateid WHERE i.userid = ?',
        'simplecertificate_issues' => 'SELECT i.id, i.certificatename AS name, i.timecreated, i.code FROM {simplecertificate_issues} i WHERE i.userid = ?',
    ];
    foreach ($certs as $table => $sql) {
        if ($dbman->table_exists($table)) {
            foreach ($DB->get_records_sql($sql . ' ORDER BY i.timecreated DESC', [$user->id]) as $c) {
                $out['certificates'][] = ['name' => format_string($c->name), 'issued' => (int) $c->timecreated, 'code' => (string) $c->code];
            }
        }
    }
    $groups = $DB->get_records_sql('SELECT g.id, g.name, gm.timeadded, c.fullname AS course FROM {groups_members} gm JOIN {groups} g ON g.id = gm.groupid
        JOIN {course} c ON c.id = g.courseid WHERE gm.userid = ?', [$user->id]);
    foreach ($groups as $g) {
        if (preg_match('/report|ctec/i', $g->name)) {
            $out['groups'][] = ['name' => format_string($g->name), 'course' => format_string($g->course), 'added' => (int) $g->timeadded];
            if (preg_match('/report/i', $g->name) && $out['reported'] !== true) {
                $out['reported'] = true;
                $out['reported_on'] = userdate((int) $g->timeadded, '%b %d, %Y');
                $out['how'] = 'Group "' . format_string($g->name) . '" in ' . format_string($g->course);
            }
        }
    }
    return $out;
}
