<?php
// Course page: students get the GLEC course overview; staff (or editing mode) get the standard Boost page.
defined('MOODLE_INTERNAL') || die();
$glecstudentview = isloggedin() && !isguestuser() && strpos($PAGE->pagetype, 'course-view') === 0
    && !$PAGE->user_is_editing() && !has_capability('moodle/course:update', $PAGE->context) && $PAGE->course->id != SITEID;
if (!$glecstudentview) {
    require($CFG->dirroot . '/theme/boost/layout/columns2.php');
    return;
}
$data = \theme_glec\output\course_data::build($PAGE->course);
$templatecontext = [
    'output' => $OUTPUT,
    'bodyattributes' => $OUTPUT->body_attributes(['glec-course-page']),
    'c' => $data,
];
echo $OUTPUT->render_from_template('theme_glec/course_page', $templatecontext);
