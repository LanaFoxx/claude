<?php
// For site admins, replace the "My courses" menu with every active course, grouped newest year first.

defined('MOODLE_INTERNAL') || die();

/**
 * Active courses: visible, in a visible non-test category, and not named outdated/expired.
 * Sorted by the latest year in the course name (newest first), then by name.
 *
 * @return array of course records
 */
function local_activecourses_list() {
    global $DB;
    $sql = "SELECT c.id, c.fullname, c.shortname, cat.name AS category
              FROM {course} c
              JOIN {course_categories} cat ON cat.id = c.category
             WHERE c.id <> :siteid AND c.visible = 1 AND cat.visible = 1";
    $courses = [];
    foreach ($DB->get_records_sql($sql, ['siteid' => SITEID]) as $c) {
        if (preg_match('/outdated|expired/i', $c->fullname) || preg_match('/test/i', $c->category)) {
            continue;
        }
        preg_match_all('/\b(20\d\d)\b/', $c->fullname, $m);
        $c->year = $m[1] ? max(array_map('intval', $m[1])) : 0;
        $courses[] = $c;
    }
    usort($courses, function($a, $b) {
        return $a->year != $b->year ? $b->year - $a->year : strcasecmp($a->fullname, $b->fullname);
    });
    return $courses;
}

/**
 * Navigation hook: runs while Moodle builds the menu, before the left-hand menu is drawn.
 */
function local_activecourses_extend_navigation(global_navigation $nav) {
    try {
        if (!isloggedin() || !has_capability('moodle/site:config', context_system::instance())) {
            return;
        }
        $mycourses = $nav->find('mycourses', navigation_node::TYPE_ROOTNODE);
        if (!$mycourses) {
            return;
        }
        // Drop the enrolled-course entries so each course appears once, in our order.
        $enrolled = [];
        foreach ($mycourses->children as $child) {
            if ($child->type == navigation_node::TYPE_COURSE) {
                $enrolled[] = $child;
            }
        }
        foreach ($enrolled as $child) {
            $child->remove();
        }
        foreach (local_activecourses_list() as $c) {
            $name = format_string($c->fullname, true, ['context' => context_course::instance($c->id)]);
            $node = $mycourses->add($name, new moodle_url('/course/view.php', ['id' => $c->id]),
                navigation_node::TYPE_COURSE, $c->shortname, $c->id, new pix_icon('i/course', ''));
            $node->showinflatnavigation = true;
        }
    } catch (\Throwable $e) {
        debugging('local_activecourses: ' . $e->getMessage(), DEBUG_DEVELOPER);
    }
}
