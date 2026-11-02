<?php
namespace block_ctc_courseupdate\task;
defined('MOODLE_INTERNAL') || die();

/** Builds the textbook PDF (title page, clickable contents, chapters) once every chapter is written. */
class textbook_assemble extends \core\task\adhoc_task {
    public function execute() {
        global $CFG;
        require_once($CFG->dirroot . '/blocks/ctc_courseupdate/lib.php');
        $d = (array) $this->get_custom_data();
        block_ctccu_textbook_assemble((int) $d['courseid'], (string) $d['job']);
    }
}
