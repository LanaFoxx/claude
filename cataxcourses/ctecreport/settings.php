<?php
defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_ctecreport_settings', get_string('pluginname', 'local_ctecreport'));

    $settings->add(new admin_setting_configcheckbox('local_ctecreport/enabled',
        get_string('enabled', 'local_ctecreport'), get_string('enabled_desc', 'local_ctecreport'), 1));
    $settings->add(new admin_setting_configselect('local_ctecreport/mode',
        get_string('mode', 'local_ctecreport'), get_string('mode_desc', 'local_ctecreport'), 'test',
        ['test' => get_string('modetest', 'local_ctecreport'), 'live' => get_string('modelive', 'local_ctecreport')]));
    $settings->add(new admin_setting_configtext('local_ctecreport/username',
        get_string('username', 'local_ctecreport'), get_string('username_desc', 'local_ctecreport'), ''));
    $settings->add(new admin_setting_configpasswordunmask('local_ctecreport/password',
        get_string('password', 'local_ctecreport'), '', ''));
    $settings->add(new admin_setting_configtextarea('local_ctecreport/coursemap',
        get_string('coursemap', 'local_ctecreport'), get_string('coursemap_desc', 'local_ctecreport'),
        "42=6280-QE-00007\n60=6280-QE-00007\n38=6280-CE-00001\n45=6280-CA-00008\n59=6280-CE-00002"));
    $settings->add(new admin_setting_configtext('local_ctecreport/statequiz',
        get_string('statequiz', 'local_ctecreport'), get_string('quiz_desc', 'local_ctecreport'), 'California'));
    $settings->add(new admin_setting_configtext('local_ctecreport/federalquiz',
        get_string('federalquiz', 'local_ctecreport'), get_string('quiz_desc', 'local_ctecreport'), 'Federal'));
    $settings->add(new admin_setting_configtext('local_ctecreport/ethicsquiz',
        get_string('ethicsquiz', 'local_ctecreport'), get_string('quiz_desc', 'local_ctecreport'), 'Ethics'));

    $ADMIN->add('localplugins', $settings);
    $ADMIN->add('reports', new admin_externalpage('local_ctecreport',
        get_string('reportname', 'local_ctecreport'), new moodle_url('/local/ctecreport/index.php')));
}
