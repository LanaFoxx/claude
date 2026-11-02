<?php
// Student course activity, by email.
//  - With ?token=… (the store's server): JSON for the WordPress evidence packet. No login.
//  - Logged in with block/ctc_disputes:view: a printable report, or ?format=csv to download it.
define('NO_DEBUG_DISPLAY', true);
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
$email = required_param('email', PARAM_RAW_TRIMMED);
$token = optional_param('token', '', PARAM_RAW_TRIMMED);
$format = optional_param('format', 'html', PARAM_ALPHA);

if ($token !== '') {
    $expected = (string) get_config('block_ctc_disputes', 'token');
    header('Content-Type: application/json; charset=utf-8');
    if ($expected === '' || !hash_equals($expected, $token)) {
        http_response_code(403);
        echo json_encode(['found' => false, 'error' => 'forbidden']);
        die;
    }
    echo json_encode(block_ctc_disputes_activity($email));
    die;
}

require_login();
$context = context_system::instance();
require_capability('block/ctc_disputes:view', $context);
$a = block_ctc_disputes_activity($email, 500);
$d = function ($t) { return $t ? userdate($t, '%b %d, %Y %I:%M %p') : '—'; };

if ($format === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=moodle-activity-' . clean_filename($email) . '.csv');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['time', 'activity', 'ip']);
    foreach ($a['recent'] ?? [] as $l) {
        fputcsv($out, [$d($l['time']), $l['what'], $l['ip']]);
    }
    die;
}

$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/blocks/ctc_disputes/activity.php', ['email' => $email]));
$PAGE->set_pagelayout('print');
$PAGE->set_title('Course activity');
echo $OUTPUT->header();
echo html_writer::div(html_writer::link(new moodle_url('/my/'), '← Dashboard') . ' · ' .
    html_writer::link(new moodle_url('/blocks/ctc_disputes/activity.php', ['email' => $email, 'format' => 'csv']), get_string('csv', 'block_ctc_disputes')) .
    ' · <button class="btn btn-primary btn-sm" onclick="window.print()">Print / Save as PDF</button>', '', ['style' => 'margin:12px 0 18px']);
echo html_writer::tag('style', '@media print{.btn,a[href*="format=csv"]{display:none}}');
echo $OUTPUT->heading('California Tax Courses — course activity (learn.cataxcourses.com)');
if (empty($a['found'])) {
    echo $OUTPUT->notification('No Moodle account with the email ' . s($email) . '.');
    echo $OUTPUT->footer();
    die;
}
$u = $a['user'];
$t = new html_table();
$t->data = [['Student', s($u['name'])], ['Username', s($u['username'])], ['Email', s($email)], ['Account created', $d($u['timecreated'])],
    ['First sign-in', $d($u['firstaccess'])], ['Last sign-in', $d($u['lastaccess'])], ['Last sign-in IP', s($u['lastip'])], ['Recorded actions', (int) $a['logcount']]];
echo html_writer::table($t);
$c = $a['ctec'];
$t = new html_table();
$t->data = [['Hours reported to CTEC', $c['reported'] === true ? 'Yes' . ($c['reported_on'] ? ' (' . s($c['reported_on']) . ')' : '') : ($c['reported'] === false ? 'No' : 'Not recorded in Moodle')],
    ['How we know', s($c['how'])], ['CTEC ID', s($c['ctecid'])], ['PTIN', s($c['ptin'])]];
foreach ($c['fields'] as $f) {
    $t->data[] = [s($f['name']), s($f['value'])];
}
foreach ($c['certificates'] as $ce) {
    $t->data[] = ['Certificate: ' . s($ce['name']), $d($ce['issued']) . ($ce['code'] ? ' · code ' . s($ce['code']) : '')];
}
echo $OUTPUT->heading('CTEC reporting', 3) . html_writer::table($t);
if ($a['courses']) {
    $t = new html_table();
    $t->head = ['Course', 'Enrolled', 'Last opened', 'Completed', 'Grade'];
    foreach ($a['courses'] as $c) {
        $t->data[] = [s($c['name']), $d($c['enrolled']), $d($c['lastaccess']), $d($c['completed']), s($c['grade'])];
    }
    echo $OUTPUT->heading('Courses', 3) . html_writer::table($t);
}
if ($a['quiz']) {
    $t = new html_table();
    $t->head = ['Exam', 'Started', 'Finished', 'State', 'Score'];
    foreach ($a['quiz'] as $q) {
        $t->data[] = [s($q['name']), $d($q['start']), $d($q['finish']), s($q['state']), s($q['score'])];
    }
    echo $OUTPUT->heading('Exam attempts', 3) . html_writer::table($t);
}
$t = new html_table();
$t->head = ['Time', 'Activity', 'IP'];
foreach ($a['recent'] as $l) {
    $t->data[] = [$d($l['time']), s($l['what']), s($l['ip'])];
}
echo $OUTPUT->heading('Activity log', 3) . html_writer::table($t);
echo $OUTPUT->footer();
