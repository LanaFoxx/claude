<?php
// Create next year's 20/60 Hour course (copy without students, hidden) and open its update page.
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_login();
require_capability('block/ctc_courseupdate:manage', context_system::instance());
require_sesskey();
$type = required_param('type', PARAM_ALPHANUM);
if (!isset(BLOCK_CTCCU_TYPES[$type])) {
    throw new moodle_exception('invalidparameter');
}
$id = block_ctccu_create($type);
redirect(new moodle_url('/blocks/ctc_courseupdate/update.php', ['id' => $id]), 'The new course was created (hidden). Now import the new files.', null, \core\output\notification::NOTIFY_SUCCESS);
