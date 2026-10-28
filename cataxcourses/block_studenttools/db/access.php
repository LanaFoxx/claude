<?php
defined('MOODLE_INTERNAL') || die();

$capabilities = [
    'block/studenttools:myaddinstance' => [
        'captype' => 'write',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes' => ['manager' => CAP_ALLOW],
        'clonepermissionsfrom' => 'moodle/my:manageblocks',
    ],
    'block/studenttools:addinstance' => [
        'riskbitmask' => RISK_SPAM,
        'captype' => 'write',
        'contextlevel' => CONTEXT_BLOCK,
        'archetypes' => ['manager' => CAP_ALLOW],
        'clonepermissionsfrom' => 'moodle/site:manageblocks',
    ],
];
