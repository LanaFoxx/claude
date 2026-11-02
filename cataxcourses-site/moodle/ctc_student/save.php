<?php
// Save the student's CTEC ID / PTIN from the dashboard. A valid new CTEC ID also re-sends any course
// completion CTEC rejected (usually because the ID was missing or wrong).
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_login();
require_sesskey();
global $DB, $USER;
$uid = $USER->id;
$back = new moodle_url('/my/', [], 'ctc-ids');
if (is_siteadmin() && ($other = optional_param('uid', 0, PARAM_INT))) {
    $uid = $other; // admin previewing a student's dashboard
    $back = new moodle_url('/my/', ['ctcpreview' => $uid], 'ctc-ids');
}
$rawid = optional_param('ctecid', '', PARAM_RAW_TRIMMED);
$rawptin = optional_param('ptin', '', PARAM_RAW_TRIMMED);
list($fid, $oldid) = block_ctc_student_field($uid, 'CTECID');
list($fpt, $oldptin) = block_ctc_student_field($uid, 'ptin');
$id = block_ctc_student_norm_ctecid($rawid);
if ($rawid !== '' && $id === '') {
    redirect($back, 'That CTEC ID doesn\'t look right. It is the letter A followed by 6 digits, for example A123456.', null, \core\output\notification::NOTIFY_ERROR);
}
if ($id !== '' && class_exists('\local_ctecreport\reporter') && method_exists('\local_ctecreport\reporter', 'lookup')) {
    try {
        $look = \local_ctecreport\reporter::lookup($id);
        if (($look['status'] ?? '') === 'notfound') {
            redirect($back, 'CTEC has no record of CTEC ID ' . $id . '. Please check it and try again.', null, \core\output\notification::NOTIFY_ERROR);
        }
    } catch (Throwable $e) {
        // CTEC lookup unavailable: accept the ID.
    }
}
$pt = block_ctc_student_norm_ptin($rawptin);
if ($rawptin !== '' && $pt === '') {
    redirect($back, 'That PTIN doesn\'t look right. It is the letter P followed by 8 digits, for example P12345678.', null, \core\output\notification::NOTIFY_ERROR);
}
$retry = 0;
if ($id !== '' && $fid && $id !== $oldid) {
    block_ctc_student_set_field($uid, $fid, $id);
    if ($DB->get_manager()->table_exists('local_ctecreport_log')) {
        // Completions CTEC rejected are queued again; the reporting plugin's scheduled task sends them.
        $rows = $DB->get_records('local_ctecreport_log', ['userid' => $uid, 'status' => 'error']);
        foreach ($rows as $r) {
            $DB->update_record('local_ctecreport_log', (object) ['id' => $r->id, 'status' => 'retry', 'attempts' => 0, 'timemodified' => time()]);
            $retry++;
        }
    }
}
if ($pt !== '' && $fpt && $pt !== $oldptin) {
    block_ctc_student_set_field($uid, $fpt, $pt);
}
$back->param('ctcmsg', $retry ? 'savedretry' : 'saved');
redirect($back);
