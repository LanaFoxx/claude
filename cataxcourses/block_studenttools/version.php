<?php
// Admin dashboard tools: find, add and enroll students; download or email certificates.

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'block_studenttools';
$plugin->version   = 2026102907;
$plugin->requires  = 2019052000; // Moodle 3.7.
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0';
