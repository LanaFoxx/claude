<?php
defined('MOODLE_INTERNAL') || die();
$capabilities = [
    // No archetypes: only full site administrators (who have every capability) can use it.
    'block/ctc_courseupdate:manage' => ['riskbitmask' => RISK_CONFIG | RISK_DATALOSS, 'captype' => 'write', 'contextlevel' => CONTEXT_SYSTEM, 'archetypes' => []],
    'block/ctc_courseupdate:myaddinstance' => ['captype' => 'write', 'contextlevel' => CONTEXT_SYSTEM, 'archetypes' => [], 'clonepermissionsfrom' => 'moodle/site:config'],
    'block/ctc_courseupdate:addinstance' => ['riskbitmask' => RISK_SPAM | RISK_XSS, 'captype' => 'write', 'contextlevel' => CONTEXT_BLOCK, 'archetypes' => []],
];
