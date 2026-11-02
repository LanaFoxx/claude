<?php
// One of the generated evidence PDFs for a dispute, fetched from the store and streamed to the browser.
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_login();
require_capability('block/ctc_disputes:view', context_system::instance());
$dispute = required_param('dispute', PARAM_ALPHANUMEXT);
$doc = required_param('doc', PARAM_ALPHAEXT);
if (!in_array($doc, ['service_documentation', 'receipt', 'refund_policy'], true)) {
    throw new moodle_exception('invalidparameter');
}
$res = block_ctc_disputes_wp('disputes/' . rawurlencode($dispute) . '/pdf/' . $doc);
if (!$res || empty($res['pdf'])) {
    throw new moodle_exception('fetchfailed', 'block_ctc_disputes');
}
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . clean_filename($res['name']) . '"');
echo base64_decode($res['pdf']);
