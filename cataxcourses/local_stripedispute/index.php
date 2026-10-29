<?php
// Admin list of Stripe disputes with restore / suspend actions.

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

use local_stripedispute\manager;

admin_externalpage_setup('local_stripedispute');

$action = optional_param('action', '', PARAM_ALPHA);
$id = optional_param('id', 0, PARAM_INT);
$returnurl = optional_param('returnurl', '', PARAM_LOCALURL);
$notice = '';

if ($action === 'import' && confirm_sesskey()) {
    core_php_time_limit::raise(600);
    $n = manager::import_existing();
    $notice = "Imported $n dispute(s) from Stripe. Nobody was suspended.";
}
if ($action && $action !== 'import' && $id && confirm_sesskey()) {
    $rec = $DB->get_record('local_stripedispute', ['id' => $id], '*', MUST_EXIST);
    if ($action === 'restore' && $rec->userid) {
        manager::unsuspend($rec->userid);
        $rec->outcome = 'restored';
        $rec->note = 'Access restored by ' . fullname($USER) . ' on ' . userdate(time(), get_string('strftimedatetimeshort'));
        $notice = 'Access restored.';
    } else if ($action === 'suspend' && $rec->userid && !is_siteadmin($rec->userid)) {
        manager::suspend($DB->get_record('user', ['id' => $rec->userid], '*', MUST_EXIST));
        $rec->outcome = 'suspended';
        $rec->note = 'Suspended by ' . fullname($USER) . ' on ' . userdate(time(), get_string('strftimedatetimeshort'));
        $notice = 'Account suspended.';
    } else if ($action === 'recheck') {
        manager::process($rec);
        $rec = $DB->get_record('local_stripedispute', ['id' => $id]);
        $notice = 'Checked again: ' . $rec->note;
    }
    $rec->timemodified = time();
    $DB->update_record('local_stripedispute', $rec);
    if ($returnurl) {
        redirect(new moodle_url($returnurl), $notice, null, \core\output\notification::NOTIFY_SUCCESS);
    }
}

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('reportname', 'local_stripedispute'));
echo html_writer::tag('p', 'Webhook address for Stripe: ' .
    html_writer::tag('code', (new moodle_url('/local/stripedispute/webhook.php'))->out(false)) . ' &middot; ' .
    html_writer::link(new moodle_url('/admin/settings.php', ['section' => 'local_stripedispute_settings']), 'Settings'));
if ($notice) {
    echo $OUTPUT->notification(s($notice), 'info');
}
echo $OUTPUT->single_button(new moodle_url('/local/stripedispute/index.php', ['action' => 'import']),
    'Import existing disputes from Stripe (nobody is suspended)', 'post');
$labels = ['suspended' => 'Access removed', 'restored' => 'Access restored', 'nomatch' => 'No matching account',
    'multiple' => 'Several accounts match', 'admin' => 'Admin account (skipped)', 'alreadysuspended' => 'Already suspended',
    'dryrun' => 'Not suspended', 'error' => 'Could not read payment', 'pending' => 'Processing'];
$rows = $DB->get_records_sql("SELECT * FROM {local_stripedispute}
                              ORDER BY CASE WHEN status IN ('needs_response', 'under_review', 'warning_needs_response',
                                       'warning_under_review') THEN 0 ELSE 1 END, timecreated DESC", [], 0, 500);
$table = new html_table();
$table->head = ['Opened', 'Buyer', 'Order', 'Amount', 'Reason', 'Stripe status', 'Result', ''];
foreach ($rows as $r) {
    $buyer = s($r->name) . html_writer::empty_tag('br') . s($r->email);
    if ($r->userid) {
        $buyer = html_writer::link(new moodle_url('/user/profile.php', ['id' => $r->userid]), $buyer);
    }
    $act = new moodle_url('/local/stripedispute/index.php', ['id' => $r->id, 'sesskey' => sesskey()]);
    $buttons = [];
    if ($r->userid && in_array($r->outcome, ['suspended', 'alreadysuspended'])) {
        $buttons[] = html_writer::link(new moodle_url($act, ['action' => 'restore']), 'Restore access', ['class' => 'btn btn-sm btn-secondary']);
    }
    if ($r->userid && in_array($r->outcome, ['restored', 'dryrun'])) {
        $buttons[] = html_writer::link(new moodle_url($act, ['action' => 'suspend']), 'Remove access', ['class' => 'btn btn-sm btn-secondary']);
    }
    if (in_array($r->outcome, ['error', 'nomatch', 'multiple'])) {
        $buttons[] = html_writer::link(new moodle_url($act, ['action' => 'recheck']), 'Check again', ['class' => 'btn btn-sm btn-secondary']);
    }
    $table->data[] = [
        userdate($r->timecreated, get_string('strftimedatetimeshort')),
        $buyer,
        s($r->orderid),
        $r->amount !== null ? format_float($r->amount / 100, 2) . ' ' . core_text::strtoupper((string)$r->currency) : '',
        s($r->reason),
        s($r->status),
        html_writer::tag('strong', $labels[$r->outcome] ?? s($r->outcome)) . html_writer::div(s($r->note), 'small text-muted'),
        implode(' ', $buttons),
    ];
}
echo $rows ? html_writer::table($table) : $OUTPUT->notification('No disputes yet.', 'success');
echo $OUTPUT->footer();
