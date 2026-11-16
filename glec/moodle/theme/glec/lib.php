<?php
defined('MOODLE_INTERNAL') || die();

function theme_glec_get_main_scss_content($theme) {
    global $CFG;
    $scss = file_get_contents($CFG->dirroot . '/theme/boost/scss/preset/default.scss');
    $scss .= "\n" . file_get_contents($CFG->dirroot . '/theme/glec/scss/post.scss');
    return $scss;
}
function theme_glec_get_pre_scss($theme) {
    global $CFG;
    return file_get_contents($CFG->dirroot . '/theme/glec/scss/pre.scss');
}
function theme_glec_get_extra_scss($theme) { return ''; }

/** Serve fonts and static files (logo) from the theme. */
function theme_glec_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload, array $options = []) {
    send_file_not_found();
}
