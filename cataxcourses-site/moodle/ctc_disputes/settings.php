<?php
defined('MOODLE_INTERNAL') || die();
if ($ADMIN->fulltree) {
    $settings->add(new admin_setting_configtext('block_ctc_disputes/wpurl', get_string('wpurl', 'block_ctc_disputes'),
        get_string('wpurl_desc', 'block_ctc_disputes'), 'https://cataxcourses.com/', PARAM_URL));
    $settings->add(new admin_setting_configpasswordunmask('block_ctc_disputes/token', get_string('token', 'block_ctc_disputes'),
        get_string('token_desc', 'block_ctc_disputes'), ''));
}
