<?php
defined('MOODLE_INTERNAL') || die();
$capabilities = [
    'block/ctc_student:myaddinstance' => ['captype' => 'write', 'contextlevel' => CONTEXT_SYSTEM,
        'archetypes' => ['user' => CAP_ALLOW], 'clonepermissionsfrom' => 'moodle/my:manageblocks'],
    'block/ctc_student:addinstance' => ['riskbitmask' => RISK_SPAM | RISK_XSS, 'captype' => 'write', 'contextlevel' => CONTEXT_BLOCK,
        'archetypes' => ['manager' => CAP_ALLOW], 'clonepermissionsfrom' => 'moodle/site:manageblocks'],
];
