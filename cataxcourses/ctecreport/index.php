<?php
// Admin log of CTEC completion reports, with resend and CTEC ID correction.

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

use local_ctecreport\reporter;

admin_externalpage_setup('local_ctecreport');

$action = optional_param('action', '', PARAM_ALPHA);
$id = optional_param('id', 0, PARAM_INT);
$filter = optional_param('filter', 'problems', PARAM_ALPHA);
$baseurl = new moodle_url('/local/ctecreport/index.php', ['filter' => $filter]);
$notice = '';

if ($action && confirm_sesskey()) {
    if ($action === 'markreported' && $id) {
        // An admin confirms the student is already on the CTEC roster (e.g. reported by hand): stop retrying.
        $rec = $DB->get_record('local_ctecreport_log', ['id' => $id], '*', MUST_EXIST);
        $rec->status = 'manual';
        $rec->response = 'Marked as reported by ' . fullname($USER) . ' on ' . userdate(time(), get_string('strftimedatetimeshort'));
        $rec->timemodified = time();
        $DB->update_record('local_ctecreport_log', $rec);
        $returnurl = optional_param('returnurl', '', PARAM_LOCALURL);
        if ($returnurl) {
            redirect(new moodle_url($returnurl), 'Marked as reported.', null, \core\output\notification::NOTIFY_SUCCESS);
        }
        $notice = 'Marked as reported.';
    } else if ($action === 'send' && $id) {
        $rec = $DB->get_record('local_ctecreport_log', ['id' => $id], '*', MUST_EXIST);
        $manual = optional_param('ctecid', '', PARAM_RAW_TRIMMED);
        if ($manual !== '') {
            $rec->ctecidmanual = reporter::normalise_ctecid($manual) ?: $manual;
        }
        $rec->attempts = 0;
        $rec = reporter::process($rec);
        $notice = "Sent: {$rec->status} — " . s($rec->response);
    } else if ($action === 'sendalltest' && reporter::is_live()) {
        // Records that only went to the test address are re-sent to the live roster.
        $recs = $DB->get_records('local_ctecreport_log', ['status' => 'test_ok']);
        foreach ($recs as $rec) {
            $rec->attempts = 0;
            reporter::process($rec);
        }
        $notice = count($recs) . ' test record(s) sent to the live roster.';
    } else if ($action === 'testconnection') {
        $map = reporter::course_map();
        list($code, $body, $error) = reporter::post(
            ['ctecid' => 'A360600', 'coursenumber' => $map ? reset($map) : '6280-QE-00007',
             'completiondate' => reporter::format_date(time())], false);
        $notice = "CTEC test address replied (HTTP $code): " . s($error ?: $body);
    } else if ($action === 'preview') {
        // Dry run for an existing completion: build the record and send it to the test address only.
        $userid = required_param('userid', PARAM_INT);
        $courseid = required_param('courseid', PARAM_INT);
        $cc = $DB->get_record('course_completions', ['userid' => $userid, 'course' => $courseid], '*', MUST_EXIST);
        $map = reporter::course_map();
        $rec = (object)['userid' => $userid, 'courseid' => $courseid, 'coursenumber' => $map[$courseid],
            'timecompleted' => $cc->timecompleted];
        list($payload, $problem) = reporter::build_payload($rec);
        if (!$payload) {
            $notice = 'Dry run: ' . $problem;
        } else {
            list($code, $body, $error) = reporter::post($payload, false);
            $notice = 'Dry run (test address, nothing recorded). Sent ' . s(json_encode($payload)) .
                " — CTEC replied (HTTP $code): " . s($error ?: $body);
        }
    }
}

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('reportname', 'local_ctecreport'));

$mode = reporter::is_live() ? 'LIVE — completions are added to the CTEC roster'
    : 'TEST — completions are checked by CTEC but not recorded';
echo html_writer::tag('p', html_writer::tag('strong', 'Mode: ') . $mode . ' · ' .
    html_writer::link(new moodle_url('/admin/settings.php', ['section' => 'local_ctecreport_settings']), 'Settings') . ' · ' .
    html_writer::link(new moodle_url($baseurl, ['action' => 'testconnection', 'sesskey' => sesskey()]), 'Test connection'));
if ($notice) {
    echo $OUTPUT->notification($notice, 'info');
}

