<?php
namespace block_ctc_courseupdate\task;
defined('MOODLE_INTERNAL') || die();

/** Writes one textbook chapter from its slide text with Claude; the last chapter to finish queues the assembly. */
class textbook_chapter extends \core\task\adhoc_task {
    public function execute() {
        global $CFG;
        require_once($CFG->dirroot . '/blocks/ctc_courseupdate/lib.php');
        $d = (array) $this->get_custom_data();
        block_ctccu_textbook_chapter((int) $d['courseid'], (string) $d['job'], (int) $d['index']);
    }
}
