<?php
// CTC Student: data for the student dashboard and the left-hand menu.
defined('MOODLE_INTERNAL') || die();

/** The course year: the latest 4-digit year in the course name, else the year the student enrolled. */
function block_ctc_student_year($name, $enrolled = 0) {
    if (preg_match_all('/20\d\d/', (string) $name, $m)) {
        return max(array_map('intval', $m[0]));
    }
    return $enrolled ? (int) userdate($enrolled, '%Y') : 0;
}

/** Course name without the year/status tags staff add for themselves ("Updated", "Outdated", "EXPIRED"...). */
function block_ctc_student_clean_name($name) {
    $n = format_string($name);
    $n = preg_replace('/\s*[\(\["“]*\b(updated|outdated|expired|version|new course released[^)]*)\b[\)\]"”]*/i', '', $n);
    $n = preg_replace('/\s*\(\s*\)|\s*[|\-–]\s*$/u', '', trim($n));
    $n = trim(preg_replace('/\s{2,}/', ' ', $n), " |-–");
    if (substr_count($n, '(') > substr_count($n, ')')) {
        $n .= ')';
    }
    return $n;
}

/** Who gets the student layout: everyone except staff who edit courses (admin, Admin Support, teachers at site level). */
function block_ctc_student_is_student() {
    return isloggedin() && !isguestuser() && !has_capability('moodle/course:update', context_system::instance());
}

/**
 * The student's courses: ['current' => [...], 'previous' => [...], 'year' => newest year].
 * Current = the newest year the student is enrolled in.
 */
