<?php
defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_enrolexpiry_settings', get_string('pluginname', 'local_enrolexpiry'));
    $settings->add(new admin_setting_configcheckbox('local_enrolexpiry/enabled',
        get_string('enabled', 'local_enrolexpiry'), get_string('enabled_desc', 'local_enrolexpiry'), 1));
    $settings->add(new admin_setting_configtext('local_enrolexpiry/coursematch',
        get_string('coursematch', 'local_enrolexpiry'), get_string('coursematch_desc', 'local_enrolexpiry'), '60 Hour'));
    $settings->add(new admin_setting_configtext('local_enrolexpiry/startdate',
        get_string('startdate', 'local_enrolexpiry'), get_string('startdate_desc', 'local_enrolexpiry'), '2026-10-29'));
    $settings->add(new admin_setting_configtext('local_enrolexpiry/purchaseurl',
        get_string('purchaseurl', 'local_enrolexpiry'), get_string('purchaseurl_desc', 'local_enrolexpiry'), 'https://cataxcourses.com/'));
    $ADMIN->add('localplugins', $settings);
    $ADMIN->add('reports', new admin_externalpage('local_enrolexpiry',
        get_string('pluginname', 'local_enrolexpiry'), new moodle_url('/local/enrolexpiry/index.php')));
}
