<?php
namespace local_ctecreport\task;

defined('MOODLE_INTERNAL') || die();

use local_ctecreport\reporter;

class send_pending extends \core\task\scheduled_task {

    public function get_name() {
        return get_string('tasksendpending', 'local_ctecreport');
    }

    /** Send anything queued but not yet accepted (new rows and temporary failures). */
    public function execute() {
        global $DB;
        if (!get_config('local_ctecreport', 'enabled')) {
            return;
        }
        $select = "status IN ('pending', 'retry') AND attempts < :max";
        $recs = $DB->get_records_select('local_ctecreport_log', $select, ['max' => reporter::MAX_ATTEMPTS], 'id', '*', 0, 200);
        foreach ($recs as $rec) {
            $rec = reporter::process($rec);
            mtrace("CTEC report {$rec->id}: {$rec->status}");
        }
    }
}