function block_ctc_student_courses($userid) {
    global $DB, $CFG;
    require_once($CFG->libdir . '/completionlib.php');
    $list = [];
    $courses = enrol_get_users_courses($userid, true, 'id, fullname, shortname, visible, enablecompletion');
    if (!$courses) {
        return ['current' => [], 'previous' => [], 'year' => 0];
    }
    $ids = array_keys($courses);
    list($in, $params) = $DB->get_in_or_equal($ids, SQL_PARAMS_NAMED);
    $params['uid'] = $userid;
    $enrolled = $DB->get_records_sql_menu("SELECT e.courseid, MIN(CASE WHEN ue.timestart > 0 THEN ue.timestart ELSE ue.timecreated END)
        FROM {user_enrolments} ue JOIN {enrol} e ON e.id = ue.enrolid WHERE ue.userid = :uid AND e.courseid $in GROUP BY e.courseid", $params);
    $done = $DB->get_records_sql_menu("SELECT course, timecompleted FROM {course_completions} WHERE userid = :uid AND timecompleted > 0 AND course $in", $params);
    foreach ($courses as $c) {
        $ctx = context_course::instance($c->id);
        if (!$c->visible && !has_capability('moodle/course:viewhiddencourses', $ctx, $userid)) {
            continue;
        }
        $when = (int) ($enrolled[$c->id] ?? 0);
        $pct = null;
        if ($c->enablecompletion && class_exists('\core_completion\progress')) {
            $pct = \core_completion\progress::get_course_progress_percentage($c, $userid);
            $pct = $pct === null ? null : (int) round($pct);
        }
        $list[] = (object) ['id' => (int) $c->id, 'name' => block_ctc_student_clean_name($c->fullname), 'fullname' => format_string($c->fullname),
            'year' => block_ctc_student_year($c->fullname, $when), 'enrolled' => $when, 'completed' => (int) ($done[$c->id] ?? 0),
            'progress' => !empty($done[$c->id]) ? 100 : $pct, 'url' => (new moodle_url('/course/view.php', ['id' => $c->id]))->out(false)];
    }
    usort($list, function ($a, $b) { return [$b->year, $b->enrolled] <=> [$a->year, $a->enrolled]; });
    $year = $list ? $list[0]->year : 0;
    $cur = $prev = [];
    foreach ($list as $c) {
        if ($c->year === $year) { $cur[] = $c; } else { $prev[] = $c; }
    }
    return ['current' => $cur, 'previous' => $prev, 'year' => $year];
}

/** Issued certificates (mod_customcert), newest first, each with its year and download link. */
function block_ctc_student_certificates($userid) {
    global $DB;
    if (!$DB->get_manager()->table_exists('customcert_issues')) {
        return [];
    }
    $mod = $DB->get_field('modules', 'id', ['name' => 'customcert']);
    $rows = $DB->get_records_sql('SELECT i.id, i.timecreated, i.code, cc.name, c.id AS courseid, c.fullname, cm.id AS cmid, cm.visible
        FROM {customcert_issues} i JOIN {customcert} cc ON cc.id = i.customcertid JOIN {course} c ON c.id = cc.course
        LEFT JOIN {course_modules} cm ON cm.instance = cc.id AND cm.module = ? AND cm.course = c.id
        WHERE i.userid = ? ORDER BY i.timecreated DESC', [$mod, $userid]);
    $out = [];
    foreach ($rows as $r) {
        $out[] = (object) ['name' => block_ctc_student_clean_name($r->fullname), 'cert' => format_string($r->name), 'issued' => (int) $r->timecreated,
            'year' => block_ctc_student_year($r->fullname, $r->timecreated), 'code' => $r->code,
            'url' => $r->cmid ? (new moodle_url('/mod/customcert/view.php', ['id' => $r->cmid, 'downloadown' => 1]))->out(false) : ''];
    }
    return $out;
}

/** CTEC reporting rows (local_ctecreport) by course id, newest first. */
function block_ctc_student_reports($userid) {
    global $DB;
    if (!$DB->get_manager()->table_exists('local_ctecreport_log')) {
        return [];
    }
    $out = [];
    foreach ($DB->get_records_sql('SELECT l.*, c.fullname FROM {local_ctecreport_log} l LEFT JOIN {course} c ON c.id = l.courseid
            WHERE l.userid = ? ORDER BY l.timemodified DESC', [$userid]) as $l) {
        $st = (string) $l->status;
        $state = in_array($st, ['sent', 'duplicate', 'manual'], true) ? 'reported' : ($st === 'error' ? 'problem' : 'sending');
        $out[(int) $l->courseid] = (object) ['course' => block_ctc_student_clean_name((string) $l->fullname), 'courseid' => (int) $l->courseid,
            'year' => block_ctc_student_year((string) $l->fullname, $l->timecompleted), 'state' => $state,
            'time' => (int) ($l->timemodified ?: $l->timecreated), 'completed' => (int) $l->timecompleted];
    }
    return $out;
}

/** The CTEC course map (courses that report to CTEC automatically). */
function block_ctc_student_mapped() {
    $map = [];
    foreach (preg_split('/\R/', (string) get_config('local_ctecreport', 'coursemap')) as $line) {
        if (preg_match('/^\s*(\d+)\s*=/', $line, $m)) {
            $map[(int) $m[1]] = true;
        }
    }
    return $map;
}

/** Profile field id + value for a shortname (CTECID, ptin). */
function block_ctc_student_field($userid, $shortname) {
    global $DB;
    $f = $DB->get_record_select('user_info_field', 'LOWER(shortname) = ?', [strtolower($shortname)], 'id', IGNORE_MULTIPLE);
    if (!$f) {
        return [0, ''];
    }
    return [(int) $f->id, trim((string) $DB->get_field('user_info_data', 'data', ['userid' => $userid, 'fieldid' => $f->id]))];
}

function block_ctc_student_set_field($userid, $fieldid, $value) {
    global $DB;
    if ($rec = $DB->get_record('user_info_data', ['userid' => $userid, 'fieldid' => $fieldid])) {
        $DB->set_field('user_info_data', 'data', $value, ['id' => $rec->id]);
    } else {
        $DB->insert_record('user_info_data', (object) ['userid' => $userid, 'fieldid' => $fieldid, 'data' => $value, 'dataformat' => 0]);
    }
}

function block_ctc_student_norm_ctecid($v) {
    $v = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $v));
    if (preg_match('/^\d{6}$/', $v)) {
        $v = 'A' . $v; // typed without the leading A
    }
    return preg_match('/^[A-Z]\d{6}$/', $v) ? $v : '';
}

function block_ctc_student_norm_ptin($v) {
    $v = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $v));
    if (preg_match('/^\d{8}$/', $v)) {
        $v = 'P' . $v;
    }
    return preg_match('/^P\d{8}$/', $v) ? $v : '';
}
