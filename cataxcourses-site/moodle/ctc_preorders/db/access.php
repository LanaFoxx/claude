<?php
defined('MOODLE_INTERNAL') || die();
$capabilities = [
    'block/ctc_preorders:myaddinstance' => ['captype' => 'write', 'contextlevel' => CONTEXT_SYSTEM, 'archetypes' => [], 'clonepermissionsfrom' => 'moodle/site:config'],
    'block/ctc_preorders:addinstance' => ['riskbitmask' => RISK_SPAM | RISK_XSS, 'captype' => 'write', 'contextlevel' => CONTEXT_BLOCK, 'archetypes' => []],
];
