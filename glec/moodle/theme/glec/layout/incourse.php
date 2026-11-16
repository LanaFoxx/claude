<?php
// Activity pages: video lessons (and the certificate) get the playlist layout; everything else is standard Boost.
defined('MOODLE_INTERNAL') || die();
$glecplayer = isloggedin() && !isguestuser() && $PAGE->cm && in_array($PAGE->cm->modname, ['videofile', 'simplecertificate', 'certificate', 'page'])
    && strpos($PAGE->pagetype, 'mod-' . $PAGE->cm->modname . '-view') === 0;
if (!$glecplayer) {
    require($CFG->dirroot . '/theme/boost/layout/columns2.php');
    return;
}
$data = \theme_glec\output\course_data::build($PAGE->course, (int) $PAGE->cm->id);
$templatecontext = [
    'output' => $OUTPUT,
    'bodyattributes' => $OUTPUT->body_attributes(['glec-player-page']),
    'c' => $data,
    'title' => format_string($PAGE->cm->name, true, ['context' => $PAGE->context]),
    'isvideo' => $PAGE->cm->modname === 'videofile',
    'playerjs' => (new moodle_url('/theme/glec/js/player.js', ['v' => 2026111600]))->out(false),
];
echo $OUTPUT->render_from_template('theme_glec/player', $templatecontext);
