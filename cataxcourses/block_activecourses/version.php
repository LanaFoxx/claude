<?php
// Dashboard list of active courses, newest year first.

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'block_activecourses';
$plugin->version   = 2026102800;
$plugin->requires  = 2019052000; // Moodle 3.7.
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0';
