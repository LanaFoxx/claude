<?php
namespace local_enrolexpiry\task;

defined('MOODLE_INTERNAL') || die();

class apply_rule extends \core\task\scheduled_task {

    public function get_name() {
        return get_string('taskname', 'local_enrolexpiry');
    }

    public function execute() {
        $c = \local_enrolexpiry\manager::run();
        mtrace("One-year rule: {$c['enrolments']} enrolment(s), {$c['overrides']} exam closing date(s) added, {$c['emails']} email(s) sent.");
    }
}
