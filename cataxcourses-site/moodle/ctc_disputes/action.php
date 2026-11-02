<?php
// Hold / resume / draft / submit a dispute's automatic evidence, or run a Stripe check, from the dashboard block.
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_login();
require_capability('block/ctc_disputes:view', context_system::instance());
require_sesskey();
$act = required_param('act', PARAM_ALPHA);
$return = new moodle_url('/my/');
if ($act === 'sync') {
    $res = block_ctc_disputes_wp_post('disputes/sync', ['by' => fullname($USER)]);
} else {
    $dispute = required_param('dispute', PARAM_ALPHANUMEXT);
    if (!in_array($act, ['hold', 'resume', 'draft', 'submit'], true)) {
        throw new moodle_exception('invalidparameter');
    }
    $res = block_ctc_disputes_wp_post('disputes/' . rawurlencode($dispute) . '/action', ['act' => $act, 'by' => fullname($USER)]);
}
$ok = $res && !empty($res['ok']);
redirect($return, $ok ? 'Done.' : 'The store did not accept this: ' . s($res['message'] ?? 'no response'), null,
    $ok ? \core\output\notification::NOTIFY_SUCCESS : \core\output\notification::NOTIFY_ERROR);
