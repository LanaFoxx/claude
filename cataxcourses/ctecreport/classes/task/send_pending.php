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

        // Check IDs typed without the leading A with CTEC ahead of time (50 a run), so they are ready at completion.
        $checked = 0;
        foreach (reporter::course_map() as $courseid => $unused) {
            $like = $DB->sql_like('fi.name', ':pattern', false);
            $values = $DB->get_fieldset_sql("SELECT DISTINCT fv.value
                                               FROM {feedback_value} fv
                                               JOIN {feedback_item} fi ON fi.id = fv.item
                                               JOIN {feedback} f ON f.id = fi.feedback
                                              WHERE f.course = :courseid AND $like",
                ['courseid' => $courseid, 'pattern' => '%CTEC ID%']);
            foreach ($values as $value) {
                $candidate = reporter::add_missing_a($value);
                if ($candidate === '' || reporter::lookup($candidate, false)['status'] !== 'unknown') {
                    continue;
                }
                reporter::lookup($candidate);
                if (++$checked >= 50) {
                    break 2;
                }
            }
        }
        if ($checked) {
            mtrace("Checked $checked CTEC IDs typed without the leading A.");
        }
    }
}
