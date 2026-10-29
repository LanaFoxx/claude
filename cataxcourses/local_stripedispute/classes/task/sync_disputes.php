<?php
namespace local_stripedispute\task;

defined('MOODLE_INTERNAL') || die();

class sync_disputes extends \core\task\scheduled_task {

    public function get_name() {
        return get_string('tasksync', 'local_stripedispute');
    }

    /** Catch any dispute the webhook missed (last 4 months) and apply the suspension rule. */
    public function execute() {
        if (!get_config('local_stripedispute', 'apikey')) {
            return;
        }
        $n = \local_stripedispute\manager::sync_new();
        mtrace("Stripe disputes: $n new dispute(s) processed.");
    }
}
