<?php
defined('MOODLE_INTERNAL') || die();
if ($hassiteconfig) {
    $settings = new admin_settingpage('local_ctctutor', 'TaxPro study assistant');
    $ADMIN->add('localplugins', $settings);
    $usage = '';
    if (function_exists('local_ctctutor_usage_text')) {
        $usage = local_ctctutor_usage_text();
    } else {
        require_once(__DIR__ . '/lib.php');
        $usage = local_ctctutor_usage_text();
    }
    $settings->add(new admin_setting_heading('local_ctctutor/info', 'TaxPro',
        'A chat popup (bottom right) on course pages where students watch videos and read lessons. It is never shown on exam (quiz) pages, '
        . 'and it pauses while the student has an exam attempt open.<br><br>' . $usage
        . '<br><a href="' . (new moodle_url('/local/ctctutor/test.php'))->out() . '">Send a test question to Claude</a>'));
    $settings->add(new admin_setting_configcheckbox('local_ctctutor/enabled', 'Show TaxPro to students', '', 1));
    $settings->add(new admin_setting_configpasswordunmask('local_ctctutor/apikey', 'Anthropic API key (optional)',
        'Leave empty to use the key saved in the Course update tool. A separate key lets you set its own spending limit in the Anthropic Console.', ''));
    $settings->add(new admin_setting_configselect('local_ctctutor/model', 'Claude model',
        'Opus 5.5 gives the best answers. Haiku 5.5 is about 40x cheaper per answer and still good for quick questions.',
        'claude-opus-5-5', ['claude-opus-5-5' => 'Claude Opus 5.5 (best answers)', 'claude-sonnet-5-5' => 'Claude Sonnet 5.5',
        'claude-haiku-5-5' => 'Claude Haiku 5.5 (cheapest)']));
    $settings->add(new admin_setting_configtext('local_ctctutor/dailylimit', 'Questions per student per day', '', 40, PARAM_INT));
}
