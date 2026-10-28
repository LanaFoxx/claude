<?php
defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_stripedispute_settings', get_string('pluginname', 'local_stripedispute'));
    $endpoint = (new moodle_url('/local/stripedispute/webhook.php'))->out(false);
    $settings->add(new admin_setting_configcheckbox('local_stripedispute/enabled',
        get_string('enabled', 'local_stripedispute'), get_string('enabled_desc', 'local_stripedispute'), 1));
    $settings->add(new admin_setting_configpasswordunmask('local_stripedispute/webhooksecret',
        get_string('webhooksecret', 'local_stripedispute'), get_string('webhooksecret_desc', 'local_stripedispute', $endpoint), ''));
    $settings->add(new admin_setting_configpasswordunmask('local_stripedispute/apikey',
        get_string('apikey', 'local_stripedispute'), get_string('apikey_desc', 'local_stripedispute'), ''));
    $ADMIN->add('localplugins', $settings);
    $ADMIN->add('reports', new admin_externalpage('local_stripedispute',
        get_string('reportname', 'local_stripedispute'), new moodle_url('/local/stripedispute/index.php')));
}