$counts = $DB->get_records_sql_menu("SELECT status, COUNT(1) FROM {local_ctecreport_log} GROUP BY status");
$labels = ['problems' => 'Needs attention', 'all' => 'All'];
$links = [];
foreach ($labels as $key => $label) {
    $links[] = $key === $filter ? html_writer::tag('strong', $label) :
        html_writer::link(new moodle_url('/local/ctecreport/index.php', ['filter' => $key]), $label);
}
$summary = [];
foreach ($counts as $status => $n) {
    $summary[] = "$status: $n";
}
echo html_writer::tag('p', implode(' | ', $links) . ($summary ? ' &nbsp; (' . implode(', ', $summary) . ')' : ''));

if (reporter::is_live() && !empty($counts['test_ok'])) {
    echo $OUTPUT->single_button(new moodle_url($baseurl, ['action' => 'sendalltest']),
        "Send the {$counts['test_ok']} test-only record(s) to the live roster");
}

$where = $filter === 'all' ? '' : "WHERE l.status IN ('error', 'retry', 'pending')";
$namefields = get_all_user_name_fields(true, 'u');
$rows = $DB->get_records_sql("SELECT l.*, $namefields, c.shortname
                               FROM {local_ctecreport_log} l
                               JOIN {user} u ON u.id = l.userid
                               JOIN {course} c ON c.id = l.courseid
                               $where
                           ORDER BY l.timecreated DESC", [], 0, 500);

$table = new html_table();
$table->head = ['Completed', 'Student', 'Course', 'CTEC course', 'CTEC ID', 'Status', 'CTEC reply', 'Tries', ''];
foreach ($rows as $r) {
    $form = html_writer::start_tag('form', ['method' => 'post', 'action' => $baseurl->out(false), 'class' => 'form-inline']) .
        html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()]) .
        html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'action', 'value' => 'send']) .
        html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'id', 'value' => $r->id]) .
        html_writer::empty_tag('input', ['type' => 'text', 'name' => 'ctecid', 'size' => 9,
            'placeholder' => 'CTEC ID', 'class' => 'form-control form-control-sm mr-1']) .
        html_writer::empty_tag('input', ['type' => 'submit', 'value' => 'Send', 'class' => 'btn btn-sm btn-secondary']) .
        html_writer::end_tag('form');
    $done = in_array($r->status, ['sent', 'duplicate', 'manual']);
    if (!$done) {
        $form .= html_writer::link(new moodle_url($baseurl, ['action' => 'markreported', 'id' => $r->id, 'sesskey' => sesskey()]),
            'Already reported &ndash; ignore', ['class' => 'btn btn-sm btn-link px-0']);
    }
    $table->data[] = [
        userdate($r->timecompleted, get_string('strftimedatetimeshort')),
        html_writer::link(new moodle_url('/user/view.php', ['id' => $r->userid, 'course' => $r->courseid]), fullname($r)),
        s($r->shortname),
        s($r->coursenumber),
        s($r->ctecidmanual ?: $r->ctecid),
        s($r->status) . ($r->endpoint ? ' (' . s($r->endpoint) . ')' : ''),
        s(shorten_text((string)$r->response, 160)),
        (int)$r->attempts,
        $done ? '' : $form,
    ];
}
echo $rows ? html_writer::table($table) : $OUTPUT->notification('Nothing to show.', 'success');

// Recent completions from before reporting started, for dry runs against CTEC's test address.
$map = reporter::course_map();
if ($map) {
    list($insql, $params) = $DB->get_in_or_equal(array_keys($map), SQL_PARAMS_NAMED);
    $recent = $DB->get_records_sql("SELECT cc.id, cc.userid, cc.course, cc.timecompleted, $namefields, c.shortname
                                      FROM {course_completions} cc
                                      JOIN {user} u ON u.id = cc.userid
                                      JOIN {course} c ON c.id = cc.course
                                     WHERE cc.course $insql AND cc.timecompleted > 0
                                  ORDER BY cc.timecompleted DESC", $params, 0, 15);
    if ($recent) {
        echo $OUTPUT->heading('Dry run with a recent completion', 4);
        echo html_writer::tag('p', 'Sends the record to CTEC\'s test address so you can check what would be reported. Nothing is recorded.');
        $t = new html_table();
        $t->head = ['Completed', 'Student', 'Course', ''];
        foreach ($recent as $cc) {
            $t->data[] = [userdate($cc->timecompleted, get_string('strftimedatetimeshort')), fullname($cc), s($cc->shortname),
                html_writer::link(new moodle_url($baseurl, ['action' => 'preview', 'userid' => $cc->userid,
                    'courseid' => $cc->course, 'sesskey' => sesskey()]), 'Dry run')];
        }
        echo html_writer::table($t);
    }
}

echo $OUTPUT->footer();
