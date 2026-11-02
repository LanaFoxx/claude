<?php
// Site admin: preview the student dashboard for a student. ?uid= (default: a recent student with a CTEC report).
require_once(__DIR__ . '/../../config.php');
require_once($CFG->dirroot . '/blocks/moodleblock.class.php');
require_once(__DIR__ . '/block_ctc_student.php');
require_login();
if (!is_siteadmin()) { throw new moodle_exception('nopermissions', 'error', '', 'site admin'); }
global $DB, $PAGE, $OUTPUT;
$uid = optional_param('uid', 0, PARAM_INT);
$kind = optional_param('kind', 'sent', PARAM_ALPHA);
if (!$uid) {
    $uid = (int) $DB->get_field_sql("SELECT l.userid FROM {local_ctecreport_log} l WHERE l.status = ? AND (SELECT COUNT(1) FROM {user_enrolments} ue WHERE ue.userid = l.userid) > 2 ORDER BY l.id DESC", [$kind], IGNORE_MULTIPLE);
}
$PAGE->set_context(context_system::instance());
$PAGE->set_url(new moodle_url('/blocks/ctc_student/preview.php', ['uid' => $uid]));
$PAGE->set_pagelayout('mydashboard');
$PAGE->set_title('Student dashboard preview');
echo $OUTPUT->header();
echo block_ctc_student::render($uid);
echo $OUTPUT->footer();
