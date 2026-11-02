<?php
// CTC student menu: Dashboard sections in the left-hand menu, and My courses split into this year / previous years.
defined('MOODLE_INTERNAL') || die();
$plugin->component = 'local_ctcnav';
$plugin->version   = 2026110209;
$plugin->requires  = 2019052000;
$plugin->dependencies = ['block_ctc_student' => 2026110200];
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0';
