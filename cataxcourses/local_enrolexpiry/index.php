<?php
// Overview of the 60 Hour one-year rule: covered students, deadlines, and the next emails due.

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

use local_enrolexpiry\manager;

admin_externalpage_setup('local_enrolexpiry');

$action = optional_param('action', '', PARAM_ALPHANUM);
$notice = '';
if ($action && confirm_sesskey()) {
    // Send the admin a sample of one email, filled in with a sample course.
    $courses = manager::courses();
    $course = reset($courses);
    if ($course && in_array($action, ['d30', 'd14', 'd3', 'expired'])) {
        list($subject, $text, $html) = manager::message($action, $USER, $course, time() + manager::REMINDERS[$action] * DAYSECS);
        $ok = email_to_user($USER, core_user::get_support_user(), '[Sample] ' . $subject, $text, $html);
        $notice = $ok ? "Sample sent to {$USER->email}." : 'The sample email could not be sent.';
    }
}

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('pluginname', 'local_enrolexpiry'));
if ($notice) {
    echo $OUTPUT->notification(s($notice), 'info');
}
$names = array_map(function($c) {
    return format_string($c->fullname);
}, manager::courses());
echo html_writer::tag('p', 'Applies to enrolments from ' . userdate(manager::start_time(), get_string('strftimedate')) .
    ' in: ' . s(implode(', ', $names)) . '. ' .
    html_writer::link(new moodle_url('/admin/settings.php', ['section' => 'local_enrolexpiry_settings']), 'Settings'));
echo html_writer::tag('p', 'Send yourself a sample: ' . implode(' ', array_map(function($k) {
    $labels = ['d30' => '30-day reminder', 'd14' => '14-day reminder', 'd3' => '3-day reminder', 'expired' => 'Access ended notice'];
    return html_writer::link(new moodle_url('/local/enrolexpiry/index.php', ['action' => $k, 'sesskey' => sesskey()]),
        $labels[$k], ['class' => 'btn btn-sm btn-secondary']);
}, ['d30', 'd14', 'd3', 'expired'])));

$rows = [];
foreach (manager::enrolments() as $e) {
    $user = $DB->get_record('user', ['id' => $e->userid], 'id, email, ' . get_all_user_name_fields(true));
    $deadline = manager::deadline($e);
    $sent = $DB->get_fieldset_select('local_enrolexpiry_sent', 'kind', 'userid = ? AND courseid = ?', [$e->userid, $e->courseid]);
    $rows[] = [
        html_writer::link(new moodle_url('/user/view.php', ['id' => $user->id, 'course' => $e->courseid]), fullname($user)),
        s($names[$e->courseid]),
        userdate($e->timestart ?: $e->timecreated, get_string('strftimedatefullshort')),
        userdate($deadline, get_string('strftimedatefullshort')),
        manager::completed($e->userid, $e->courseid) ? 'Completed' : 'In progress',
        $sent ? s(implode(', ', $sent)) : '-',
    ];
}
if ($rows) {
    $t = new html_table();
    $t->head = ['Student', 'Course', 'Enrolled', 'Exams close', 'Status', 'Emails sent'];
    $t->data = $rows;
    echo html_writer::table($t);
} else {
    echo $OUTPUT->notification('No enrolments are covered yet. New 60 Hour purchases will appear here.', 'info');
}
echo $OUTPUT->footer();
