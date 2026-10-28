<?php
namespace local_ctecreport;

defined('MOODLE_INTERNAL') || die();

class observer {

    /**
     * Queue and send a completion as soon as Moodle marks a course complete.
     * Never throws: a reporting problem must not break course completion.
     */
    public static function course_completed(\core\event\course_completed $event) {
        try {
            if (!get_config('local_ctecreport', 'enabled')) {
                return;
            }
            $completion = $event->get_record_snapshot('course_completions', $event->objectid);
            $timecompleted = !empty($completion->timecompleted) ? $completion->timecompleted : $event->timecreated;
            $rec = reporter::queue($event->relateduserid, $event->courseid, $timecompleted);
            if ($rec) {
                reporter::process($rec);
            }
        } catch (\Throwable $e) {
            debugging('local_ctecreport: ' . $e->getMessage(), DEBUG_DEVELOPER);
        }
    }
}
