<?php
defined('MOODLE_INTERNAL') || die();

/**
 * Students' left-hand menu:
 *  - My courses lists only the student's current courses (older years stay on the Dashboard).
 */
function local_ctcnav_extend_navigation(global_navigation $nav) {
    global $CFG, $USER, $PAGE;
    try {
        require_once($CFG->dirroot . '/blocks/ctc_student/lib.php');
        $uid = $USER->id;
        $preview = optional_param('ctcpreview', 0, PARAM_INT); // site admins: /my/?ctcpreview=<user id>
        if ($preview && is_siteadmin()) {
            $uid = $preview;
        } else if (!function_exists('block_ctc_student_is_student') || !block_ctc_student_is_student()) {
            return;
        }
        $data = block_ctc_student_courses($uid);
        $my = function ($anchor) { return new moodle_url('/my/', null, $anchor); };
        $book = navigation_node::create('Need to purchase a physical book?', new moodle_url('https://cataxcourses.com/book-add-ons/'),
            navigation_node::TYPE_CUSTOM, null, 'ctcnav_book', new pix_icon('i/report', ''));
        $book->showinflatnavigation = true;
        $nav->add_node($book);
        // The book link opens the store in a new tab.
        $PAGE->requires->js_init_code("document.querySelectorAll('[data-key=\"ctcnav_book\"] a, a[data-key=\"ctcnav_book\"]').forEach(function(a){a.target='_blank';a.rel='noopener';});");

        // My courses: only the current courses.
        $mc = $nav->find('mycourses', navigation_node::TYPE_ROOTNODE);
        if (!$mc) {
            return;
        }
        $prev = [];
        foreach ($data['previous'] as $c) {
            $prev[$c->id] = $c;
        }
        foreach ($mc->children as $child) {
            if ($child->type == navigation_node::TYPE_COURSE && isset($prev[$child->key])) {
                $child->remove();
            } else if ($child->type == navigation_node::TYPE_COURSE && $uid == $USER->id) {
                $child->text = block_ctc_student_clean_name($child->text);
            }
        }
        if ($uid != $USER->id) { // admin preview: show the student's courses instead of the admin's
            foreach ($mc->children as $child) {
                if ($child->type == navigation_node::TYPE_COURSE) { $child->remove(); }
            }
            foreach ($data['current'] as $c) {
                $mc->add($c->name, new moodle_url('/course/view.php', ['id' => $c->id]), navigation_node::TYPE_COURSE, null, $c->id, new pix_icon('i/course', ''));
            }
        }
        // Previous year courses are not listed in the menu (they are on the Dashboard under "Previous year courses").
    } catch (Throwable $e) {
        debugging('local_ctcnav: ' . $e->getMessage(), DEBUG_DEVELOPER);
    }
}
